let masterData = {}; // Will be populated from CSV

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMasterData();
});

function loadMasterData() {
    fetch('master_data.csv')
        .then(response => response.text())
        .then(csvText => {
            parseCSV(csvText);
            updateAllDropdowns();
            addItemRow(); // Add first row after data is loaded
        })
        .catch(error => {
            console.error('Error loading master data:', error);
            // Fallback default data if fetch fails (e.g. local file system without server)
            masterData = {
                "Ètoile one": 149000,
                "Ètoile duo": 349000
            };
            updateAllDropdowns();
            addItemRow();
            // alert('Note: using fallback data. Ensure you are running on a server to load master_data.csv');
        });
}

function parseCSV(text) {
    const lines = text.split('\n');
    masterData = {};

    // Skip header row (index 0), start from 1
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse assuming "Name,Price" structure
        // Handle cases where name might contain comma? For simple case start with splitting by last comma
        const lastCommaIndex = line.lastIndexOf(',');
        if (lastCommaIndex === -1) continue;

        const name = line.substring(0, lastCommaIndex).trim();
        const priceStr = line.substring(lastCommaIndex + 1).trim();
        const price = parseFloat(priceStr);

        if (name && !isNaN(price)) {
            masterData[name] = price;
        }
    }
}



function updateAllDropdowns() {
    const selects = document.querySelectorAll('.item-select');
    selects.forEach(select => {
        const currentValue = select.value;
        const optionsHtml = `<option value="">Select Item</option>` +
            Object.keys(masterData).map(key => `<option value="${key}">${key}</option>`).join('');
        select.innerHTML = optionsHtml;
        select.value = currentValue; // Try to restore selection
    });
}

function addItemRow() {
    const tbody = document.getElementById('invoiceItems');
    const tr = document.createElement('tr');

    // Create Dropdown Options
    const options = Object.keys(masterData).map(key => `<option value="${key}">${key}</option>`).join('');

    tr.innerHTML = `
        <td>
            <select class="item-select" onchange="updateRow(this)">
                <option value="">Select Item</option>
                ${options}
            </select>
        </td>
        <td class="text-center">
            <input type="number" class="w-12 text-center bg-transparent border-b border-[#5A4A3A]/20 focus:outline-none" value="1" min="1" oninput="updateRow(this)">
        </td>
        <td class="text-right font-karla text-[#5A4A3A]/80 unit-price">0</td>
        <td class="text-right font-karla font-bold row-total">0</td>
        <td class="text-center print:hidden pl-4">
            <button onclick="removeRow(this)" class="bg-red-100 hover:bg-red-200 text-red-700 font-bold py-1 px-3 rounded text-xs tracking-wider uppercase transition-colors">Delete</button>
        </td>
    `;
    tbody.appendChild(tr);
}

function removeRow(btn) {
    btn.closest('tr').remove();
    calculateGrandTotal();
}

function updateRow(element) {
    const row = element.closest('tr');
    const select = row.querySelector('.item-select');
    const qtyInput = row.querySelector('input[type="number"]');
    const unitDisplay = row.querySelector('.unit-price');
    const totalDisplay = row.querySelector('.row-total');

    const itemName = select.value;
    const qty = parseInt(qtyInput.value) || 0;
    const price = masterData[itemName] || 0;

    unitDisplay.textContent = formatIDR(price);

    const total = qty * price;
    totalDisplay.dataset.value = total; // Store raw value for calc
    totalDisplay.textContent = formatIDR(total);

    calculateGrandTotal();
}

function calculateGrandTotal() {
    const totals = document.querySelectorAll('.row-total');
    let subtotal = 0;
    totals.forEach(el => {
        subtotal += parseFloat(el.dataset.value || 0);
    });

    const ongkirInput = document.getElementById('ongkirInput');
    const ongkir = parseFloat(ongkirInput.value) || 0;

    const grandTotal = subtotal + ongkir;

    document.getElementById('grandTotal').textContent = formatIDR(grandTotal);
}

function formatIDR(num) {
    return num.toLocaleString('id-ID');
}

function generateInvoice() {
    const captureArea = document.getElementById('invoice-capture');

    // Temporarily hide controls or specific styles if needed (print:hidden handles most)

    if (typeof html2canvas === 'undefined') {
        alert('Error: html2canvas library is not loaded.');
        return;
    }

    html2canvas(captureArea, {
        scale: 1.5, // Reduced from 2 to optimize size
        useCORS: true,
        backgroundColor: '#ffffff', // Ensure white background for JPEG
        onclone: (clonedDoc) => {
            // Find all elements with 'print:hidden' class in the cloned document
            const hiddenElements = clonedDoc.querySelectorAll('.print\\:hidden');
            hiddenElements.forEach(el => {
                el.style.display = 'none';
            });
        }
    }).then(canvas => {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;

            const link = document.createElement('a');
            link.download = `Invoice_${document.getElementById('billName').value || 'Unamed'}_${timestamp}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.8); // JPEG format with 0.8 quality
            link.click();
        } catch (e) {
            console.error(e);
            alert('Error creating download link: ' + e.message);
        }
    }).catch(err => {
        console.error(err);
        alert('Error generating invoice: ' + err.message);
    });
}
