import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/admin/download-template
 * 
 * Download an Excel template file with the pricing structure format
 * 
 * Authentication: Send password in header 'x-admin-password'
 */
export async function GET(request: NextRequest) {
  try {
    // Check for password authentication
    const password = request.headers.get('x-admin-password');
    const requiredPassword = process.env.ADMIN_PASSWORD;
    
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing password.' },
        { status: 401 }
      );
    }

    // Create a workbook
    const workbook = XLSX.utils.book_new();

    // Create the header row
    const headers = [
      'Sq Ft Range',
      'Weekly',
      'Bi-Weekly',
      '4 Week',
      'General',
      'Deep',
      'Move In/Out Basic',
      'Move In/Out Full',
    ];

    // Create sample data rows as a template
    const templateData = [
      headers, // Header row
      ['0-1500', '$135-$165', '$150-$180', '$280-$320', '$200-$240', '$300-$360', '$250-$300', '$400-$500'],
      ['1501-2000', '$155-$185', '$170-$200', '$300-$340', '$220-$260', '$320-$380', '$270-$320', '$420-$520'],
      ['2001-2500', '$175-$205', '$190-$220', '$320-$360', '$240-$280', '$340-$400', '$290-$340', '$440-$540'],
      ['2501-3000', '$195-$225', '$210-$240', '$340-$380', '$260-$300', '$360-$420', '$310-$360', '$460-$560'],
      // Add more template rows as needed
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // Sq Ft Range
      { wch: 15 }, // Weekly
      { wch: 15 }, // Bi-Weekly
      { wch: 15 }, // 4 Week
      { wch: 15 }, // General
      { wch: 15 }, // Deep
      { wch: 20 }, // Move In/Out Basic
      { wch: 20 }, // Move In/Out Full
    ];

    // Style header row (bold)
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellAddress]) continue;
      worksheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'FFE0E0E0' } },
        alignment: { horizontal: 'center' },
      };
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return file as download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Pricing_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate template',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
