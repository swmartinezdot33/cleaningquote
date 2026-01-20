import { describe, it, expect } from 'vitest';
import { parsePriceRange } from '../loadPricingTable';

describe('parsePriceRange', () => {
  it('should parse "$135-$165" correctly', () => {
    const result = parsePriceRange('$135-$165');
    expect(result).toEqual({ low: 135, high: 165 });
  });

  it('should parse "$1,000-$1,200" correctly', () => {
    const result = parsePriceRange('$1,000-$1,200');
    expect(result).toEqual({ low: 1000, high: 1200 });
  });

  it('should parse "$1150 - $1350" with spaces correctly', () => {
    const result = parsePriceRange('$1150 - $1350');
    expect(result).toEqual({ low: 1150, high: 1350 });
  });

  it('should return null for invalid input', () => {
    expect(parsePriceRange('')).toBeNull();
    expect(parsePriceRange('invalid')).toBeNull();
    expect(parsePriceRange('$100')).toBeNull();
    expect(parsePriceRange(null as any)).toBeNull();
    expect(parsePriceRange(undefined as any)).toBeNull();
  });

  it('should return null when low > high', () => {
    const result = parsePriceRange('$200-$100');
    expect(result).toBeNull();
  });
});
