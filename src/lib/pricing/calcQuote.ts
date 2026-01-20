import { PricingTable, QuoteInputs, QuoteRanges, QuoteResult } from './types';
import { loadPricingTable } from './loadPricingTable';
import { getKV } from '@/lib/kv';

// Re-export for backward compatibility
export { loadPricingTable } from './loadPricingTable';

/**
 * Default configuration for Initial Cleaning
 * Can be overridden by admin settings in KV
 */
const DEFAULT_INITIAL_CLEANING_CONFIG = {
  multiplier: 1.5, // 50% more than General Clean
  requiredConditions: ['poor'], // Conditions that REQUIRE Initial Cleaning
  recommendedConditions: ['fair'], // Conditions that RECOMMEND Initial Cleaning
};

/**
 * Get Initial Cleaning configuration (from KV or defaults)
 */
export async function getInitialCleaningConfig(): Promise<typeof DEFAULT_INITIAL_CLEANING_CONFIG> {
  try {
    const kv = getKV();
    const config = await kv.get<typeof DEFAULT_INITIAL_CLEANING_CONFIG>('admin:initial-cleaning-config');
    return config || DEFAULT_INITIAL_CLEANING_CONFIG;
  } catch (error) {
    console.warn('Failed to load Initial Cleaning config from KV, using defaults:', error);
    return DEFAULT_INITIAL_CLEANING_CONFIG;
  }
}

/**
 * Calculate Initial Cleaning price as a multiplier of General Clean
 */
export function calculateInitialCleaningPrice(
  generalRange: { low: number; high: number },
  multiplier: number = DEFAULT_INITIAL_CLEANING_CONFIG.multiplier
): { low: number; high: number } {
  return {
    low: Math.round(generalRange.low * multiplier),
    high: Math.round(generalRange.high * multiplier),
  };
}

/**
 * Determine if Initial Cleaning is required based on home condition and cleaning history
 */
export function isInitialCleaningRequired(
  condition?: string,
  cleanedWithin3Months?: boolean,
  config?: typeof DEFAULT_INITIAL_CLEANING_CONFIG
): boolean {
  const finalConfig = config || DEFAULT_INITIAL_CLEANING_CONFIG;
  
  // If cleaned within 3 months, Initial Cleaning not required unless condition is in required list
  if (cleanedWithin3Months && !finalConfig.requiredConditions.includes(condition?.toLowerCase() || '')) {
    return false;
  }
  
  if (!condition) return false;
  return finalConfig.requiredConditions.includes(condition.toLowerCase());
}

/**
 * Determine if Initial Cleaning is recommended based on home condition and cleaning history
 */
export function isInitialCleaningRecommended(
  condition?: string,
  cleanedWithin3Months?: boolean,
  config?: typeof DEFAULT_INITIAL_CLEANING_CONFIG
): boolean {
  const finalConfig = config || DEFAULT_INITIAL_CLEANING_CONFIG;
  
  // If cleaned within 3 months, not recommended
  if (cleanedWithin3Months) {
    return false;
  }
  
  if (!condition) return false;
  return finalConfig.recommendedConditions.includes(condition.toLowerCase());
}

/**
 * Calculate General Clean price as average between maintenance and deep clean
 */
export function calculateGeneralCleanPrice(
  maintenanceAvg: number,
  deepClean: { low: number; high: number }
): { low: number; high: number } {
  const avgDeepLow = Math.round((maintenanceAvg + deepClean.low) / 2);
  const avgDeepHigh = Math.round((maintenanceAvg + deepClean.high) / 2);
  return {
    low: avgDeepLow,
    high: avgDeepHigh,
  };
}

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
 * Note: Now requires async call to load pricing table from Supabase and config from KV
 */
export async function calcQuote(inputs: QuoteInputs): Promise<QuoteResult> {
  const table = await loadPricingTable();
  const config = await getInitialCleaningConfig();

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
  const weeklyRange = applyMultiplier(baseRow.weekly, finalMultiplier);
  const biWeeklyRange = applyMultiplier(baseRow.biWeekly, finalMultiplier);
  const fourWeekRange = applyMultiplier(baseRow.fourWeek, finalMultiplier);
  const deepRange = applyMultiplier(baseRow.deep, finalMultiplier);
  
  // Calculate average maintenance price for General Clean calculation
  const maintenanceAvg = Math.round((weeklyRange.low + biWeeklyRange.low + fourWeekRange.low) / 3);
  
  // Calculate General Clean as between maintenance average and deep clean
  const generalRange = calculateGeneralCleanPrice(maintenanceAvg, deepRange);
  
  // Calculate Initial Cleaning as multiplier of General Clean using config multiplier
  const initialRange = calculateInitialCleaningPrice(generalRange, config.multiplier);

  // Determine if Initial Cleaning is required (consider both condition and cleaning history)
  const initialCleaningRequired = isInitialCleaningRequired(inputs.condition, inputs.cleanedWithin3Months, config);

  const ranges: QuoteRanges = {
    initial: initialRange,
    weekly: weeklyRange,
    biWeekly: biWeeklyRange,
    fourWeek: fourWeekRange,
    general: generalRange,
    deep: deepRange,
    moveInOutBasic: applyMultiplier(baseRow.moveInOutBasic, finalMultiplier),
    moveInOutFull: applyMultiplier(baseRow.moveInOutFull, finalMultiplier),
  };

  return {
    outOfLimits: false,
    multiplier: finalMultiplier,
    inputs,
    ranges,
    initialCleaningRequired,
  };
}
