import * as XLSX from 'xlsx';

export async function loadExcel(url) {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function parseINVR(rows) {
  return rows.map(r => ({
    projectName: r['Project Name'] || '',
    companyName: r['Sales Org Name'] || '',
    unitNumber: r['Unit Number'] || '',
    unitDesc: r['Unit Description'] || '',
    status: r['Status'] || '',
    floor: r['Floor'] || '',
    bhk: r['BHK'] || '',
    tower: r['Tower'] || '',
    superArea: Number(r['Super Builtup Area']) || 0,
    carpetArea: Number(r['Carpet Area']) || 0,
    totalSuperArea: Number(r['Total Super Area']) || 0,
    netBasicPrice: Number(r['Net Basic Price']) || 0,
    totalUnitCost: Number(r['Total Unit Cost']) || 0,
  }));
}

export function parsePDRN(rows) {
  return rows.map(r => {
    const bd = r['SFDC Booking Date'];
    let date = null, month = '', year = 0;
    if (bd) {
      date = bd instanceof Date ? bd : new Date(bd);
      if (!isNaN(date)) {
        month = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
        year = date.getFullYear();
      }
    }
    return {
      companyName: r['Company Name'] || '',
      projectName: r['Project Name'] || '',
      bookingStatus: r['Booking Status'] || '',
      unitNo: r['Unit No.'] || '',
      unitCode: r['Unit Code'] || '',
      superArea: Number(r['Super Area']) || 0,
      carpet: Number(r['Carpet']) || 0,
      tower: String(r['Tower'] || ''),
      floor: String(r['Floor'] || ''),
      bhk: String(r['BHK'] || ''),
      totalBSP: Number(r['Total Basic Selling Price']) || 0,
      netBSP: Number(r['Total BSP Net Value']) || 0,
      tcv: Number(r['TCV (With Tax)']) || 0,
      totalDemand: Number(r['Total Demand Amount']) || 0,
      totalReceived: Number(r['Total Received']) || 0,
      month,
      year,
      customerName: r['Latest Customer Name'] || '',
      brokerName: r['Broker Name (SFDC)'] || '',
    };
  });
}
