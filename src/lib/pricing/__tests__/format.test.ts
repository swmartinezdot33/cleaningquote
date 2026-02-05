import { describe, it, expect } from 'vitest';
import { generateSummaryText, generateSmsText, squareFootageRangeToNumber } from '../format';
import { QuoteResult, QuoteRanges } from '../types';

describe('generateSummaryText', () => {
  it('should generate correct summary format', () => {
    const result: QuoteResult & { ranges: QuoteRanges } = {
      outOfLimits: false,
      multiplier: 1.0,
      inputs: {
        squareFeet: 1500,
        people: 2,
        pets: 1,
        sheddingPets: 1,
      },
      ranges: {
        weekly: { low: 135, high: 165 },
        biWeekly: { low: 135, high: 165 },
        fourWeek: { low: 158, high: 193 },
        general: { low: 170, high: 240 },
        deep: { low: 250, high: 350 },
        moveInOutBasic: { low: 200, high: 320 },
        moveInOutFull: { low: 250, high: 420 },
      },
    };

    const summary = generateSummaryText(result);

    // Summary shows home size as range (e.g. 1500 -> "1501-2000" tier)
    expect(summary).toContain('Home Size:');
    expect(summary).toContain('sq ft');
    expect(summary).toContain('YOUR QUOTE');
    expect(summary).toContain('Weekly Cleaning: $135 to $165');
    expect(summary).toContain('Bi-Weekly Cleaning: $135 to $165');
    expect(summary).toContain('Every 4 Weeks Cleaning: $158 to $193');
    expect(summary).toContain('General Clean: $170 to $240');
    expect(summary).toContain('Deep Clean: $250 to $350');
    expect(summary).toContain('Move In/Move Out Basic Clean: $200 to $320');
    expect(summary).toContain('Move In/Move Out Deep Clean: $250 to $420');
  });
});

describe('generateSmsText', () => {
  it('should generate correct SMS format with bi-weekly first', () => {
    const result: QuoteResult & { ranges: QuoteRanges } = {
      outOfLimits: false,
      multiplier: 1.0,
      inputs: {
        squareFeet: 1500,
        people: 2,
        pets: 1,
        sheddingPets: 1,
      },
      ranges: {
        weekly: { low: 135, high: 165 },
        biWeekly: { low: 135, high: 165 },
        fourWeek: { low: 158, high: 193 },
        general: { low: 170, high: 240 },
        deep: { low: 250, high: 350 },
        moveInOutBasic: { low: 200, high: 320 },
        moveInOutFull: { low: 250, high: 420 },
      },
    };

    const sms = generateSmsText(result);

    // Check bi-weekly comes first
    const biWeeklyIndex = sms.indexOf('bi weekly service');
    const weeklyIndex = sms.indexOf('weekly service');
    expect(biWeeklyIndex).toBeLessThan(weeklyIndex);

    // Check all services are included
    expect(sms).toContain('$135 to $165'); // bi-weekly
    expect(sms).toContain('weekly service');
    expect(sms).toContain('every 4 weeks service');
    expect(sms).toContain('general clean');
    expect(sms).toContain('deep clean');
    expect(sms).toContain('move in move out basic');
    expect(sms).toContain('move in move out deep clean');
    
    // Check template text
    expect(sms).toContain('For a home your size');
    expect(sms).toContain('After your first two cleanings');
    expect(sms).toContain('Would bi weekly or weekly service');
    expect(sms).toContain('https://my.raleighcleaningcompany.com/widget/form/UVSF5Lh25ENVpDJBtniu?notrack=true');
  });
});

describe('squareFootageRangeToNumber', () => {
  it('uses midpoint so selection matches correct pricing tier', () => {
    expect(squareFootageRangeToNumber('0-1500')).toBe(750);
    expect(squareFootageRangeToNumber('1501-2000')).toBe(1751); // (1501+2000)/2 rounded
    expect(squareFootageRangeToNumber('7251-7500')).toBe(7376);
    expect(squareFootageRangeToNumber('7501-8000')).toBe(7751);
  });
  it('handles Less Than format', () => {
    expect(squareFootageRangeToNumber('Less Than 1500')).toBe(750);
    expect(squareFootageRangeToNumber('Less Than1500')).toBe(750);
  });
  it('handles numeric input', () => {
    expect(squareFootageRangeToNumber('6500')).toBe(6500);
  });
  it('handles 8000+ and uses maxSqFt when provided', () => {
    expect(squareFootageRangeToNumber('8000+')).toBe(8000);
    expect(squareFootageRangeToNumber('8000+', { maxSqFt: 8500 })).toBe(8500);
  });
  it('returns default fallback for empty/invalid', () => {
    expect(squareFootageRangeToNumber('')).toBe(1500);
    expect(squareFootageRangeToNumber('  ', { defaultFallback: 2000 })).toBe(2000);
  });
});
