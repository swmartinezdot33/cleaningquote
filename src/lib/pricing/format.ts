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
export function getServiceName(frequency: string): string {
  const frequencyMap: { [key: string]: string } = {
    'weekly': 'Weekly Cleaning',
    'bi-weekly': 'Bi-Weekly Cleaning',
    'monthly': 'Every 4 Weeks Cleaning',
    'four-week': 'Every 4 Weeks Cleaning',
    'every-4-weeks': 'Every 4 Weeks Cleaning',
    'one-time': 'One-Time Service',
  };
  return frequencyMap[frequency] || frequency;
}

/**
 * Get service name from service type
 */
export function getServiceTypeDisplayName(serviceType: string): string {
  const typeMap: { [key: string]: string } = {
    'initial': 'Initial Cleaning',
    'general': 'General Clean',
    'deep': 'Deep Clean',
    'move-in': 'Move In/Move Out Basic Clean',
    'move-out': 'Move In/Move Out Deep Clean',
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
 * Convert square footage number back to range string for display
 */
function getSquareFootageRangeDisplay(squareFeet: number): string {
  if (squareFeet < 1500) {
    return 'Less Than 1500';
  } else if (squareFeet < 2000) {
    return '1501-2000';
  } else if (squareFeet < 2500) {
    return '2001-2500';
  } else if (squareFeet < 3000) {
    return '2501-3000';
  } else if (squareFeet < 3500) {
    return '3001-3500';
  } else if (squareFeet < 4000) {
    return '3501-4000';
  } else if (squareFeet < 4500) {
    return '4001-4500';
  } else if (squareFeet < 5000) {
    return '4501-5000';
  } else if (squareFeet < 5500) {
    return '5001-5500';
  } else if (squareFeet < 6000) {
    return '5501-6000';
  } else if (squareFeet < 6500) {
    return '6001-6500';
  } else if (squareFeet < 7000) {
    return '6501-7000';
  } else if (squareFeet < 7500) {
    return '7001-7500';
  } else if (squareFeet < 8000) {
    return '7501-8000';
  } else if (squareFeet < 8500) {
    return '8001-8500';
  } else {
    return '8500+';
  }
}

export type SummaryLabels = {
  serviceTypeLabels: Record<string, string>;
  frequencyLabels: Record<string, string>;
};

function serviceLabel(labels: SummaryLabels | undefined, key: string): string {
  if (!labels) return getServiceTypeDisplayName(key);
  const k = key.toLowerCase();
  return labels.serviceTypeLabels[key] ?? labels.serviceTypeLabels[k] ?? getServiceTypeDisplayName(key);
}

function freqLabel(labels: SummaryLabels | undefined, key: string): string {
  if (!labels) return getServiceName(key);
  const k = key.toLowerCase();
  return labels.frequencyLabels[key] ?? labels.frequencyLabels[k] ?? labels.frequencyLabels[key === 'biweekly' ? 'bi-weekly' : key] ?? getServiceName(key);
}

/**
 * Generate pricing summary text - shows selected service type and frequency correctly.
 * Optional labels from Survey Builder are used when provided so all text matches admin labels.
 */
export function generateSummaryText(
  result: QuoteResult & { ranges: QuoteRanges },
  serviceType?: string,
  frequency?: string,
  squareFeetRange?: string,
  labels?: SummaryLabels
): string {
  const { inputs, ranges, initialCleaningRequired } = result;

  if (!inputs || !ranges) {
    return '';
  }

  const squareFeetDisplay = squareFeetRange || getSquareFootageRangeDisplay(inputs.squareFeet);

  let summary = `✨ YOUR QUOTE\n\n`;
  summary += `Home Size: ${squareFeetDisplay} sq ft\n\n`;

  if (serviceType && (frequency === 'one-time' || !frequency)) {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType, frequency || 'one-time');

    if (selectedRange) {
      summary += `🎯 ${serviceLabel(labels, serviceType)}: ${formatPriceRange(selectedRange)}\n\n`;

      if (serviceType === 'move-in' || serviceType === 'move-out') {
        summary += `OTHER SERVICE OPTIONS\n\n`;
        summary += `🧹 ${serviceLabel(labels, 'deep')}: ${formatPriceRange(ranges.deep)}\n`;
        summary += `✨ ${serviceLabel(labels, 'general')}: ${formatPriceRange(ranges.general)}\n\n`;
      } else {
        summary += `RECURRING SERVICE OPTIONS\n\n`;
        summary += `📅 ${freqLabel(labels, 'weekly')}: ${formatPriceRange(ranges.weekly)}\n`;
        summary += `⭐ ${freqLabel(labels, 'bi-weekly')}: ${formatPriceRange(ranges.biWeekly)} (Most Popular)\n`;
        summary += `📅 ${freqLabel(labels, 'four-week')}: ${formatPriceRange(ranges.fourWeek)}\n\n`;
      }
    }
  } else if (frequency && frequency !== 'one-time') {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType || 'recurring', frequency);

    if (selectedRange) {
      summary += `🎯 ${freqLabel(labels, frequency)}: ${formatPriceRange(selectedRange)}\n\n`;
    }

    summary += `ALL RECURRING OPTIONS\n\n`;
    summary += `📅 ${freqLabel(labels, 'weekly')}: ${formatPriceRange(ranges.weekly)}\n`;
    summary += `⭐ ${freqLabel(labels, 'bi-weekly')}: ${formatPriceRange(ranges.biWeekly)} (Most Popular)\n`;
    summary += `📅 ${freqLabel(labels, 'four-week')}: ${formatPriceRange(ranges.fourWeek)}\n\n`;

    summary += `ONE-TIME SERVICE OPTIONS\n\n`;
    summary += `🧹 ${serviceLabel(labels, 'deep')}: ${formatPriceRange(ranges.deep)}\n`;
    summary += `✨ ${serviceLabel(labels, 'general')}: ${formatPriceRange(ranges.general)}\n`;
    summary += `🚚 ${serviceLabel(labels, 'move-in')}: ${formatPriceRange(ranges.moveInOutBasic)}\n`;
    summary += `🚚 ${serviceLabel(labels, 'move-out')}: ${formatPriceRange(ranges.moveInOutFull)}\n\n`;
  } else {
    summary += `RECURRING SERVICE OPTIONS\n\n`;
    summary += `📅 ${freqLabel(labels, 'weekly')}: ${formatPriceRange(ranges.weekly)}\n`;
    summary += `⭐ ${freqLabel(labels, 'bi-weekly')}: ${formatPriceRange(ranges.biWeekly)} (Most Popular)\n`;
    summary += `📅 ${freqLabel(labels, 'four-week')}: ${formatPriceRange(ranges.fourWeek)}\n\n`;

    summary += `ONE-TIME SERVICE OPTIONS\n\n`;
    summary += `🧹 ${serviceLabel(labels, 'deep')}: ${formatPriceRange(ranges.deep)}\n`;
    summary += `✨ ${serviceLabel(labels, 'general')}: ${formatPriceRange(ranges.general)}\n`;
    summary += `🚚 ${serviceLabel(labels, 'move-in')}: ${formatPriceRange(ranges.moveInOutBasic)}\n`;
    summary += `🚚 ${serviceLabel(labels, 'move-out')}: ${formatPriceRange(ranges.moveInOutFull)}\n\n`;
  }

  if (initialCleaningRequired && serviceType !== 'initial') {
    summary += `📌 Note: An initial cleaning is required as your first service.\n`;
    summary += `This gets your home to our maintenance standards.\n`;
  }

  return summary;
}

/**
 * Generate SMS text message. Optional labels from Survey Builder are used when provided.
 */
export function generateSmsText(result: QuoteResult & { ranges: QuoteRanges }, labels?: SummaryLabels): string {
  const { ranges, initialCleaningRequired } = result;

  if (!ranges) {
    return '';
  }

  const biWeeklyLabel = labels ? (labels.frequencyLabels['bi-weekly'] ?? labels.frequencyLabels['biweekly'] ?? 'bi weekly') : 'bi weekly';
  const weeklyLabel = labels ? (labels.frequencyLabels['weekly'] ?? 'weekly') : 'weekly';
  const fourWeekLabel = labels ? (labels.frequencyLabels['four-week'] ?? labels.frequencyLabels['monthly'] ?? 'every 4 weeks') : 'every 4 weeks';
  const generalLabel = labels ? (labels.serviceTypeLabels['general'] ?? 'general clean') : 'general clean';
  const deepLabel = labels ? (labels.serviceTypeLabels['deep'] ?? 'deep clean') : 'deep clean';
  const moveInLabel = labels ? (labels.serviceTypeLabels['move-in'] ?? 'move in move out basic clean') : 'move in move out basic clean';
  const moveOutLabel = labels ? (labels.serviceTypeLabels['move-out'] ?? 'move in move out deep clean') : 'move in move out deep clean';
  const initialLabel = labels ? (labels.serviceTypeLabels['initial'] ?? 'Initial Cleaning') : 'Initial Cleaning';

  let sms = 'For a home your size, pricing varies based on cleaning frequency and the overall condition of the home.\n\n';

  if (initialCleaningRequired) {
    sms += `${initialLabel.toUpperCase()} (First Service): $${ranges.initial.low} to $${ranges.initial.high}\n`;
    sms += `This thorough first cleaning gets your home to our maintenance standards.\n\n`;
  }

  sms += `For ${biWeeklyLabel.toLowerCase()} service, which is our most popular option and works best for maintaining a consistently clean home, pricing typically ranges from $${ranges.biWeekly.low} to $${ranges.biWeekly.high} per visit.\n\n`;

  sms += `For ${weeklyLabel.toLowerCase()} service, pricing typically ranges from $${ranges.weekly.low} to $${ranges.weekly.high} per visit.\n\n`;

  sms += `For ${fourWeekLabel.toLowerCase()} service, pricing typically ranges from $${ranges.fourWeek.low} to $${ranges.fourWeek.high} per visit.\n\n`;

  sms += `For a ${generalLabel.toLowerCase()}, pricing typically ranges from $${ranges.general.low} to $${ranges.general.high} per visit.\n\n`;

  sms += `For a ${deepLabel.toLowerCase()}, pricing typically ranges from $${ranges.deep.low} to $${ranges.deep.high} per visit.\n\n`;

  sms += `For a ${moveInLabel.toLowerCase()}, pricing typically ranges from $${ranges.moveInOutBasic.low} to $${ranges.moveInOutBasic.high} per visit.\n\n`;

  sms += `For a ${moveOutLabel.toLowerCase()}, pricing typically ranges from $${ranges.moveInOutFull.low} to $${ranges.moveInOutFull.high} per visit.\n\n`;

  sms += `After your first two cleanings, we're able to lock in your ongoing price based on the average scope of the work.\n\n`;

  sms += `Would ${biWeeklyLabel.toLowerCase()} or ${weeklyLabel.toLowerCase()} service work better for you?\n\n`;

  sms += `Click Here For Whats Included:\nhttps://my.raleighcleaningcompany.com/widget/form/UVSF5Lh25ENVpDJBtniu?notrack=true`;

  return sms;
}
