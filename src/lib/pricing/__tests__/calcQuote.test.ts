import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calcQuote, getPeopleMultiplier, getSheddingPetMultiplier, getConditionMultiplier } from '../calcQuote';
import { QuoteInputs } from '../types';

// Mock the loadPricingTable function
vi.mock('../loadPricingTable', () => ({
  loadPricingTable: vi.fn(async () => ({
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
    ],
    maxSqFt: 2000,
  })),
}));

describe('getPeopleMultiplier', () => {
  it('should return 1.0 for 0-5 people', () => {
    expect(getPeopleMultiplier(0)).toBe(1.0);
    expect(getPeopleMultiplier(3)).toBe(1.0);
    expect(getPeopleMultiplier(5)).toBe(1.0);
  });

  it('should return 1.1 for 6-7 people', () => {
    expect(getPeopleMultiplier(6)).toBe(1.1);
    expect(getPeopleMultiplier(7)).toBe(1.1);
  });

  it('should return 1.15 for 8+ people', () => {
    expect(getPeopleMultiplier(8)).toBe(1.15);
    expect(getPeopleMultiplier(10)).toBe(1.15);
  });
});

describe('getSheddingPetMultiplier', () => {
  it('should return 1.0 for 0 shedding pets', () => {
    expect(getSheddingPetMultiplier(0)).toBe(1.0);
  });

  it('should return correct multipliers for 1-5 shedding pets', () => {
    expect(getSheddingPetMultiplier(1)).toBe(1.1);
    expect(getSheddingPetMultiplier(2)).toBe(1.15);
    expect(getSheddingPetMultiplier(3)).toBe(1.2);
    expect(getSheddingPetMultiplier(4)).toBe(1.35);
    expect(getSheddingPetMultiplier(5)).toBe(1.5);
  });

  it('should return 1.75 for 6+ shedding pets', () => {
    expect(getSheddingPetMultiplier(6)).toBe(1.75);
    expect(getSheddingPetMultiplier(10)).toBe(1.75);
  });
});

describe('getConditionMultiplier', () => {
  it('should return 1.0 for perfectionist/immaculate homes', () => {
    expect(getConditionMultiplier('perfectionist')).toBe(1.0);
    expect(getConditionMultiplier('immaculate')).toBe(1.0);
  });

  it('should return 1.0 for clean/good condition', () => {
    expect(getConditionMultiplier('clean')).toBe(1.0);
    expect(getConditionMultiplier('good')).toBe(1.0);
  });

  it('should return 1.1 for dusty/dirty homes', () => {
    expect(getConditionMultiplier('dusty')).toBe(1.1);
    expect(getConditionMultiplier('dirty')).toBe(1.1);
    expect(getConditionMultiplier('average')).toBe(1.1);
    expect(getConditionMultiplier('fair')).toBe(1.1);
  });

  it('should return 1.4 for extremely dusty/dirty homes', () => {
    expect(getConditionMultiplier('extremely dusty')).toBe(1.4);
    expect(getConditionMultiplier('poor')).toBe(1.4);
  });

  it('should return 20.0 for out of scope homes', () => {
    expect(getConditionMultiplier('above extremely dusty')).toBe(20.0);
    expect(getConditionMultiplier('out of scope')).toBe(20.0);
  });

  it('should return 1.0 for undefined/empty condition', () => {
    expect(getConditionMultiplier()).toBe(1.0);
    expect(getConditionMultiplier('')).toBe(1.0);
  });
});

describe('calcQuote', () => {
  describe('range selection', () => {
    it('should select Less Than1500 bucket for 1500 square feet', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 2,
        pets: 0,
        sheddingPets: 0,
      };
      const result = await calcQuote(inputs);
      
      expect(result.outOfLimits).toBe(false);
      expect(result.ranges?.weekly).toEqual({ low: 135, high: 165 });
    });

    it('should select 1501-2000 bucket for 1501 square feet', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1501,
        people: 2,
        pets: 0,
        sheddingPets: 0,
      };
      const result = await calcQuote(inputs);
      
      expect(result.outOfLimits).toBe(false);
      expect(result.ranges?.weekly).toEqual({ low: 144, high: 174 });
    });

    it('should select correct range for boundary values', async () => {
      const inputs1: QuoteInputs = {
        squareFeet: 0,
        people: 2,
        pets: 0,
        sheddingPets: 0,
      };
      const result1 = await calcQuote(inputs1);
      expect(result1.outOfLimits).toBe(false);

      const inputs2: QuoteInputs = {
        squareFeet: 2000,
        people: 2,
        pets: 0,
        sheddingPets: 0,
      };
      const result2 = await calcQuote(inputs2);
      expect(result2.outOfLimits).toBe(false);
      expect(result2.ranges?.weekly).toEqual({ low: 144, high: 174 });
    });
  });

  describe('out of limits', () => {
    it('should return outOfLimits when square feet exceeds max', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 2500,
        people: 2,
        pets: 0,
        sheddingPets: 0,
      };
      const result = await calcQuote(inputs);
      
      expect(result.outOfLimits).toBe(true);
      expect(result.message).toBe('This home falls outside our standard data limits for square footage. Please see management for custom pricing.');
      expect(result.ranges).toBeUndefined();
    });
  });

  describe('multipliers', () => {
    it('should apply people multiplier correctly', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 6, // 1.1 multiplier
        pets: 0,
        sheddingPets: 0,
      };
      const result = await calcQuote(inputs);
      
      expect(result.multiplier).toBe(1.1);
      expect(result.ranges?.weekly.low).toBe(Math.round(135 * 1.1)); // 149
      expect(result.ranges?.weekly.high).toBe(Math.round(165 * 1.1)); // 182
    });

    it('should apply shedding pet multiplier correctly', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 2,
        pets: 4,
        sheddingPets: 4, // 1.35 multiplier
      };
      const result = await calcQuote(inputs);
      
      expect(result.multiplier).toBe(1.35);
      expect(result.ranges?.weekly.low).toBe(Math.round(135 * 1.35)); // 182
      expect(result.ranges?.weekly.high).toBe(Math.round(165 * 1.35)); // 223
    });

    it('should apply combined multipliers correctly', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 8, // 1.15 multiplier
        pets: 2,
        sheddingPets: 2, // 1.15 multiplier
      };
      const result = await calcQuote(inputs);
      
      const expectedMultiplier = 1.15 * 1.15; // 1.3225
      expect(result.multiplier).toBeCloseTo(expectedMultiplier, 4);
      expect(result.ranges?.weekly.low).toBe(Math.round(135 * expectedMultiplier));
      expect(result.ranges?.weekly.high).toBe(Math.round(165 * expectedMultiplier));
    });

    it('should round prices to whole dollars', async () => {
      const inputs: QuoteInputs = {
        squareFeet: 1500,
        people: 6, // 1.1 multiplier
        pets: 0,
        sheddingPets: 0,
      };
      const result = await calcQuote(inputs);
      
      // 135 * 1.1 = 148.5 => 149
      expect(result.ranges?.weekly.low).toBe(149);
      expect(Number.isInteger(result.ranges?.weekly.low)).toBe(true);
      expect(Number.isInteger(result.ranges?.weekly.high)).toBe(true);
    });
  });
});
