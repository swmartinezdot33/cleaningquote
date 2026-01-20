import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PricingTable, PricingRow, PriceRange } from './types';

// Cache parsed pricing table in memory
let cachedTable: PricingTable | null = null;

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
 * Load and parse the Excel pricing file
 * Caches results in memory after first load
 */
export function loadPricingTable(): PricingTable {
  if (cachedTable) {
    return cachedTable;
  }

  // Try multiple possible paths for Vercel serverless environment
  const possiblePaths = [
    // Vercel production path (file copied during build)
    join(process.cwd(), '.next', 'server', 'data', '2026 Pricing.xlsx'),
    // Development and standard paths
    join(process.cwd(), 'data', '2026 Pricing.xlsx'),
    join(process.cwd(), '..', 'data', '2026 Pricing.xlsx'),
    // Alternative serverless paths
    join(__dirname, '..', '..', '..', 'data', '2026 Pricing.xlsx'),
    join(__dirname, '..', '..', '..', '.next', 'server', 'data', '2026 Pricing.xlsx'),
  ];

  let fileBuffer: Buffer | null = null;
  let lastError: Error | null = null;

  for (const filePath of possiblePaths) {
    try {
      fileBuffer = readFileSync(filePath);
      console.log(`Successfully loaded pricing file from: ${filePath}`);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.log(`Failed to load from ${filePath}:`, lastError.message);
      continue;
    }
  }

  if (!fileBuffer) {
    console.error('All file paths failed. Last error:', lastError);
    throw new Error(
      `Excel file not found. Tried paths: ${possiblePaths.join(', ')}. Error: ${lastError?.message || 'Unknown'}`
    );
  }
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  
  const sheetName = 'Sheet1';
  if (!workbook.SheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
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
    const header = String(headerRow[i] || '').trim();
    if (header.includes('SqFt Range') || header.includes('Range Range')) {
      sqFtColIdx = i;
    } else if (header.includes('Weekly')) {
      weeklyColIdx = i;
    } else if (header.includes('Bi-Weekly')) {
      biWeeklyColIdx = i;
    } else if (header.includes('4 Week')) {
      fourWeekColIdx = i;
    } else if (header.includes('General')) {
      generalColIdx = i;
    } else if (header.includes('Deep')) {
      deepColIdx = i;
    }
  }

  // Move-in/move-out columns are "Unnamed: 7" and "Unnamed: 8" (indices 7 and 8)
  // Try to find them more reliably by checking if header is empty and index is 7 or 8
  // Also check for any columns that might contain move-in/move-out data after the main services
  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').trim().toLowerCase();
    if (header === '' && i >= 6) {
      // Check the first data row to see if it contains pricing data
      if (data.length > 1) {
        const firstDataRow = data[1];
        const cellValue = String(firstDataRow[i] || '').trim();
        if (cellValue && cellValue.includes('$')) {
          if (moveInOutBasicColIdx === -1 && i >= 6) {
            moveInOutBasicColIdx = i;
          } else if (moveInOutFullColIdx === -1 && i > moveInOutBasicColIdx) {
            moveInOutFullColIdx = i;
            break;
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

  // Process data rows (skip row 0)
  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    
    // Skip empty rows
    if (!row || row.length === 0) {
      continue;
    }

    // Parse square footage range
    const sqFtRangeStr = String(row[sqFtColIdx] || '').trim();
    if (!sqFtRangeStr) {
      continue; // Skip rows without square footage
    }

    const sqFtRange = parseSqFtRange(sqFtRangeStr);
    if (!sqFtRange) {
      continue; // Skip invalid ranges
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
    if (!weekly || !biWeekly || !fourWeek || !general || !deep) {
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
    throw new Error('No valid pricing rows found in Excel file');
  }

  cachedTable = { rows, maxSqFt };
  return cachedTable;
}
