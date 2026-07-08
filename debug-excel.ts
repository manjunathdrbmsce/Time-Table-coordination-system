import * as XLSX from "xlsx";
import * as fs from "fs";

// Read the uploaded Excel file - user should provide path
const workbook = XLSX.readFile("./test-upload.xlsx");
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

console.log("First 10 rows of Excel data:");
for (let i = 0; i < Math.min(10, data.length); i++) {
  const row = data[i];
  if (row && row.length > 0) {
    console.log(`Row ${i}:`, JSON.stringify(row));
  }
}
