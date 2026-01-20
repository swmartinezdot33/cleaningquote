import { QuoteResult, QuoteRanges } from './types';

/**
 * Format price range as "$Low to $High"
 */
function formatPriceRange(range: { low: number; high: number }): string {
  return `$${range.low} to $${range.high}`;
}

/**
 * Generate pricing summary text
 */
export function generateSummaryText(result: QuoteResult & { ranges: QuoteRanges }): string {
  const { inputs, ranges } = result;
  
  if (!inputs || !ranges) {
    return '';
  }

  let summary = `Square Footage: ${inputs.squareFeet}\n`;
  summary += `People: ${inputs.people}\n`;
  summary += `Shedding Pets: ${inputs.sheddingPets}\n\n`;
  
  summary += `Weekly Clean: ${formatPriceRange(ranges.weekly)}\n`;
  summary += `Bi Weekly Clean: ${formatPriceRange(ranges.biWeekly)}\n`;
  summary += `Every 4 Weeks Clean: ${formatPriceRange(ranges.fourWeek)}\n`;
  summary += `General Clean: ${formatPriceRange(ranges.general)}\n`;
  summary += `Deep Clean: ${formatPriceRange(ranges.deep)}\n`;
  summary += `Move In Move Out Basic: ${formatPriceRange(ranges.moveInOutBasic)}\n`;
  summary += `Move In Move Out Full: ${formatPriceRange(ranges.moveInOutFull)}`;

  return summary;
}

/**
 * Generate SMS text message (exact template)
 */
export function generateSmsText(result: QuoteResult & { ranges: QuoteRanges }): string {
  const { ranges } = result;
  
  if (!ranges) {
    return '';
  }

  let sms = 'For a home your size, pricing varies based on cleaning frequency and the overall condition of the home.\n\n';
  
  sms += `For bi weekly service, which is our most popular option and works best for maintaining a consistently clean home, pricing typically ranges from $${ranges.biWeekly.low} to $${ranges.biWeekly.high} per visit.\n\n`;
  
  sms += `For weekly service, pricing typically ranges from $${ranges.weekly.low} to $${ranges.weekly.high} per visit.\n\n`;
  
  sms += `For every 4 weeks service, pricing typically ranges from $${ranges.fourWeek.low} to $${ranges.fourWeek.high} per visit.\n\n`;
  
  sms += `For a general clean, pricing typically ranges from $${ranges.general.low} to $${ranges.general.high} per visit.\n\n`;
  
  sms += `For a deep clean, pricing typically ranges from $${ranges.deep.low} to $${ranges.deep.high} per visit.\n\n`;
  
  sms += `For a move in move out basic clean, pricing typically ranges from $${ranges.moveInOutBasic.low} to $${ranges.moveInOutBasic.high} per visit.\n\n`;
  
  sms += `For a move in move out full clean, pricing typically ranges from $${ranges.moveInOutFull.low} to $${ranges.moveInOutFull.high} per visit.\n\n`;
  
  sms += `After your first two cleanings, we're able to lock in your ongoing price based on the average scope of the work.\n\n`;
  
  sms += `Would bi weekly or weekly service work better for you?\n\n`;
  
  sms += `Click Here For Whats Included:\nhttps://my.raleighcleaningcompany.com/widget/form/UVSF5Lh25ENVpDJBtniu?notrack=true`;

  return sms;
}
