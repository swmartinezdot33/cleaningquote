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
    'initial': 'Initial Cleaning',
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
  } else if (serviceType === 'initial' && frequency === 'one-time') {
    return ranges.initial;
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
  if (serviceType === 'initial') return ranges.initial;
  if (serviceType === 'deep') return ranges.deep;
  if (serviceType === 'general') return ranges.general;
  if (serviceType === 'move-in') return ranges.moveInOutBasic;
  if (serviceType === 'move-out') return ranges.moveInOutFull;
  
  return null;
}

/**
 * Generate pricing summary text - focused on the selected service only (elegant minimal version)
 */
export function generateSummaryText(result: QuoteResult & { ranges: QuoteRanges }, serviceType?: string, frequency?: string): string {
  const { inputs, ranges, initialCleaningRequired } = result;
  
  if (!inputs || !ranges) {
    return '';
  }

  // If serviceType and frequency provided, show only that specific quote
  if (serviceType && frequency) {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType, frequency);
    if (selectedRange) {
      const serviceName = frequency === 'one-time' ? getServiceTypeDisplayName(serviceType) : getServiceName(frequency);
      
      // Beautiful minimal format
      let summary = `✨ YOUR QUOTE\n\n`;
      summary += `Service: ${serviceName}\n`;
      summary += `Home Size: ${inputs.squareFeet} sq ft\n\n`;
      
      // Show the exact price range
      summary += `💰 ${formatPriceRange(selectedRange)}\n\n`;
      
      // Add Initial Cleaning messaging if applicable
      if (initialCleaningRequired && serviceType !== 'initial') {
        summary += `📌 Note: An initial cleaning is required as your first service.\n`;
        summary += `This gets your home to our maintenance standards.\n`;
      }
      
      return summary;
    }
  }

  // If no service type/frequency, show focused summary of key quote
  // Default to bi-weekly as it's most popular
  const defaultRange = ranges.biWeekly || ranges.general;
  let summary = `✨ YOUR QUOTE\n\n`;
  summary += `Home Size: ${inputs.squareFeet} sq ft\n`;
  summary += `Most Popular: Bi-Weekly Service\n`;
  summary += `💰 ${formatPriceRange(defaultRange)}\n\n`;
  
  if (initialCleaningRequired) {
    summary += `📌 Initial Cleaning Required: ${formatPriceRange(ranges.initial)}\n`;
  }

  return summary;
}

/**
 * Generate SMS text message (exact template)
 */
export function generateSmsText(result: QuoteResult & { ranges: QuoteRanges }): string {
  const { ranges, initialCleaningRequired } = result;
  
  if (!ranges) {
    return '';
  }

  let sms = 'For a home your size, pricing varies based on cleaning frequency and the overall condition of the home.\n\n';
  
  // Show Initial Cleaning first if required
  if (initialCleaningRequired) {
    sms += `INITIAL CLEANING (First Service): $${ranges.initial.low} to $${ranges.initial.high}\n`;
    sms += `This thorough first cleaning gets your home to our maintenance standards.\n\n`;
  }
  
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
