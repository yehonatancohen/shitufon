import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as utils from './Util';

// Function to parse Excel file and extract raw data
function parseExcelFile(filePath: string): any[] {
    // Read the Excel file
    const workbook: XLSX.WorkBook = XLSX.readFile(filePath);

    // Assume you want to read the first sheet
    const sheetName: string = workbook.SheetNames[0];

    // Parse the data from the sheet
    const parsedData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    return parsedData;
}

async function extractPhoneNumbers(excelFile: string, phoneNumberColumn: string): Promise<string[]> {
    let parsedData: any[]
    try
    {
        parsedData = await parseExcelFile(excelFile);
    } catch (e: any) {
        console.error(`Failed to parse Excel file "${excelFile}"`);
        return e;
    }
    // Check if the specified phone number column exists in the parsed data
    if (!parsedData[0].includes(phoneNumberColumn)) {
        console.error(`Column "${phoneNumberColumn}" not found in the Excel file.`);
        return [];
    }

    // Find the index of the specified phone number column
    const phoneNumberIndex: number = parsedData[0].indexOf(phoneNumberColumn);

    // Extract phone numbers from each row in the data
    const phoneNumbers: string[] = parsedData.slice(1).map(row => row[phoneNumberIndex]);

    return utils.formatParticipants(phoneNumbers);
}

// Example usage:

async function run() {
    const filePath: string = 'numbers.xlsx';
    const jsonData: string[] = await extractPhoneNumbers(filePath, "phone");
    console.log('Parsed Excel data:', jsonData);
}

export { extractPhoneNumbers };
