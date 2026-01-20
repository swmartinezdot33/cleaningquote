# Data Directory

Place your Excel pricing file here:

**File name must be exactly:** `2026 Pricing.xlsx`

The application will read pricing data from this file at runtime.

## Expected Excel File Structure

- **Sheet name:** `Sheet1`
- **First row:** Header row (will be skipped during parsing)
- **Square footage column:** Contains ranges like "Less Than1500", "1501-2000", etc.
- **Service columns:** Weekly, Bi-Weekly, 4 Week, General, Deep cleaning prices
- **Move-in/move-out columns:** At column indices 7 and 8 (or detected automatically)

## Price Format

Prices should be formatted as ranges:
- `$135-$165`
- `$1,000-$1,200`
- `$1150 - $1350`

The parser automatically handles dollar signs, commas, and spaces.
