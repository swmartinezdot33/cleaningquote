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
 * Get the selected price range based on service type and frequency.
 * Normalizes frequency (biweekly → bi-weekly, monthly → four-week) to match API. Returns null when no match (no fallback).
 */
function getSelectedQuoteRange(ranges: QuoteRanges, serviceType: string, frequency: string): { low: number; high: number } | null {
  const st = String(serviceType ?? '').toLowerCase().trim();
  const freq = String(frequency ?? '').toLowerCase().trim();
  const freqNorm = freq === 'biweekly' ? 'bi-weekly' : freq;

  if (freqNorm === 'weekly') return ranges.weekly;
  if (freqNorm === 'bi-weekly') return ranges.biWeekly;
  if (freqNorm === 'monthly' || freqNorm === 'four-week') return ranges.fourWeek;

  const effectiveFreq = ['move-in', 'move-out', 'deep'].includes(st) ? '' : freqNorm;
  if (effectiveFreq === 'one-time' || !effectiveFreq) {
    if (st === 'initial') return ranges.initial;
    if (st === 'deep') return ranges.deep;
    if (st === 'general') return ranges.general;
    if (st === 'move-in') return ranges.moveInOutBasic;
    if (st === 'move-out') return ranges.moveInOutFull;
  }

  console.warn('[format] getSelectedQuoteRange: no matching column', { serviceType, frequency, st, freqNorm });
  return null;
}

/**
 * Convert a square footage range string to a numeric value using the midpoint of the range.
 * This ensures the value falls inside the correct pricing tier when the options match the pricing chart.
 * - "Less Than 1500" / "0-1500" → 750
 * - "1501-2000" → 1750
 * - "8000+" / "Over 8000" → 8000 (caller can pass maxSqFt for last tier when available)
 */
export function squareFootageRangeToNumber(
  range: string,
  options?: { defaultFallback?: number; maxSqFt?: number }
): number {
  const defaultFallback = options?.defaultFallback ?? 1500;
  const maxSqFt = options?.maxSqFt;

  if (!range || typeof range !== 'string') return defaultFallback;
  const cleaned = range.trim();

  // "Less Than 1500" or "Less Than1500"
  if (cleaned.toLowerCase().includes('less than')) {
    const match = cleaned.match(/\d+/);
    if (match) {
      const max = parseInt(match[0], 10);
      if (!isNaN(max)) return Math.round(max / 2); // midpoint of 0–max
    }
    return 750;
  }

  // "8000+" or "Over 8000" or "Over 8,000 sq ft"
  const noCommas = cleaned.replace(/,/g, '');
  const overMatch = noCommas.match(/^(\d+)\s*\+\s*$/i) || noCommas.match(/^over\s*(\d+)/i);
  if (overMatch) {
    const num = parseInt(overMatch[1], 10);
    if (!isNaN(num)) return typeof maxSqFt === 'number' && maxSqFt > num ? maxSqFt : num;
  }

  // "min-max" range → midpoint
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-').map((p) => parseInt(p.trim(), 10));
    const min = parts[0];
    const max = parts[1];
    if (!isNaN(min) && !isNaN(max) && min <= max) {
      return Math.round((min + max) / 2);
    }
  }

  // Plain number
  const num = parseInt(cleaned, 10);
  return !isNaN(num) ? num : defaultFallback;
}

/**
 * Convert square footage number back to range string for display.
 * Exported so API can always pass an explicit range string to GHL notes.
 */
export function getSquareFootageRangeDisplay(squareFeet: number): string {
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

/**
 * Map numeric square footage to the survey select option value string.
 * Used when pre-filling from property lookup (e.g. Zillow). Matches schema option values.
 */
export function numberToSquareFootageRangeValue(squareFeet: number): string {
  if (squareFeet < 1500) return '0-1500';
  if (squareFeet < 2000) return '1501-2000';
  if (squareFeet < 2500) return '2001-2500';
  if (squareFeet < 3000) return '2501-3000';
  if (squareFeet < 3500) return '3001-3500';
  if (squareFeet < 4000) return '3501-4000';
  if (squareFeet < 4500) return '4001-4500';
  if (squareFeet < 5000) return '4501-5000';
  if (squareFeet < 5500) return '5001-5500';
  if (squareFeet < 6000) return '5501-6000';
  if (squareFeet < 6500) return '6001-6500';
  if (squareFeet < 7000) return '6501-7000';
  if (squareFeet < 7500) return '7001-7500';
  if (squareFeet < 8000) return '7501-8000';
  return '8000+';
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
    // #region agent log
    console.log('[CQ-NOTE-DEBUG]', JSON.stringify({ location: 'format.ts:generateSummaryText', message: 'early return no inputs/ranges', data: { hasInputs: !!inputs, hasRanges: !!ranges }, hypothesisId: 'H2' }));
    // #endregion
    return '';
  }

  const squareFeetDisplay = squareFeetRange || getSquareFootageRangeDisplay(inputs.squareFeet);

  let summary = `✨ YOUR QUOTE\n\n`;
  summary += `Home Size: ${squareFeetDisplay} sq ft\n\n`;

  if (serviceType && (frequency === 'one-time' || !frequency)) {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType, frequency ?? '');

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
    } else {
      summary += `Price could not be determined for the selected service and frequency.\n\n`;
      console.warn('[format] generateSummaryText: selectedRange null for one-time path', { serviceType, frequency });
    }
  } else if (frequency && frequency !== 'one-time') {
    const selectedRange = getSelectedQuoteRange(ranges, serviceType ?? '', frequency);

    if (selectedRange) {
      summary += `🎯 ${freqLabel(labels, frequency)}: ${formatPriceRange(selectedRange)}\n\n`;
    } else {
      summary += `Price could not be determined for the selected service and frequency.\n\n`;
      console.warn('[format] generateSummaryText: selectedRange null for recurring path', { serviceType, frequency });
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

  // #region agent log
  console.log('[CQ-NOTE-DEBUG]', JSON.stringify({ location: 'format.ts:generateSummaryText return', message: 'summary built', data: { summaryLength: summary.length, summaryContainsDollar: summary.includes('$'), serviceType, frequency }, hypothesisId: 'H5' }));
  // #endregion
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
