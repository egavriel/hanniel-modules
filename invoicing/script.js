let masterData = {}; // Will be populated from CSV
let currentTemplate = 'christmas'; // Track current template for item filtering

// Template Configurations
const templates = {
    "christmas": {
        name: "Christmas 2025",
        background: (typeof christmasBgBase64 !== 'undefined') ? `url('${christmasBgBase64}')` : "url('invoice_bg.png')",
        textColor: "#5A4A3A"
    },
    "hanniel": {
        name: "Little Hanniel",
        background: (typeof hannielBgBase64 !== 'undefined') ? `url('${hannielBgBase64}')` : "url('invoice_bg_hanniel.png')",
        textColor: "#000000"
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadMasterData();
    switchTemplate('christmas'); // Default template
});

function switchTemplate(templateId) {
    currentTemplate = templateId;
    const config = templates[templateId];
    if (!config) return;

    const captureArea = document.getElementById('invoice-capture');

    // Update background
    if (config.background.startsWith('url')) {
        captureArea.style.backgroundImage = config.background;
        captureArea.style.backgroundColor = 'transparent';
    } else {
        captureArea.style.backgroundImage = 'none';
        captureArea.style.backgroundColor = config.background;
    }

    // Update text color
    captureArea.style.color = config.textColor;

    // Toggle INVOICE header visibility & Spacing
    const invoiceHeader = document.getElementById('invoice-header');
    const headerSection = document.getElementById('header-section');

    if (templateId === 'hanniel') {
        invoiceHeader.style.visibility = 'hidden';
        // Increase spacing for Little Hanniel template
        // ADJUST HEADER SPACING HERE (default is usually around 48px/3rem)
        headerSection.style.marginBottom = '150px';
    } else {
        invoiceHeader.style.visibility = 'visible';
        headerSection.style.marginBottom = ''; // Reverts to CSS default (mb-12)
    }
    updateAllDropdowns();
}

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
                "Etoile one": { price: 149000, template: 'christmas' },
                "Etoile duo": { price: 349000, template: 'christmas' },
                "Etoile four": { price: 599000, template: 'christmas' },
                "Christmas Hampers Tin": { price: 159000, template: 'christmas' },
                "Double choco oat": { price: 70000, template: 'hanniel' },
                "Raisin oat": { price: 70000, template: 'hanniel' },
                "Almond choco oat": { price: 70000, template: 'hanniel' },
                "Strawberry overnight oats": { price: 38000, template: 'hanniel' },
                "Double choco overnight oats": { price: 38000, template: 'hanniel' },
                "Tiramisu overnight oats": { price: 38000, template: 'hanniel' }
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

        // Parse Name,Price,Template
        const parts = line.split(',');
        if (parts.length >= 3) {
            const template = parts[parts.length - 1].trim();
            const priceStr = parts[parts.length - 2].trim();
            const name = parts.slice(0, parts.length - 2).join(',').trim();
            const price = parseFloat(priceStr);

            if (name && !isNaN(price)) {
                masterData[name] = { price, template };
            }
        }
    }
}



function updateAllDropdowns() {
    const selects = document.querySelectorAll('.item-select');
    selects.forEach(select => {
        const currentValue = select.value;
        const filteredItems = Object.keys(masterData).filter(key => masterData[key].template === currentTemplate);
        const optionsHtml = `<option value="">Select Item</option>` +
            filteredItems.map(key => `<option value="${key}">${key}</option>`).join('');
        select.innerHTML = optionsHtml;
        select.value = currentValue; // Try to restore selection
    });
}

function addItemRow() {
    const tbody = document.getElementById('invoiceItems');
    const tr = document.createElement('tr');

    // Create Dropdown Options
    const filteredItems = Object.keys(masterData).filter(key => masterData[key].template === currentTemplate);
    const options = filteredItems.map(key => `<option value="${key}">${key}</option>`).join('');

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
    const itemData = masterData[itemName];
    const price = itemData ? itemData.price : 0;

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

            // Hide dropdown arrows for the snapshot
            const selects = clonedDoc.querySelectorAll('.item-select');
            selects.forEach(el => {
                el.style.backgroundImage = 'none';
                el.style.paddingRight = '0'; // align text nicely without the arrow gap
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

// Mobile Scaling Logic
function adjustInvoiceScale() {
    const invoice = document.getElementById('invoice-capture');
    // The wrapper is the direct parent of invoice-capture
    const wrapper = invoice.parentElement;
    const width = window.innerWidth;
    const standardWidth = 794; // Invoice fixed width
    const padding = 32; // Body padding (approx)

    if (width < standardWidth + padding) {
        // Calculate scale needed to fit width
        const scale = (width - padding) / standardWidth;

        // Apply scale
        invoice.style.transform = `scale(${scale})`;
        invoice.style.transformOrigin = 'top left';

        // Adjust wrapper dimensions to fit scaled content
        // Height needs adjustment because scale doesn't affect flow layout
        wrapper.style.height = `${invoice.scrollHeight * scale}px`;
        wrapper.style.width = `${standardWidth * scale}px`;
        wrapper.style.overflow = 'hidden'; // Hide original overflow
    } else {
        // Reset Scaling for Desktop
        invoice.style.transform = 'none';
        wrapper.style.height = ''; // Auto
        wrapper.style.width = '100%'; // Full width container
        wrapper.style.overflow = 'auto'; // allow scroll if needed on large screens
    }
}

// Add listeners for scaling
window.addEventListener('load', adjustInvoiceScale);
window.addEventListener('resize', adjustInvoiceScale);
// Also adjust when template switches as content height might change
const originalSwitchTemplate = switchTemplate;
switchTemplate = function (templateId) {
    originalSwitchTemplate(templateId);
    setTimeout(adjustInvoiceScale, 50); // Small delay for DOM updates
};

