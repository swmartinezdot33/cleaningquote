/**
 * Comprehensive verification test for pricing calculations
 * This test verifies that all math and calculations are correct
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  calcQuote, 
  getPeopleMultiplier, 
  getSheddingPetMultiplier, 
  getConditionMultiplier,
  calculateGeneralCleanPrice,
  calculateInitialCleaningPrice
} from '../calcQuote';
import { QuoteInputs } from '../types';

// Mock pricing table with realistic data
const mockPricingTable = {
  rows: [
    {
      sqFtRange: { min: 0, max: 1500 },
      weekly: { low: 135, high: 165 },
      biWeekly: { low: 135, high: 165 },
      fourWeek: { low: 158, high: 193 },
      general: { low: 170, high: 240 },
      deep: { low: 250, high: 350 },
      moveInOutBasic: { low: 200, high: 320 },
      moveInOutFull: { low: 250, high: 420 },
    },
    {
      sqFtRange: { min: 1501, max: 2000 },
      weekly: { low: 144, high: 174 },
      biWeekly: { low: 149, high: 182 },
      fourWeek: { low: 185, high: 226 },
      general: { low: 230, high: 310 },
      deep: { low: 350, high: 420 },
      moveInOutBasic: { low: 250, high: 350 },
      moveInOutFull: { low: 350, high: 560 },
    },
    {
      sqFtRange: { min: 5501, max: 6000 },
      weekly: { low: 430, high: 470 },
      biWeekly: { low: 430, high: 470 },
      fourWeek: { low: 500, high: 550 },
      general: { low: 600, high: 700 },
      deep: { low: 800, high: 950 },
      moveInOutBasic: { low: 700, high: 850 },
      moveInOutFull: { low: 900, high: 1100 },
    },
  ],
  maxSqFt: 6000,
};

// Mock the loadPricingTable function
vi.mock('../loadPricingTable', () => ({
  loadPricingTable: vi.fn(async () => mockPricingTable),
}));

// Mock getInitialCleaningConfig
vi.mock('../calcQuote', async () => {
  const actual = await vi.importActual('../calcQuote');
  return {
    ...actual,
    getInitialCleaningConfig: vi.fn(async () => ({
      multiplier: 1.5,
      requiredConditions: ['poor'],
      recommendedConditions: ['fair'],
      sheddingPetsMultiplier: 1.1,
      peopleMultiplier: 1.05,
      peopleMultiplierBase: 4,
      sheddingPetsMultiplierBase: 0,
    })),
  };
});

describe('Pricing Calculation Verification', () => {
  describe('Multiplier Calculations', () => {
    it('should calculate people multiplier correctly with default 1.05 (base 4)', () => {
      // 0-4 people: 1.0; above 4: 1.0 + (people - 4) * 0.05
      expect(getPeopleMultiplier(0, 1.05)).toBe(1.0);
      expect(getPeopleMultiplier(4, 1.05)).toBe(1.0);
      expect(getPeopleMultiplier(5, 1.05)).toBeCloseTo(1.05, 10);
      expect(getPeopleMultiplier(6, 1.05)).toBeCloseTo(1.1, 10);
      expect(getPeopleMultiplier(8, 1.05)).toBeCloseTo(1.2, 10);
    });

    it('should calculate shedding pets multiplier correctly with default 1.1', () => {
      // Formula: 1.0 + (sheddingPets * (1.1 - 1.0)) = 1.0 + (sheddingPets * 0.1)
      expect(getSheddingPetMultiplier(0, 1.1)).toBe(1.0);
      expect(getSheddingPetMultiplier(1, 1.1)).toBeCloseTo(1.1, 10);
      expect(getSheddingPetMultiplier(2, 1.1)).toBeCloseTo(1.2, 10);
      expect(getSheddingPetMultiplier(3, 1.1)).toBeCloseTo(1.3, 10);
      expect(getSheddingPetMultiplier(5, 1.1)).toBeCloseTo(1.5, 10);
    });

    it('should calculate combined multipliers correctly', () => {
      const peopleMult = getPeopleMultiplier(4, 1.05); // 1.0 (base 4)
      const petsMult = getSheddingPetMultiplier(2, 1.1); // 1.2
      const conditionMult = getConditionMultiplier('clean'); // 1.0
      const combined = peopleMult * petsMult * conditionMult;
      expect(combined).toBeCloseTo(1.2, 10); // 1.0 * 1.2 * 1.0 = 1.2
    });

    it('should apply people multiplier with custom base (e.g. base 5)', () => {
      expect(getPeopleMultiplier(4, 1.05, 5)).toBe(1.0);
      expect(getPeopleMultiplier(5, 1.05, 5)).toBe(1.0);
      expect(getPeopleMultiplier(6, 1.05, 5)).toBeCloseTo(1.05, 10);
      expect(getPeopleMultiplier(7, 1.05, 5)).toBeCloseTo(1.1, 10);
    });

    it('should apply shedding pets multiplier with custom base (e.g. base 2)', () => {
      expect(getSheddingPetMultiplier(0, 1.1, 2)).toBe(1.0);
      expect(getSheddingPetMultiplier(2, 1.1, 2)).toBe(1.0);
      expect(getSheddingPetMultiplier(3, 1.1, 2)).toBeCloseTo(1.1, 10);
      expect(getSheddingPetMultiplier(4, 1.1, 2)).toBeCloseTo(1.2, 10);
    });
  });

  describe('General Clean Calculation', () => {
    it('should calculate General Clean as average of maintenance average and deep clean', () => {
      const weekly = { low: 430, high: 470 };
      const biWeekly = { low: 430, high: 470 };
      const fourWeek = { low: 500, high: 550 };
      const deep = { low: 800, high: 950 };
      
      // Maintenance average = (430 + 430 + 500) / 3 = 453.33... ≈ 453
      const maintenanceAvg = Math.round((weekly.low + biWeekly.low + fourWeek.low) / 3);
      expect(maintenanceAvg).toBe(453);
      
      // General Clean low = (453 + 800) / 2 = 626.5 ≈ 627
      // General Clean high = (453 + 950) / 2 = 701.5 ≈ 702
      const general = calculateGeneralCleanPrice(maintenanceAvg, deep);
      expect(general.low).toBe(627);
      expect(general.high).toBe(702);
    });
  });

  describe('Initial Cleaning Calculation', () => {
    it('should calculate Initial Cleaning as 1.5x General Clean', () => {
      const general = { low: 600, high: 700 };
      const initial = calculateInitialCleaningPrice(general, 1.5);
      
      expect(initial.low).toBe(900); // 600 * 1.5 = 900
      expect(initial.high).toBe(1050); // 700 * 1.5 = 1050
    });
  });

  describe('Full Quote Calculation - 5999 sq ft example', () => {
    it('should correctly calculate quote for 5999 sq ft home', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 5999, // Should match 5501-6000 range
        people: 4,
        pets: 2,
        sheddingPets: 1,
        condition: 'clean',
      };

      const result = await calcQuote(inputs);
      
      expect(result.outOfLimits).toBe(false);
      expect(result.ranges).toBeDefined();
      
      if (!result.ranges) return;
      
      // Base prices from 5501-6000 range
      const baseWeekly = { low: 430, high: 470 };
      const baseBiWeekly = { low: 430, high: 470 };
      const baseDeep = { low: 800, high: 950 };
      
      // Multipliers (4 people = base, no people multiplier)
      const peopleMult = getPeopleMultiplier(4, 1.05); // 1.0
      const petsMult = getSheddingPetMultiplier(1, 1.1); // 1.1
      const conditionMult = getConditionMultiplier('clean'); // 1.0
      const finalMult = peopleMult * petsMult * conditionMult; // 1.1
      
      // Expected weekly: 430 * 1.1 = 473, 470 * 1.1 = 517
      expect(result.ranges.weekly.low).toBe(Math.round(baseWeekly.low * finalMult));
      expect(result.ranges.weekly.high).toBe(Math.round(baseWeekly.high * finalMult));
      
      // Expected bi-weekly: 430 * 1.32 = 567.6 ≈ 568, 470 * 1.32 = 620.4 ≈ 620
      expect(result.ranges.biWeekly.low).toBe(Math.round(baseBiWeekly.low * finalMult));
      expect(result.ranges.biWeekly.high).toBe(Math.round(baseBiWeekly.high * finalMult));
      
      // Expected deep: 800 * 1.32 = 1056, 950 * 1.32 = 1254
      expect(result.ranges.deep.low).toBe(Math.round(baseDeep.low * finalMult));
      expect(result.ranges.deep.high).toBe(Math.round(baseDeep.high * finalMult));
      
      // General comes from table row × multiplier (mock has general 600–700 for this range)
      expect(result.ranges.general.low).toBe(Math.round(600 * finalMult));
      expect(result.ranges.general.high).toBe(Math.round(700 * finalMult));
      
      // Verify Initial Cleaning is 1.5x General Clean
      expect(result.ranges.initial.low).toBe(Math.round(result.ranges.general.low * 1.5));
      expect(result.ranges.initial.high).toBe(Math.round(result.ranges.general.high * 1.5));
      
      // Verify multiplier is correct
      expect(result.multiplier).toBeCloseTo(finalMult, 4);
    });
  });

  describe('Square Footage Range Matching', () => {
    it('should correctly match 5999 to 5501-6000 range', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 5999,
        people: 2, // base 4 → no people multiplier (1.0)
        pets: 0,
        sheddingPets: 0,
        condition: 'clean', // 1.0 multiplier
      };

      const result = await calcQuote(inputs);
      
      expect(result.outOfLimits).toBe(false);
      expect(result.ranges).toBeDefined();
      
      // Base: 430-470, multiplier: 1.0 (2 people ≤ 4)
      if (result.ranges) {
        expect(result.ranges.weekly.low).toBe(430);
        expect(result.ranges.weekly.high).toBe(470);
      }
    });

    it('should correctly match 1500 to Less Than 1500 range', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 2, // base 4 → no people multiplier (1.0)
        pets: 0,
        sheddingPets: 0,
        condition: 'clean', // 1.0 multiplier
      };

      const result = await calcQuote(inputs);
      
      // Base: 135-165, multiplier: 1.0 (2 people ≤ 4)
      if (result.ranges) {
        expect(result.ranges.weekly.low).toBe(135);
        expect(result.ranges.weekly.high).toBe(165);
      }
    });
  });

  describe('Price Rounding', () => {
    it('should round all prices to whole dollars', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 3, // base 4 → 1.0
        pets: 0,
        sheddingPets: 2, // 1.2 multiplier
        condition: 'dusty', // 1.1 applies only to initial cleaning
      };

      const result = await calcQuote(inputs);
      
      if (result.ranges) {
        // Recurring multiplier = 1.0 * 1.2 = 1.2 (no condition). Condition 1.1 only on initial.
        expect(Number.isInteger(result.ranges.weekly.low)).toBe(true);
        expect(Number.isInteger(result.ranges.weekly.high)).toBe(true);
        expect(Number.isInteger(result.ranges.biWeekly.low)).toBe(true);
        expect(Number.isInteger(result.ranges.biWeekly.high)).toBe(true);
        expect(Number.isInteger(result.ranges.deep.low)).toBe(true);
        expect(Number.isInteger(result.ranges.deep.high)).toBe(true);
        expect(Number.isInteger(result.ranges.general.low)).toBe(true);
        expect(Number.isInteger(result.ranges.general.high)).toBe(true);
        expect(Number.isInteger(result.ranges.initial.low)).toBe(true);
        expect(Number.isInteger(result.ranges.initial.high)).toBe(true);
      }
    });
  });
});
