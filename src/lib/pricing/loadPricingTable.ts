import * as XLSX from 'xlsx';
import { PricingTable, PricingRow, PriceRange } from './types';
import { getPricingFile, getPricingTable, setPricingTable } from '@/lib/kv';
import { getPricingStructureTable } from '@/lib/config/store';

// Per-tool / per-structure cache (key = toolId, '' for legacy, or 'structure:<id>' for a pricing structure)
const cacheByTool = new Map<string, { table: PricingTable; invalidated: boolean }>();
const LEGACY_CACHE_KEY = '';
const STRUCTURE_CACHE_PREFIX = 'structure:';

// Pricing file is stored in Vercel KV (Upstash Redis) under key: 'pricing:file:2026'

/**
 * Parse a price range string like "$135-$165", "$1,000-$1,200", or "$1150 - $1350"
 * Returns {low, high} or null if parsing fails
 */
export function parsePriceRange(priceStr: string): PriceRange | null {
  if (!priceStr || typeof priceStr !== 'string') {
    return null;
  }

  // Remove $, commas, and normalize spaces
  const cleaned = priceStr.replace(/[$,\s]/g, '').trim();
  
  // Match pattern: number-number or number-number (with optional spaces we already removed)
  const match = cleaned.match(/^(\d+)-(\d+)$/);
  
  if (!match) {
    return null;
  }

  const low = parseInt(match[1], 10);
  const high = parseInt(match[2], 10);

  if (isNaN(low) || isNaN(high) || low > high) {
    return null;
  }

  return { low, high };
}

/**
 * Parse square footage range string like "Less Than1500" or "1501-2000"
 * Returns {min, max} or null if parsing fails
 */
function parseSqFtRange(rangeStr: string): { min: number; max: number } | null {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return null;
  }

  const cleaned = rangeStr.trim();

  // Handle "Less Than1500" or "Less Than 1500"
  if (cleaned.toLowerCase().includes('less than')) {
    const match = cleaned.match(/\d+/);
    if (match) {
      const max = parseInt(match[0], 10);
      return { min: 0, max };
    }
  }

  // Handle "1501-2000" format
  const match = cleaned.match(/^(\d+)-(\d+)$/);
  if (match) {
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }

  return null;
}

/**
 * Load and parse the Excel pricing file from Vercel KV (Upstash Redis) storage.
 * Caches results in memory per tool after first load.
 * @param toolId - When provided, loads pricing for this quoting tool (multi-tenant).
 * @param pricingStructureId - When provided, uses this pricing structure's table instead of tool default (service-area-specific pricing).
 */
export async function loadPricingTable(toolId?: string, pricingStructureId?: string): Promise<PricingTable> {
  if (pricingStructureId) {
    const cacheKey = STRUCTURE_CACHE_PREFIX + pricingStructureId;
    const entry = cacheByTool.get(cacheKey);
    if (entry && !entry.invalidated) {
      return entry.table;
    }
    const structuredData = await getPricingStructureTable(pricingStructureId);
    if (structuredData && structuredData.rows && Array.isArray(structuredData.rows) && structuredData.rows.length > 0) {
      const table = structuredData as unknown as PricingTable;
      cacheByTool.set(cacheKey, { table, invalidated: false });
      return table;
    }
    throw new Error(`Pricing structure not found or has no data. Please assign a pricing structure in Tool Settings → Pricing Structure.`);
  }

  const cacheKey = toolId ?? LEGACY_CACHE_KEY;
  const entry = cacheByTool.get(cacheKey);
  if (entry && !entry.invalidated) {
    return entry.table;
  }

  try {
    try {
      const structuredData = await getPricingTable(toolId);

      if (structuredData && structuredData.rows && structuredData.rows.length > 0) {
        cacheByTool.set(cacheKey, { table: structuredData, invalidated: false });
        return structuredData;
      }
    } catch (kvError) {
      if (kvError instanceof Error && kvError.message.includes('KV')) {
        console.warn('KV not configured, skipping pricing lookup');
      } else {
        throw kvError;
      }
    }

    try {
      const buffer = await getPricingFile(toolId);

    // Parse Excel file
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Try to find the sheet - check for common names: Sheet1, or any sheet with "pricing" in the name
    let sheetName = 'Sheet1';
    if (!workbook.SheetNames.includes(sheetName)) {
      // Try to find a sheet with "pricing" in the name (case-insensitive)
      const pricingSheet = workbook.SheetNames.find(name => 
        name.toLowerCase().includes('pricing') || name.toLowerCase().includes('sheet')
      );
      if (pricingSheet) {
        sheetName = pricingSheet;
      } else if (workbook.SheetNames.length > 0) {
        // Use the first sheet if no Sheet1 found
        sheetName = workbook.SheetNames[0];
      } else {
        throw new Error(`No sheets found in Excel file. Expected a sheet named "Sheet1" or a sheet with "Pricing" in the name.`);
      }
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (data.length < 2) {
      throw new Error('Excel file must have at least 2 rows (header + data)');
    }

    // Skip first row (header-like row)
    const rows: PricingRow[] = [];
    let maxSqFt = 0;

    // Find column indices by searching header row (row 0)
    const headerRow = data[0];
    let sqFtColIdx = -1;
    let weeklyColIdx = -1;
    let biWeeklyColIdx = -1;
    let fourWeekColIdx = -1;
    let generalColIdx = -1;
    let deepColIdx = -1;
    let moveInOutBasicColIdx = -1;
    let moveInOutFullColIdx = -1;

    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '').trim().toLowerCase();
      // More flexible matching - handles headers like "Weekly $55 AH" or "Bi-Weekly $55 AH"
      if ((header.includes('sqft') || header.includes('range')) && sqFtColIdx === -1) {
        sqFtColIdx = i;
      }
      if (header.includes('weekly') && !header.includes('bi') && !header.includes('4 week') && weeklyColIdx === -1) {
        weeklyColIdx = i;
      }
      if (((header.includes('bi') && header.includes('weekly')) || header.includes('bi-weekly') || header.includes('biweekly')) && biWeeklyColIdx === -1) {
        biWeeklyColIdx = i;
      }
      if ((header.includes('4 week') || header.includes('four week') || header.includes('monthly')) && fourWeekColIdx === -1) {
        fourWeekColIdx = i;
      }
      if (header.includes('general') && !header.includes('deep') && generalColIdx === -1) {
        generalColIdx = i;
      }
      if (header.includes('deep') && deepColIdx === -1) {
        deepColIdx = i;
      }
      // Move-in/move-out: Basic = column with "basic" (or "move" but NOT "full"/"deep"); Full = "full" or "deep" (so Basic and Deep don't share the same column)
      const isMoveBasic = (header.includes('basic') || (header.includes('move') && !header.includes('full') && !header.includes('deep')));
      const isMoveFull = header.includes('full') || (header.includes('move') && header.includes('deep'));
      if (isMoveBasic && moveInOutBasicColIdx === -1) {
        moveInOutBasicColIdx = i;
      }
      if (isMoveFull && moveInOutFullColIdx === -1) {
        moveInOutFullColIdx = i;
      }
    }

    // Move-in/move-out columns - check for headers like "Move in/ Move out", "BASIC", "FULL", "DEEP", etc.
    // Also check empty headers with pricing data. Use same semantic rules so Basic and Full/Deep are never swapped.
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '').trim().toLowerCase();
      const isMoveBasic = (header.includes('basic') || (header.includes('move') && !header.includes('full') && !header.includes('deep')));
      const isMoveFull = header.includes('full') || (header.includes('move') && header.includes('deep'));
      if (isMoveBasic && moveInOutBasicColIdx === -1) {
        moveInOutBasicColIdx = i;
      }
      if (isMoveFull && moveInOutFullColIdx === -1) {
        moveInOutFullColIdx = i;
      }
      
      // Check empty headers that might contain pricing data
      if (header === '' && i >= 6) {
        if (data.length > 1) {
          const firstDataRow = data[1];
          const cellValue = String(firstDataRow[i] || '').trim();
          if (cellValue && cellValue.includes('$')) {
            if (moveInOutBasicColIdx === -1 && i >= 6) {
              moveInOutBasicColIdx = i;
            } else if (moveInOutFullColIdx === -1 && i > moveInOutBasicColIdx) {
              moveInOutFullColIdx = i;
            }
          }
        }
      }
    }

    // Fallback: if not found by header, use indices 7 and 8 as per spec
    if (moveInOutBasicColIdx === -1) {
      moveInOutBasicColIdx = 7;
    }
    if (moveInOutFullColIdx === -1) {
      moveInOutFullColIdx = 8;
    }

    // Validate that we found all required columns
    const missingColumns: string[] = [];
    if (sqFtColIdx === -1) missingColumns.push('SqFt Range');
    if (weeklyColIdx === -1) missingColumns.push('Weekly');
    if (biWeeklyColIdx === -1) missingColumns.push('Bi-Weekly');
    if (fourWeekColIdx === -1) missingColumns.push('4 Week');
    if (generalColIdx === -1) missingColumns.push('General');
    if (deepColIdx === -1) missingColumns.push('Deep');

    if (missingColumns.length > 0) {
      const foundHeaders = headerRow.map((h, i) => `[${i}]: "${String(h || '').trim()}"`).join(', ');
      throw new Error(
        `Missing required columns: ${missingColumns.join(', ')}. ` +
        `Found headers: ${foundHeaders}. ` +
        `Please ensure your Excel file has a header row with these column names.`
      );
    }

    // Collect diagnostic information about skipped rows
    const skippedRowReasons: { row: number; reason: string; sample?: string }[] = [];

    // Process data rows (skip row 0)
    for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
      const row = data[rowIdx];
      
      // Skip empty rows
      if (!row || row.length === 0) {
        skippedRowReasons.push({ row: rowIdx + 1, reason: 'Empty row' });
        continue;
      }

      // Parse square footage range
      const sqFtRangeStr = String(row[sqFtColIdx] || '').trim();
      if (!sqFtRangeStr) {
        skippedRowReasons.push({ 
          row: rowIdx + 1, 
          reason: 'Missing square footage range',
          sample: `Found: "${sqFtRangeStr}"`
        });
        continue;
      }

      const sqFtRange = parseSqFtRange(sqFtRangeStr);
      if (!sqFtRange) {
        skippedRowReasons.push({ 
          row: rowIdx + 1, 
          reason: `Invalid square footage range format: "${sqFtRangeStr}"`,
          sample: 'Expected format: "0-1500" or "Less Than1500"'
        });
        continue;
      }

      maxSqFt = Math.max(maxSqFt, sqFtRange.max);

      // Parse price ranges
      const weekly = parsePriceRange(String(row[weeklyColIdx] || ''));
      const biWeekly = parsePriceRange(String(row[biWeeklyColIdx] || ''));
      const fourWeek = parsePriceRange(String(row[fourWeekColIdx] || ''));
      const general = parsePriceRange(String(row[generalColIdx] || ''));
      const deep = parsePriceRange(String(row[deepColIdx] || ''));
      const moveInOutBasic = parsePriceRange(String(row[moveInOutBasicColIdx] || ''));
      const moveInOutFull = parsePriceRange(String(row[moveInOutFullColIdx] || ''));

      // Skip rows where any required pricing column is missing or invalid (never use $0-$0)
      const missingPrices: string[] = [];
      if (!weekly) missingPrices.push('Weekly');
      if (!biWeekly) missingPrices.push('Bi-Weekly');
      if (!fourWeek) missingPrices.push('4 Week');
      if (!general) missingPrices.push('General');
      if (!deep) missingPrices.push('Deep');
      if (!moveInOutBasic) missingPrices.push('Move In/Out Basic');
      if (!moveInOutFull) missingPrices.push('Move In/Out Full');

      if (missingPrices.length > 0) {
        const sampleValues = missingPrices.map(p => {
          let colIdx = -1;
          if (p === 'Weekly') colIdx = weeklyColIdx;
          else if (p === 'Bi-Weekly') colIdx = biWeeklyColIdx;
          else if (p === '4 Week') colIdx = fourWeekColIdx;
          else if (p === 'General') colIdx = generalColIdx;
          else if (p === 'Deep') colIdx = deepColIdx;
          else if (p === 'Move In/Out Basic') colIdx = moveInOutBasicColIdx;
          else if (p === 'Move In/Out Full') colIdx = moveInOutFullColIdx;
          return `${p}: "${String(row[colIdx] ?? '').trim()}"`;
        }).join(', ');

        console.warn('[loadPricingTable] Skipping row: missing or invalid price(s)', { row: rowIdx + 1, missing: missingPrices, sample: sampleValues });
        skippedRowReasons.push({
          row: rowIdx + 1,
          reason: `Missing or invalid price ranges: ${missingPrices.join(', ')}`,
          sample: sampleValues + `. Expected format: "$100-$200"`,
        });
        continue;
      }

      const pricingRow: PricingRow = {
        sqFtRange,
        weekly: weekly!,
        biWeekly: biWeekly!,
        fourWeek: fourWeek!,
        general: general!,
        deep: deep!,
        moveInOutBasic: moveInOutBasic!,
        moveInOutFull: moveInOutFull!,
      };

      rows.push(pricingRow);
    }

    if (rows.length === 0) {
      const diagnosticInfo = skippedRowReasons.length > 0
        ? `\n\nDiagnostic information:\n${skippedRowReasons.slice(0, 5).map(s => 
            `  Row ${s.row}: ${s.reason}${s.sample ? ` (${s.sample})` : ''}`
          ).join('\n')}${skippedRowReasons.length > 5 ? `\n  ... and ${skippedRowReasons.length - 5} more rows` : ''}`
        : '';
      
      const headerInfo = `Found headers: ${headerRow.map((h, i) => `[${i}]: "${String(h || '').trim()}"`).join(', ')}`;
      const columnInfo = `Column indices: SqFt=${sqFtColIdx}, Weekly=${weeklyColIdx}, BiWeekly=${biWeeklyColIdx}, FourWeek=${fourWeekColIdx}, General=${generalColIdx}, Deep=${deepColIdx}`;
      
      throw new Error(
        `No valid pricing rows found in Excel file. ` +
        `${headerInfo}. ${columnInfo}.${diagnosticInfo} ` +
        `\n\nPlease ensure:\n` +
        `1. Your file has a header row with: SqFt Range, Weekly, Bi-Weekly, 4 Week, General, Deep\n` +
        `2. Each data row has a valid square footage range (e.g., "0-1500")\n` +
        `3. Each data row has price ranges in format "$100-$200" for all required services`
      );
    }

    const table = { rows, maxSqFt };
    cacheByTool.set(cacheKey, { table, invalidated: false });

    try {
      await setPricingTable(table, toolId);
    } catch (saveError) {
      if (saveError instanceof Error && saveError.message.includes('KV')) {
        console.warn('KV not configured, skipping save');
      } else {
        console.warn('Could not save structured pricing data:', saveError);
      }
    }

    return table;
    } catch (fileError) {
      // If file read fails (KV not configured), throw a helpful error
      if (fileError instanceof Error && fileError.message.includes('KV')) {
        throw new Error('KV storage is not configured. Please configure KV_REST_API_URL and KV_REST_API_TOKEN environment variables, or upload pricing data using the admin interface.');
      }
      throw fileError;
    }
  } catch (error) {
    console.error('Error loading pricing table:', error);
    throw error;
  }
}

/**
 * Clear the cached pricing table (useful after uploading a new file).
 * @param toolId - When provided, clears only this tool's cache; when undefined, clears all (including structure caches).
 */
export function invalidatePricingCache(toolId?: string) {
  if (toolId !== undefined) {
    cacheByTool.delete(toolId);
  } else {
    cacheByTool.clear();
  }
}

/** Clear cache for a specific pricing structure (e.g. after editing that structure). */
export function invalidatePricingCacheForStructure(pricingStructureId: string) {
  cacheByTool.delete(STRUCTURE_CACHE_PREFIX + pricingStructureId);
}

/**
 * Parse an Excel buffer into a PricingTable (no KV or tool ID).
 * Used when uploading Excel for an org-level pricing structure.
 */
export function parseExcelBufferToPricingTable(buffer: Buffer): PricingTable {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  let sheetName = 'Sheet1';
  if (!workbook.SheetNames.includes(sheetName)) {
    const pricingSheet = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes('pricing') || name.toLowerCase().includes('sheet')
    );
    if (pricingSheet) sheetName = pricingSheet;
    else if (workbook.SheetNames.length > 0) sheetName = workbook.SheetNames[0];
    else throw new Error('No sheets found in Excel file.');
  }
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
  if (data.length < 2) throw new Error('Excel file must have at least 2 rows (header + data)');

  const rows: PricingRow[] = [];
  let maxSqFt = 0;
  const headerRow = data[0] as unknown[];
  let sqFtColIdx = -1, weeklyColIdx = -1, biWeeklyColIdx = -1, fourWeekColIdx = -1;
  let generalColIdx = -1, deepColIdx = -1, moveInOutBasicColIdx = -1, moveInOutFullColIdx = -1;

  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').trim().toLowerCase();
    if ((header.includes('sqft') || header.includes('range')) && sqFtColIdx === -1) sqFtColIdx = i;
    if (header.includes('weekly') && !header.includes('bi') && !header.includes('4 week') && weeklyColIdx === -1) weeklyColIdx = i;
    if (((header.includes('bi') && header.includes('weekly')) || header.includes('bi-weekly') || header.includes('biweekly')) && biWeeklyColIdx === -1) biWeeklyColIdx = i;
    if ((header.includes('4 week') || header.includes('four week') || header.includes('monthly')) && fourWeekColIdx === -1) fourWeekColIdx = i;
    if (header.includes('general') && !header.includes('deep') && generalColIdx === -1) generalColIdx = i;
    if (header.includes('deep') && deepColIdx === -1) deepColIdx = i;
    const isMoveBasic = header.includes('basic') || (header.includes('move') && !header.includes('full') && !header.includes('deep'));
    const isMoveFull = header.includes('full') || (header.includes('move') && header.includes('deep'));
    if (isMoveBasic && moveInOutBasicColIdx === -1) moveInOutBasicColIdx = i;
    // Never use the same column for both Basic and Full (e.g. "Move in/out basic and full" would match both)
    if (isMoveFull && moveInOutFullColIdx === -1 && i !== moveInOutBasicColIdx) moveInOutFullColIdx = i;
  }
  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').trim().toLowerCase();
    const isMoveBasic = header.includes('basic') || (header.includes('move') && !header.includes('full') && !header.includes('deep'));
    const isMoveFull = header.includes('full') || (header.includes('move') && header.includes('deep'));
    if (isMoveBasic && moveInOutBasicColIdx === -1) moveInOutBasicColIdx = i;
    if (isMoveFull && moveInOutFullColIdx === -1 && i !== moveInOutBasicColIdx) moveInOutFullColIdx = i;
    if (header === '' && i >= 6 && data.length > 1) {
      const firstDataRow = data[1] as unknown[];
      const cellValue = String(firstDataRow[i] || '').trim();
      if (cellValue?.includes('$')) {
        if (moveInOutBasicColIdx === -1 && i >= 6) moveInOutBasicColIdx = i;
        else if (moveInOutFullColIdx === -1 && i > moveInOutBasicColIdx) moveInOutFullColIdx = i;
      }
    }
  }
  if (moveInOutBasicColIdx === -1) moveInOutBasicColIdx = 7;
  if (moveInOutFullColIdx === -1) moveInOutFullColIdx = 8;

  const missingColumns: string[] = [];
  if (sqFtColIdx === -1) missingColumns.push('SqFt Range');
  if (weeklyColIdx === -1) missingColumns.push('Weekly');
  if (biWeeklyColIdx === -1) missingColumns.push('Bi-Weekly');
  if (fourWeekColIdx === -1) missingColumns.push('4 Week');
  if (generalColIdx === -1) missingColumns.push('General');
  if (deepColIdx === -1) missingColumns.push('Deep');
  if (missingColumns.length > 0) {
    const foundHeaders = headerRow.map((h, i) => `[${i}]: "${String(h || '').trim()}"`).join(', ');
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}. Found headers: ${foundHeaders}`);
  }

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx] as unknown[];
    if (!row || row.length === 0) continue;
    const sqFtRangeStr = String(row[sqFtColIdx] || '').trim();
    if (!sqFtRangeStr) continue;
    const sqFtRange = parseSqFtRange(sqFtRangeStr);
    if (!sqFtRange) continue;
    maxSqFt = Math.max(maxSqFt, sqFtRange.max);
    const weekly = parsePriceRange(String(row[weeklyColIdx] || ''));
    const biWeekly = parsePriceRange(String(row[biWeeklyColIdx] || ''));
    const fourWeek = parsePriceRange(String(row[fourWeekColIdx] || ''));
    const general = parsePriceRange(String(row[generalColIdx] || ''));
    const deep = parsePriceRange(String(row[deepColIdx] || ''));
    const moveInOutBasic = parsePriceRange(String(row[moveInOutBasicColIdx] || ''));
    const moveInOutFull = parsePriceRange(String(row[moveInOutFullColIdx] || ''));
    if (!weekly || !biWeekly || !fourWeek || !general || !deep || !moveInOutBasic || !moveInOutFull) {
      console.warn('[loadPricingTable] Skipping row: missing or invalid price(s)', {
        row: rowIdx + 1,
        missing: [
          !weekly && 'Weekly',
          !biWeekly && 'Bi-Weekly',
          !fourWeek && '4 Week',
          !general && 'General',
          !deep && 'Deep',
          !moveInOutBasic && 'Move In/Out Basic',
          !moveInOutFull && 'Move In/Out Full',
        ].filter(Boolean),
      });
      continue;
    }
    rows.push({
      sqFtRange,
      weekly,
      biWeekly,
      fourWeek,
      general,
      deep,
      moveInOutBasic,
      moveInOutFull,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      'No valid pricing rows found in Excel file. Ensure header row has: SqFt Range, Weekly, Bi-Weekly, 4 Week, General, Deep and data rows have valid ranges and "$low-$high" prices.'
    );
  }
  return { rows, maxSqFt };
}

/** Tier option for square footage dropdown; derived from pricing table so options match the chart. */
export interface PricingTierOption {
  min: number;
  max: number;
  value: string;
  label: string;
}

/**
 * Build square footage tier options from a pricing table.
 * Use these options in the survey/quote flow so selection always matches a pricing row.
 */
export function getPricingTiers(table: PricingTable): { tiers: PricingTierOption[]; maxSqFt: number } {
  const tiers: PricingTierOption[] = table.rows.map((row) => {
    const { min, max } = row.sqFtRange;
    const value = min === 0 ? `0-${max}` : `${min}-${max}`;
    const label =
      min === 0
        ? `Less than ${max.toLocaleString()} sq ft`
        : `${min.toLocaleString()} - ${max.toLocaleString()} sq ft`;
    return { min, max, value, label };
  });
  return { tiers, maxSqFt: table.maxSqFt };
}
