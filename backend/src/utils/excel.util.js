const ExcelJS = require('exceljs');

/**
 * Exports data to Excel and sends it directly via Express response
 * @param {Response} res Express response
 * @param {string} fileName Name of file without extension
 * @param {string} sheetName Name of the sheet
 * @param {Array<{header: string, key: string, width: number}>} columns Column definitions
 * @param {Array<Object>} rows Array of row objects
 */
const exportToExcel = async (res, fileName, sheetName, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Shoes Store Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);
  worksheet.columns = columns;

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '1E293B' }, // Slate-800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Add rows
  rows.forEach((row, index) => {
    const addedRow = worksheet.addRow(row);
    addedRow.height = 22;
    // Alternate row zebra striping
    if (index % 2 === 1) {
      addedRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'F8FAFC' },
      };
    }
  });

  // Apply borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
    });
  });

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(fileName)}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = {
  exportToExcel,
};
