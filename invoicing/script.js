let masterData = (typeof MASTER_DATA !== 'undefined') ? MASTER_DATA : {}; // Populated from master_data.js or fallback
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
    updateAllDropdowns();
    addItemRow();
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
    const footerPositioning = document.getElementById('footer-positioning-container');

    if (templateId === 'hanniel') {
        invoiceHeader.style.visibility = 'hidden';
        // Increase spacing for Little Hanniel template
        // ADJUST HEADER SPACING HERE (default is usually around 48px/3rem)
        headerSection.style.marginBottom = '150px';
        if (footerPositioning) footerPositioning.style.bottom = '200px';
    } else {
        invoiceHeader.style.visibility = 'visible';
        headerSection.style.marginBottom = ''; // Reverts to CSS default (mb-12)
        if (footerPositioning) footerPositioning.style.bottom = '360px';
    }
    updateAllDropdowns();
}

// CSV loading removed in favor of JS data sync

function updateAllDropdowns() {
    const selects = document.querySelectorAll('.item-select');
    selects.forEach(select => {
        const currentValue = select.value;
        const filteredItems = Object.keys(masterData).filter(key => masterData[key].template === currentTemplate);
        const optionsHtml = `<option value="">Select Item</option>` +
            filteredItems.map(key => `<option value="${key}">${masterData[key].name || textFromKey(key)}</option>`).join('');
        select.innerHTML = optionsHtml;
        select.value = currentValue; // Try to restore selection

        // Refresh the row data (price and total) in case master data changed
        if (select.value) {
            updateRow(select);
        }
    });
}

function textFromKey(key) {
    return key.includes('::') ? key.split('::')[0] : key;
}

function addItemRow() {
    const tbody = document.getElementById('invoiceItems');
    const tr = document.createElement('tr');

    // Create Dropdown Options
    const filteredItems = Object.keys(masterData).filter(key => masterData[key].template === currentTemplate);
    const options = filteredItems.map(key => `<option value="${key}">${masterData[key].name || textFromKey(key)}</option>`).join('');

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

    // Calculate Discount
    const discountSelect = document.getElementById('specialDiscount');
    const discountRate = parseFloat(discountSelect ? discountSelect.value : 0);
    const discountAmount = subtotal * discountRate;

    // Update Discount Display and Label
    const discountDisplay = document.getElementById('discountValue');
    const discountLabel = document.getElementById('discountLabel');

    if (discountDisplay) {
        discountDisplay.textContent = '-' + formatIDR(discountAmount);
    }
    if (discountLabel && discountSelect) {
        const selectedText = discountSelect.options[discountSelect.selectedIndex].text;
        if (discountRate > 0) {
            discountLabel.textContent = `Special Discount (${selectedText})`;
        } else {
            discountLabel.textContent = 'Special Discount';
        }
    }

    const grandTotal = subtotal - discountAmount + ongkir;

    document.getElementById('grandTotal').textContent = formatIDR(grandTotal);
}

function toggleDiscountRow() {
    const discountSelect = document.getElementById('specialDiscount');
    const footer = document.getElementById('invoiceFooter');

    if (discountSelect && footer) {
        if (parseFloat(discountSelect.value) > 0) {
            footer.classList.remove('hidden');
        } else {
            footer.classList.add('hidden');
        }
    }
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
    if (!invoice) return;

    // The wrapper is the direct parent of invoice-capture
    const wrapper = invoice.parentElement;
    const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    const standardWidth = 794; // Invoice fixed width
    const padding = 32; // Body padding (approx)

    if (width < standardWidth + padding) {
        // Calculate scale needed to fit width
        // Use 0.98 factor to ensure safe margin and prevent rounding jitter
        const scale = ((width - padding) / standardWidth) * 0.98;

        // Apply scale
        invoice.style.transform = `scale(${scale})`;
        invoice.style.transformOrigin = 'top left';

        // Adjust wrapper dimensions to fit scaled content
        // Height needs adjustment because scale doesn't affect flow layout
        if (invoice.scrollHeight > 0) {
            wrapper.style.height = `${invoice.scrollHeight * scale}px`;
        }
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

// Robust Initialization
function initScaling() {
    adjustInvoiceScale();
    // Multiple checks for mobile loading states
    setTimeout(adjustInvoiceScale, 100);
    setTimeout(adjustInvoiceScale, 300);
}

// Add listeners for scaling
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScaling);
} else {
    initScaling();
}
window.addEventListener('load', initScaling);
window.addEventListener('resize', adjustInvoiceScale);
window.addEventListener('orientationchange', function () {
    setTimeout(adjustInvoiceScale, 100);
});

// Also adjust when template switches as content height might change
const originalSwitchTemplate = switchTemplate;
switchTemplate = function (templateId) {
    originalSwitchTemplate(templateId);
    setTimeout(adjustInvoiceScale, 50); // Small delay for DOM updates
};
