import { PricingTable, QuoteInputs, QuoteRanges, QuoteResult } from './types';
import { loadPricingTable } from './loadPricingTable';
import { getKV } from '@/lib/kv';

// Re-export for backward compatibility
export { loadPricingTable } from './loadPricingTable';

/**
 * Default configuration for Initial Cleaning
 * Can be overridden by admin settings in KV
 */
interface InitialCleaningConfig {
  multiplier: number;
  requiredConditions: string[];
  recommendedConditions: string[];
  sheddingPetsMultiplier?: number;
  peopleMultiplier?: number;
}

const DEFAULT_INITIAL_CLEANING_CONFIG: InitialCleaningConfig = {
  multiplier: 1.5, // 50% more than General Clean
  requiredConditions: ['poor'], // Conditions that REQUIRE Initial Cleaning
  recommendedConditions: ['fair'], // Conditions that RECOMMEND Initial Cleaning
  sheddingPetsMultiplier: 1.1, // Per shedding pet multiplier (10% per pet)
  peopleMultiplier: 1.05, // Per person multiplier (5% per person)
};

/**
 * Get Initial Cleaning configuration (from KV or defaults)
 */
export async function getInitialCleaningConfig(): Promise<InitialCleaningConfig> {
  try {
    const kv = getKV();
    const config = await kv.get<InitialCleaningConfig>('admin:initial-cleaning-config');
    return {
      ...DEFAULT_INITIAL_CLEANING_CONFIG,
      ...(config || {}),
      sheddingPetsMultiplier: config?.sheddingPetsMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplier,
      peopleMultiplier: config?.peopleMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplier,
    };
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
 * Get people multiplier based on count and per-person multiplier
 * Formula: 1.0 + (peopleCount * (perPersonMultiplier - 1.0))
 * Example: If perPersonMultiplier is 1.05 and there are 4 people:
 *   1.0 + (4 * (1.05 - 1.0)) = 1.0 + (4 * 0.05) = 1.2 (20% increase)
 */
export function getPeopleMultiplier(people: number, perPersonMultiplier: number = 1.05): number {
  if (people <= 0) {
    return 1.0;
  }
  // Each person adds (perPersonMultiplier - 1.0) to the base multiplier
  const base = 1.0;
  const perPersonIncrease = perPersonMultiplier - 1.0;
  return base + (people * perPersonIncrease);
}

/**
 * Get shedding pet multiplier based on count and per-pet multiplier
 * Formula: 1.0 + (sheddingPetsCount * (perPetMultiplier - 1.0))
 * Example: If perPetMultiplier is 1.1 and there are 3 shedding pets:
 *   1.0 + (3 * (1.1 - 1.0)) = 1.0 + (3 * 0.1) = 1.3 (30% increase)
 */
export function getSheddingPetMultiplier(sheddingPets: number, perPetMultiplier: number = 1.1): number {
  if (sheddingPets <= 0) {
    return 1.0;
  }
  // Each shedding pet adds (perPetMultiplier - 1.0) to the base multiplier
  const base = 1.0;
  const perPetIncrease = perPetMultiplier - 1.0;
  return base + (sheddingPets * perPetIncrease);
}

/**
 * Get home condition multiplier based on condition level
 * Perfectionist = 1.0x (minimal cleaning needed)
 * Clean = 1.0x (good baseline)
 * Dusty/Dirty = 1.1x (moderate extra work)
 * Extremely Dusty/Dirty = 1.4x (significant extra work)
 * Above Extremely Dusty = 20x (out of scope - special pricing)
 */
export function getConditionMultiplier(condition?: string): number {
  if (!condition) {
    return 1.0; // Default if no condition specified
  }

  const conditionLower = condition.toLowerCase();

  // Perfectionist condition
  if (
    conditionLower.includes('perfectionist') ||
    conditionLower.includes('immaculate')
  ) {
    return 1.0;
  }

  // Clean condition
  if (conditionLower === 'clean' || conditionLower === 'good') {
    return 1.0;
  }

  // Dusty/Dirty condition
  if (
    conditionLower.includes('dusty') ||
    conditionLower === 'average' ||
    conditionLower === 'fair'
  ) {
    return 1.1;
  }

  // Extremely Dusty/Dirty condition
  if (conditionLower.includes('extremely dusty') || conditionLower === 'poor') {
    return 1.4;
  }

  // Above Extremely Dusty - OUT OF SCOPE
  if (conditionLower.includes('above extremely') || conditionLower.includes('out of scope')) {
    return 20.0;
  }

  // Default
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

  // Calculate multipliers using configurable values
  const peopleMultiplier = getPeopleMultiplier(inputs.people, config.peopleMultiplier);
  const sheddingPetMultiplier = getSheddingPetMultiplier(inputs.sheddingPets, config.sheddingPetsMultiplier);
  const conditionMultiplier = getConditionMultiplier(inputs.condition);

  // Check if condition is out of scope (multiplier >= 20)
  if (conditionMultiplier >= 20) {
    return {
      outOfLimits: true,
      message: 'This home condition is outside our standard scope. Homes with excessive uncleanliness, pest activity, unsanitary conditions, or major issues require specialized cleaning services. Please contact management for a custom quote.',
    };
  }

  const finalMultiplier = peopleMultiplier * sheddingPetMultiplier * conditionMultiplier;

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
