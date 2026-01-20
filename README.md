# Cleaning Quote Calculator

A Next.js web application for calculating residential cleaning service quotes based on home size, number of occupants, and pets.

## Features

- Dynamic pricing calculation from Excel data source
- People and shedding pet multipliers
- Comprehensive quote summary
- Ready-to-copy SMS text message template
- Form validation with Zod
- Responsive UI with Tailwind CSS and shadcn/ui components

## Tech Stack

- **Next.js 14+** (App Router) with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** components
- **react-hook-form** + **zod** for form validation
- **xlsx** (SheetJS) for Excel file parsing
- **Vitest** for unit testing

## Setup Instructions

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd cleaningquote
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. **Place the Excel pricing file:**
   - Copy your `2026 Pricing.xlsx` file to the `./data/` directory
   - The file should be located at: `./data/2026 Pricing.xlsx`
   - The application reads pricing data exclusively from this file

### Development Server

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Running Tests

Run unit tests with Vitest:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

## Excel File Format

The application expects an Excel file (`2026 Pricing.xlsx`) with the following structure:

- **Sheet name:** `Sheet1`
- **First row:** Header row (will be skipped)
- **Data rows should contain:**
  - Square footage range column (e.g., "Less Than1500", "1501-2000")
  - Service pricing columns:
    - Weekly pricing
    - Bi-Weekly pricing
    - 4 Week pricing
    - General cleaning pricing
    - Deep cleaning pricing
  - Move-in/move-out pricing columns

Price ranges should be formatted as: `$135-$165`, `$1,000-$1,200`, or `$1150 - $1350`

## How Pricing is Computed

The pricing calculation follows these steps:

1. **Base Price Selection**: The square footage is matched to the appropriate pricing bucket from the Excel file.

2. **People Multiplier**:
   - 0-5 people: 1.0 (no multiplier)
   - 6-7 people: 1.1
   - 8+ people: 1.15

3. **Shedding Pet Multiplier** (only shedding pets are counted):
   - 0 pets: 1.0
   - 1 pet: 1.1
   - 2 pets: 1.15
   - 3 pets: 1.2
   - 4 pets: 1.35
   - 5 pets: 1.5
   - 6+ pets: 1.75

4. **Final Calculation**: 
   - Final multiplier = People Multiplier × Shedding Pet Multiplier
   - Final price = Base price × Final multiplier (rounded to nearest dollar)

5. **Out of Limits**: If the square footage exceeds the maximum range in the Excel file, a custom pricing message is displayed instead of calculated prices.

## Project Structure

```
cleaningquote/
├── data/
│   └── 2026 Pricing.xlsx        # Pricing data file (place your file here)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── quote/
│   │   │       └── route.ts     # API endpoint for quote calculations
│   │   ├── globals.css          # Global styles
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Main page with form
│   ├── components/
│   │   └── ui/                  # shadcn/ui components
│   └── lib/
│       ├── pricing/
│       │   ├── types.ts         # TypeScript types
│       │   ├── loadPricingTable.ts  # Excel file parser
│       │   ├── calcQuote.ts     # Pricing calculation logic
│       │   ├── format.ts        # Text formatting utilities
│       │   └── __tests__/       # Unit tests
│       └── utils.ts             # Utility functions
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vitest.config.ts
```

## API Endpoint

### POST `/api/quote`

Calculate a quote based on home information.

**Request Body:**
```json
{
  "squareFeet": 1500,
  "people": 2,
  "pets": 1,
  "sheddingPets": 1
}
```

**Response (Success):**
```json
{
  "outOfLimits": false,
  "multiplier": 1.1,
  "inputs": { ... },
  "ranges": {
    "weekly": { "low": 149, "high": 182 },
    "biWeekly": { ... },
    ...
  },
  "summaryText": "...",
  "smsText": "..."
}
```

**Response (Out of Limits):**
```json
{
  "outOfLimits": true,
  "message": "This home falls outside our standard data limits for square footage. Please see management for custom pricing."
}
```

## Building for Production

```bash
npm run build
npm start
```

## Notes

- The pricing table is cached in memory after the first load for performance
- All pricing is calculated dynamically from the Excel file - no hardcoded prices
- The application validates that shedding pets count does not exceed total pets count
- Prices are rounded to whole dollars in the final calculation
