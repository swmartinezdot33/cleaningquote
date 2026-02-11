import { PricingTable, QuoteInputs, QuoteRanges, QuoteResult } from './types';
import { loadPricingTable } from './loadPricingTable';
import { getInitialCleaningConfig as getInitialCleaningConfigFromStore } from '@/lib/kv';
import { getInitialCleaningConfigForStructure as getStructureConfig } from '@/lib/config/store';

// Re-export for backward compatibility
export { loadPricingTable } from './loadPricingTable';

/**
 * Default configuration for Initial Cleaning
 * Can be overridden by admin settings (Supabase or KV).
 */
export interface InitialCleaningConfig {
  multiplier: number;
  requiredConditions: string[];
  recommendedConditions: string[];
  sheddingPetsMultiplier?: number;
  peopleMultiplier?: number;
  /** Number of people included at base rate; multiplier applies only for people above this. Default 4. */
  peopleMultiplierBase?: number;
  /** Number of shedding pets included at base rate; multiplier applies only for pets above this. Default 0. */
  sheddingPetsMultiplierBase?: number;
}

const DEFAULT_INITIAL_CLEANING_CONFIG: InitialCleaningConfig = {
  multiplier: 1.5, // 50% more than General Clean
  requiredConditions: ['poor'], // Conditions that REQUIRE Initial Cleaning
  recommendedConditions: ['fair'], // Conditions that RECOMMEND Initial Cleaning
  sheddingPetsMultiplier: 1.1, // Per shedding pet multiplier (10% per pet)
  peopleMultiplier: 1.05, // Per person multiplier (5% per person)
  peopleMultiplierBase: 4, // No multiplier for 4 or fewer people
  sheddingPetsMultiplierBase: 0, // Multiplier applies from first shedding pet
};

/**
 * Get Initial Cleaning configuration (from Supabase/KV or defaults).
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getInitialCleaningConfig(toolId?: string): Promise<InitialCleaningConfig> {
  try {
    const config = await getInitialCleaningConfigFromStore(toolId);
    return {
      ...DEFAULT_INITIAL_CLEANING_CONFIG,
      ...(config || {}),
      sheddingPetsMultiplier: config?.sheddingPetsMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplier,
      peopleMultiplier: config?.peopleMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplier,
      peopleMultiplierBase: config?.peopleMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplierBase,
      sheddingPetsMultiplierBase: config?.sheddingPetsMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplierBase,
    };
  } catch (error) {
    console.warn('Failed to load Initial Cleaning config, using defaults:', error);
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
 * Get people multiplier based on count, per-person multiplier, and configurable base.
 * 0 to base people use regular pricing (1.0). Above base, each extra person adds (perPersonMultiplier - 1.0).
 * Formula: people <= base ? 1.0 : 1.0 + ((people - base) * (perPersonMultiplier - 1.0))
 * Example: base 4, perPerson 1.05 → 4 people: 1.0, 5: 1.05, 6: 1.10. Base 5 → 5 people: 1.0, 6: 1.05.
 */
export function getPeopleMultiplier(
  people: number,
  perPersonMultiplier: number = 1.05,
  base: number = 4
): number {
  if (people <= base) {
    return 1.0;
  }
  const extraPeople = people - base;
  const perPersonIncrease = perPersonMultiplier - 1.0;
  return 1.0 + extraPeople * perPersonIncrease;
}

/**
 * Get shedding pet multiplier based on count, per-pet multiplier, and configurable base.
 * 0 to base shedding pets use 1.0. Above base, each extra pet adds (perPetMultiplier - 1.0).
 * Formula: sheddingPets <= base ? 1.0 : 1.0 + ((sheddingPets - base) * (perPetMultiplier - 1.0))
 * Example: base 0, perPet 1.1, 3 pets → 1.3. Base 2 → 0–2 pets: 1.0, 3 pets: 1.1, 4: 1.2.
 */
export function getSheddingPetMultiplier(
  sheddingPets: number,
  perPetMultiplier: number = 1.1,
  base: number = 0
): number {
  if (sheddingPets <= base) {
    return 1.0;
  }
  const extraPets = sheddingPets - base;
  const perPetIncrease = perPetMultiplier - 1.0;
  return 1.0 + extraPets * perPetIncrease;
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
  const trimmed = typeof condition === 'string' ? condition.trim() : '';
  if (!trimmed) {
    return 1.0; // Default if no condition specified
  }

  const conditionLower = trimmed.toLowerCase();

  // Perfectionist condition
  if (
    conditionLower.includes('perfectionist') ||
    conditionLower.includes('immaculate')
  ) {
    return 1.0;
  }

  // Clean condition
  if (conditionLower === 'clean' || conditionLower === 'good' || conditionLower === 'excellent') {
    return 1.0;
  }

  // Above Extremely Dusty - OUT OF SCOPE (check before "dusty" / "extremely dusty")
  if (conditionLower.includes('above extremely') || conditionLower.includes('out of scope')) {
    return 20.0;
  }

  // Very poor / extremely dusty (check before generic "dusty" and "poor")
  if (
    conditionLower.includes('very poor') ||
    conditionLower === 'very-poor' ||
    conditionLower === 'very_poor' ||
    conditionLower.includes('extremely dusty')
  ) {
    return 1.4;
  }

  // Poor condition – match exact "poor" or label text like "poor - needs deep cleaning"
  if (conditionLower === 'poor' || conditionLower.startsWith('poor')) {
    return 1.4;
  }

  // Dusty/Dirty condition (after "extremely dusty" so it doesn't match)
  if (
    conditionLower.includes('dusty') ||
    conditionLower.includes('dirty') ||
    conditionLower === 'average' ||
    conditionLower === 'fair'
  ) {
    return 1.1;
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
 * Resolve initial cleaning config for a quote: when using a pricing structure, use structure's config if set, else tool config.
 */
async function getInitialCleaningConfigForQuote(toolId?: string, pricingStructureId?: string): Promise<InitialCleaningConfig> {
  if (pricingStructureId) {
    try {
      const structureConfig = await getStructureConfig(pricingStructureId);
      if (structureConfig && typeof structureConfig === 'object') {
        return {
          ...DEFAULT_INITIAL_CLEANING_CONFIG,
          ...structureConfig,
          sheddingPetsMultiplier: structureConfig.sheddingPetsMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplier,
          peopleMultiplier: structureConfig.peopleMultiplier ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplier,
          peopleMultiplierBase: structureConfig.peopleMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplierBase,
          sheddingPetsMultiplierBase: structureConfig.sheddingPetsMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplierBase,
        };
      }
    } catch {
      // fall through to tool config
    }
  }
  return getInitialCleaningConfig(toolId);
}

/**
 * Calculate quote based on inputs.
 *
 * Formula (fact-checked; see __tests__/calcQuote.test.ts and calcQuote.verification.test.ts):
 * 1. Find pricing row by square footage (inclusive min/max).
 * 2. Recurring (weekly, bi-weekly, 4-week, general, deep, move-in/out): base range × (people mult × pet mult). People mult: 1.0 up to base (default 4), then 1.0 + (people - base) × (perPerson - 1). Pet mult: same with sheddingPets and base (default 0). Round to whole dollars.
 * 3. Initial cleaning: (general range × people×pet mult) × initial mult (default 1.5) × condition mult (1.0 clean, 1.1 dusty/fair, 1.4 poor/very poor, 20 out of scope). Condition applies only to initial.
 * 4. Config (people/pet/initial mult, bases) comes from pricing structure if set, else tool config.
 *
 * @param toolId - When provided, uses this quoting tool's pricing and config (multi-tenant).
 * @param pricingStructureId - When provided (e.g. from service area match), uses this pricing structure instead of tool default.
 */
export async function calcQuote(inputs: QuoteInputs, toolId?: string, pricingStructureId?: string): Promise<QuoteResult> {
  const table = await loadPricingTable(toolId, pricingStructureId);
  const config = await getInitialCleaningConfigForQuote(toolId, pricingStructureId);

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
  const peopleBase = config.peopleMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.peopleMultiplierBase ?? 4;
  const sheddingPetsBase = config.sheddingPetsMultiplierBase ?? DEFAULT_INITIAL_CLEANING_CONFIG.sheddingPetsMultiplierBase ?? 0;
  const peopleMultiplier = getPeopleMultiplier(inputs.people, config.peopleMultiplier, peopleBase);
  const sheddingPetMultiplier = getSheddingPetMultiplier(inputs.sheddingPets, config.sheddingPetsMultiplier, sheddingPetsBase);
  const conditionMultiplier = getConditionMultiplier(inputs.condition);

  // Check if condition is out of scope (multiplier >= 20)
  if (conditionMultiplier >= 20) {
    return {
      outOfLimits: true,
      message: 'This home condition is outside our standard scope. Homes with excessive uncleanliness, pest activity, unsanitary conditions, or major issues require specialized cleaning services. Please contact management for a custom quote.',
    };
  }

  // Recurring/ongoing rates: people + pets only (no condition). Condition applies only to first/initial cleaning.
  const recurringMultiplier = peopleMultiplier * sheddingPetMultiplier;

  // Apply recurring multiplier to all service types except initial
  const weeklyRange = applyMultiplier(baseRow.weekly, recurringMultiplier);
  const biWeeklyRange = applyMultiplier(baseRow.biWeekly, recurringMultiplier);
  const fourWeekRange = applyMultiplier(baseRow.fourWeek, recurringMultiplier);
  const deepRange = applyMultiplier(baseRow.deep, recurringMultiplier);
  const generalRange = applyMultiplier(baseRow.general, recurringMultiplier);
  const moveInOutBasicRange = applyMultiplier(baseRow.moveInOutBasic, recurringMultiplier);
  const moveInOutFullRange = applyMultiplier(baseRow.moveInOutFull, recurringMultiplier);

  // Initial cleaning: base (general × config multiplier) then apply condition multiplier (first-time only)
  const initialBaseRange = calculateInitialCleaningPrice(generalRange, config.multiplier);
  const initialRange = applyMultiplier(initialBaseRange, conditionMultiplier);

  // Determine if Initial Cleaning is required (consider both condition and cleaning history)
  const initialCleaningRequired = isInitialCleaningRequired(inputs.condition, inputs.cleanedWithin3Months, config);
  
  // Determine if Initial Cleaning is recommended
  const initialCleaningRecommended = isInitialCleaningRecommended(inputs.condition, inputs.cleanedWithin3Months, config);

  const ranges: QuoteRanges = {
    initial: initialRange,
    weekly: weeklyRange,
    biWeekly: biWeeklyRange,
    fourWeek: fourWeekRange,
    general: generalRange,
    deep: deepRange,
    moveInOutBasic: moveInOutBasicRange,
    moveInOutFull: moveInOutFullRange,
  };

  return {
    outOfLimits: false,
    multiplier: recurringMultiplier,
    inputs,
    ranges,
    initialCleaningRequired,
    initialCleaningRecommended,
  };
}
