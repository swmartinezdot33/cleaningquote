import * as XLSX from 'xlsx';

/**
 * Generate a minimal pricing Excel template buffer for download.
 * Used by download-template routes so the build and runtime never depend on a file on disk.
 */
export function generatePricingTemplateBuffer(): Buffer {
  const headerRow = [
    'SqFt Range',
    'Weekly',
    'Bi-Weekly',
    '4 Week',
    'General',
    'Deep',
    'Move in/out BASIC',
    'Move in/out FULL',
  ];
  const sampleRow = [
    'Less Than 1500',
    '$55-$75',
    '$75-$95',
    '$100-$120',
    '$150-$200',
    '$200-$250',
    '$200-$275',
    '$300-$350',
  ];
  const data: (string | number)[][] = [headerRow, sampleRow];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buffer);
}
