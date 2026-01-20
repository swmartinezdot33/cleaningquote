import { QuoteResult, QuoteRanges } from './types';

/**
 * Format price range as "$Low to $High"
 */
function formatPriceRange(range: { low: number; high: number }): string {
  return `$${range.low} to $${range.high}`;
}

/**
 * Get service name from frequency
 */
function getServiceName(frequency: string): string {
  const frequencyMap: { [key: string]: string } = {
    'weekly': 'Weekly Cleaning',
    'bi-weekly': 'Bi-Weekly Cleaning',
    'monthly': 'Monthly Cleaning (Every 4 Weeks)',
    'one-time': 'One-Time Service',
  };
  return frequencyMap[frequency] || frequency;
}

/**
 * Get service name from service type
 */
function getServiceTypeDisplayName(serviceType: string): string {
  const typeMap: { [key: string]: string } = {
    'general': 'General Clean',
    'deep': 'Deep Clean',
    'move-in': 'Move-In Clean',
    'move-out': 'Move-Out Clean',
    'recurring': 'Recurring Service',
  };
  return typeMap[serviceType] || serviceType;
}

/**
 * Get the selected price range based on service type and frequency
 */
function getSelectedQuoteRange(ranges: QuoteRanges, serviceType: string, frequency: string): { low: number; high: number } | null {
  // Map frequency to the appropriate range
  if (frequency === 'weekly') {
    return ranges.weekly;
  } else if (frequency === 'bi-weekly') {
    return ranges.biWeekly;
  } else if (frequency === 'monthly') {
    return ranges.fourWeek;
  } else if (serviceType === 'deep' && frequency === 'one-time') {
    return ranges.deep;
  } else if (serviceType === 'general' && frequency === 'one-time') {
    return ranges.general;
  } else if (serviceType === 'move-in' && frequency === 'one-time') {
    return ranges.moveInOutBasic;
  } else if (serviceType === 'move-out' && frequency === 'one-time') {
    return ranges.moveInOutFull;
  }
  
  // Default to the service type
  if (serviceType === 'deep') return ranges.deep;
  if (serviceType === 'general') return ranges.general;
  if (serviceType === 'move-in') return ranges.moveInOutBasic;
  if (serviceType === 'move-out') return ranges.moveInOutFull;
  
  return null;
}

/**
 * Generate pricing summary text - focused on the selected service only
 */
export function generateSummaryText(result: QuoteResult & { ranges: QuoteRanges }, serviceType?: string, frequency?: string): string {
  const { inputs, ranges } = result;
  
  if (!inputs || !ranges) {
    return '';
  }

  // If serviceType and frequency provided, show only that specific quote
  if (serviceType && frequency) {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType, frequency);
    if (selectedRange) {
      const serviceName = frequency === 'one-time' ? getServiceTypeDisplayName(serviceType) : getServiceName(frequency);
      let summary = `Your Service: ${serviceName}\n`;
      summary += `Home Size: ${inputs.squareFeet} sq ft\n\n`;
      summary += `Price Range: ${formatPriceRange(selectedRange)}\n\n`;
      summary += `This quote is based on:\n`;
      summary += `• Square footage: ${inputs.squareFeet} sq ft\n`;
      summary += `• People in home: ${inputs.people}\n`;
      summary += `• Shedding pets: ${inputs.sheddingPets}\n`;
      summary += `• Home condition: ${inputs.condition || 'Not specified'}\n`;
      return summary;
    }
  }

  // Fallback: show all services (if no specific selection provided)
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
