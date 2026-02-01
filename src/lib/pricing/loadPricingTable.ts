import * as XLSX from 'xlsx';
import { PricingTable, PricingRow, PriceRange } from './types';
import { getPricingFile, getPricingTable, setPricingTable } from '@/lib/kv';

// Per-tool cache (key = toolId or '' for legacy)
const cacheByTool = new Map<string, { table: PricingTable; invalidated: boolean }>();
const LEGACY_CACHE_KEY = '';

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
 */
export async function loadPricingTable(toolId?: string): Promise<PricingTable> {
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
      // Try to find move-in/move-out columns
      if ((header.includes('move') || header.includes('basic')) && !header.includes('full') && moveInOutBasicColIdx === -1) {
        moveInOutBasicColIdx = i;
      }
      if ((header.includes('move') || header.includes('full')) && moveInOutFullColIdx === -1 && i > moveInOutBasicColIdx) {
        moveInOutFullColIdx = i;
      }
    }

    // Move-in/move-out columns - check for headers like "Move in/ Move out", "BASIC", "FULL", etc.
    // Also check empty headers with pricing data
    for (let i = 0; i < headerRow.length; i++) {
      const header = String(headerRow[i] || '').trim().toLowerCase();
      
      // Check for move-in/move-out related headers
      if (header.includes('move') || header.includes('basic')) {
        if (moveInOutBasicColIdx === -1 && !header.includes('full')) {
          moveInOutBasicColIdx = i;
        }
      }
      if (header.includes('move') || header.includes('full')) {
        if (moveInOutFullColIdx === -1 && i > moveInOutBasicColIdx) {
          moveInOutFullColIdx = i;
        }
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

      // Skip rows where essential pricing is missing
      const missingPrices: string[] = [];
      if (!weekly) missingPrices.push('Weekly');
      if (!biWeekly) missingPrices.push('Bi-Weekly');
      if (!fourWeek) missingPrices.push('4 Week');
      if (!general) missingPrices.push('General');
      if (!deep) missingPrices.push('Deep');

      if (missingPrices.length > 0) {
        const sampleValues = missingPrices.map(p => {
          let colIdx = -1;
          if (p === 'Weekly') colIdx = weeklyColIdx;
          else if (p === 'Bi-Weekly') colIdx = biWeeklyColIdx;
          else if (p === '4 Week') colIdx = fourWeekColIdx;
          else if (p === 'General') colIdx = generalColIdx;
          else if (p === 'Deep') colIdx = deepColIdx;
          return `${p}: "${String(row[colIdx] || '').trim()}"`;
        }).join(', ');

        skippedRowReasons.push({ 
          row: rowIdx + 1, 
          reason: `Missing or invalid price ranges: ${missingPrices.join(', ')}`,
          sample: sampleValues + `. Expected format: "$100-$200"`
        });
        continue;
      }

      // Use fallback empty ranges for move-in/move-out if not found
      const pricingRow: PricingRow = {
        sqFtRange,
        weekly: weekly || { low: 0, high: 0 },
        biWeekly: biWeekly || { low: 0, high: 0 },
        fourWeek: fourWeek || { low: 0, high: 0 },
        general: general || { low: 0, high: 0 },
        deep: deep || { low: 0, high: 0 },
        moveInOutBasic: moveInOutBasic || { low: 0, high: 0 },
        moveInOutFull: moveInOutFull || { low: 0, high: 0 },
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
 * @param toolId - When provided, clears only this tool's cache; otherwise clears all.
 */
export function invalidatePricingCache(toolId?: string) {
  if (toolId !== undefined) {
    cacheByTool.delete(toolId);
  } else {
    cacheByTool.clear();
  }
}
