import { PricingTable, QuoteInputs, QuoteRanges, QuoteResult } from './types';
import { loadPricingTable } from './loadPricingTable';

/**
 * Get people multiplier based on count
 */
export function getPeopleMultiplier(people: number): number {
  if (people >= 0 && people <= 5) {
    return 1.0;
  } else if (people >= 6 && people <= 7) {
    return 1.1;
  } else if (people >= 8) {
    return 1.15;
  }
  // Fallback (shouldn't happen with validation)
  return 1.0;
}

/**
 * Get shedding pet multiplier based on count
 */
export function getSheddingPetMultiplier(sheddingPets: number): number {
  if (sheddingPets === 0) {
    return 1.0;
  } else if (sheddingPets === 1) {
    return 1.1;
  } else if (sheddingPets === 2) {
    return 1.15;
  } else if (sheddingPets === 3) {
    return 1.2;
  } else if (sheddingPets === 4) {
    return 1.35;
  } else if (sheddingPets === 5) {
    return 1.5;
  } else if (sheddingPets >= 6) {
    return 1.75;
  }
  // Fallback (shouldn't happen)
  return 1.0;
}

/**
 * Find the pricing row that matches the given square footage
 */
function findPricingRow(table: PricingTable, squareFeet: number): number {
  for (let i = 0; i < table.rows.length; i++) {
    const row = table.rows[i];
    if (squareFeet >= row.sqFtRange.min && squareFeet <= row.sqFtRange.max) {
      return i;
    }
  }
  return -1;
}

/**
 * Apply multiplier to a price range and round to whole dollars
 */
function applyMultiplier(range: { low: number; high: number }, multiplier: number): { low: number; high: number } {
  return {
    low: Math.round(range.low * multiplier),
    high: Math.round(range.high * multiplier),
  };
}

/**
 * Calculate quote based on inputs
 * Pure function - no I/O operations
 */
export function calcQuote(inputs: QuoteInputs): QuoteResult {
  const table = loadPricingTable();

  // Check if square footage exceeds limits
  if (inputs.squareFeet > table.maxSqFt) {
    return {
      outOfLimits: true,
      message: 'This home falls outside our standard data limits for square footage. Please see management for custom pricing.',
    };
  }

  // Find matching pricing row
  const rowIdx = findPricingRow(table, inputs.squareFeet);
  if (rowIdx === -1) {
    return {
      outOfLimits: true,
      message: 'This home falls outside our standard data limits for square footage. Please see management for custom pricing.',
    };
  }

  const baseRow = table.rows[rowIdx];

  // Calculate multipliers
  const peopleMultiplier = getPeopleMultiplier(inputs.people);
  const sheddingPetMultiplier = getSheddingPetMultiplier(inputs.sheddingPets);
  const finalMultiplier = peopleMultiplier * sheddingPetMultiplier;

  // Apply multipliers to all price ranges
  const ranges: QuoteRanges = {
    weekly: applyMultiplier(baseRow.weekly, finalMultiplier),
    biWeekly: applyMultiplier(baseRow.biWeekly, finalMultiplier),
    fourWeek: applyMultiplier(baseRow.fourWeek, finalMultiplier),
    general: applyMultiplier(baseRow.general, finalMultiplier),
    deep: applyMultiplier(baseRow.deep, finalMultiplier),
    moveInOutBasic: applyMultiplier(baseRow.moveInOutBasic, finalMultiplier),
    moveInOutFull: applyMultiplier(baseRow.moveInOutFull, finalMultiplier),
  };

  return {
    outOfLimits: false,
    multiplier: finalMultiplier,
    inputs,
    ranges,
  };
}
