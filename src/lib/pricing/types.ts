export interface PriceRange {
  low: number;
  high: number;
}

export interface PricingRow {
  sqFtRange: {
    min: number;
    max: number;
  };
  weekly: PriceRange;
  biWeekly: PriceRange;
  fourWeek: PriceRange;
  general: PriceRange;
  deep: PriceRange;
  moveInOutBasic: PriceRange;
  moveInOutFull: PriceRange;
}

export interface PricingTable {
  rows: PricingRow[];
  maxSqFt: number;
}

export interface QuoteInputs {
  squareFeet: number;
  people: number;
  pets: number;
  sheddingPets: number;
  condition?: string;
}

export interface QuoteRanges {
  weekly: PriceRange;
  biWeekly: PriceRange;
  fourWeek: PriceRange;
  general: PriceRange;
  deep: PriceRange;
  moveInOutBasic: PriceRange;
  moveInOutFull: PriceRange;
}

export interface QuoteResult {
  outOfLimits: boolean;
  message?: string;
  multiplier?: number;
  inputs?: QuoteInputs;
  ranges?: QuoteRanges;
  summaryText?: string;
  smsText?: string;
}
