const XLSX = require('xlsx');

const data = [
    ["Item Name", "Price (IDR)"],
    ["Etoile one", 149000],
    ["Etoile duo", 349000],
    ["Etoile four", 599000],
    ["Christmas Hamper", 850000],
    ["Gingerbread House", 250000]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, "MasterData");

XLSX.writeFile(wb, "mock_master_data.xlsx");
console.log("mock_master_data.xlsx created.");
