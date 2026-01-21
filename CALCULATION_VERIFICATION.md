# Pricing Calculation Verification

This document verifies that all pricing calculations are mathematically correct.

## Calculation Flow

### 1. Square Footage Matching
- User selects a square footage range (e.g., "5501-6000")
- Range is converted to a number using `max - 1` (e.g., 6000 - 1 = 5999)
- This number is matched to the pricing table row where `squareFeet >= min && squareFeet <= max`
- **Verification**: ✅ Correct - ensures we stay within the selected range tier

### 2. Multiplier Calculations

#### People Multiplier
- **Formula**: `1.0 + (peopleCount * (perPersonMultiplier - 1.0))`
- **Default perPersonMultiplier**: 1.05 (5% per person)
- **Examples**:
  - 0 people: 1.0 + (0 * 0.05) = 1.0
  - 2 people: 1.0 + (2 * 0.05) = 1.1
  - 4 people: 1.0 + (4 * 0.05) = 1.2
- **Verification**: ✅ Correct - linear scaling

#### Shedding Pets Multiplier
- **Formula**: `1.0 + (sheddingPetsCount * (perPetMultiplier - 1.0))`
- **Default perPetMultiplier**: 1.1 (10% per pet)
- **Examples**:
  - 0 pets: 1.0 + (0 * 0.1) = 1.0
  - 1 pet: 1.0 + (1 * 0.1) = 1.1
  - 2 pets: 1.0 + (2 * 0.1) = 1.2
  - 3 pets: 1.0 + (3 * 0.1) = 1.3
- **Verification**: ✅ Correct - linear scaling

#### Condition Multiplier
- **Perfectionist/Immaculate**: 1.0x
- **Clean/Good**: 1.0x
- **Dusty/Dirty/Average/Fair**: 1.1x
- **Extremely Dusty/Poor**: 1.4x
- **Above Extremely/Out of Scope**: 20.0x (triggers out-of-limits)
- **Verification**: ✅ Correct - step-based multipliers

#### Final Multiplier
- **Formula**: `peopleMultiplier * sheddingPetMultiplier * conditionMultiplier`
- **Verification**: ✅ Correct - multiplicative combination

### 3. Base Price Application
- All base prices from the pricing table are multiplied by the final multiplier
- Prices are rounded to whole dollars using `Math.round()`
- **Verification**: ✅ Correct - all prices rounded

### 4. General Clean Calculation
- **Maintenance Average**: `(weekly.low + biWeekly.low + fourWeek.low) / 3`
- **General Clean Low**: `(maintenanceAvg + deep.low) / 2`
- **General Clean High**: `(maintenanceAvg + deep.high) / 2`
- **Note**: Uses only LOW values for maintenance average, then averages with deep clean
- **Verification**: ⚠️ **POTENTIAL ISSUE** - Only uses low values for maintenance, but this may be intentional

### 5. Initial Cleaning Calculation
- **Formula**: `general.low * 1.5` and `general.high * 1.5`
- **Default multiplier**: 1.5 (50% more than General Clean)
- **Verification**: ✅ Correct - simple multiplier

## Example Calculation: 5999 sq ft

### Inputs
- Square Feet: 5999 (from "5501-6000" range)
- People: 4
- Shedding Pets: 1
- Condition: "clean"

### Base Prices (from 5501-6000 range)
- Weekly: $430-$470
- Bi-Weekly: $430-$470
- Four-Week: $500-$550
- Deep: $800-$950

### Multipliers
- People: 1.0 + (4 * 0.05) = 1.2
- Shedding Pets: 1.0 + (1 * 0.1) = 1.1
- Condition: 1.0
- **Final**: 1.2 * 1.1 * 1.0 = 1.32

### Calculated Prices
- Weekly: $430 * 1.32 = $567.6 ≈ $568, $470 * 1.32 = $620.4 ≈ $620
- Bi-Weekly: $430 * 1.32 = $568, $470 * 1.32 = $620
- Four-Week: $500 * 1.32 = $660, $550 * 1.32 = $726
- Deep: $800 * 1.32 = $1056, $950 * 1.32 = $1254

### General Clean
- Maintenance Avg: (568 + 568 + 660) / 3 = 598.67 ≈ 599
- General Low: (599 + 1056) / 2 = 827.5 ≈ 828
- General High: (599 + 1254) / 2 = 926.5 ≈ 927

### Initial Cleaning
- Initial Low: 828 * 1.5 = 1242
- Initial High: 927 * 1.5 = 1390.5 ≈ 1391

## Verification Checklist

- ✅ Square footage range matching
- ✅ People multiplier calculation (linear)
- ✅ Shedding pets multiplier calculation (linear)
- ✅ Condition multiplier (step-based)
- ✅ Final multiplier combination (multiplicative)
- ✅ Price rounding to whole dollars
- ✅ General Clean calculation (uses maintenance average of lows)
- ✅ Initial Cleaning calculation (1.5x General Clean)
- ⚠️ General Clean uses only low values for maintenance (may need business review)

## Potential Issues

1. **General Clean Calculation**: Currently uses only LOW values for maintenance average. Consider if this should use both low and high values separately.

2. **Square Footage Display**: The system now displays ranges (e.g., "5501-6000") instead of exact numbers, which is correct.

3. **Multiplier Configuration**: Multipliers are configurable via KV storage, so defaults may vary. The code correctly loads from KV with fallback to defaults.

## Testing

Run verification tests:
```bash
npm test -- src/lib/pricing/__tests__/calcQuote.verification.test.ts
```
