import type { InvoiceResult } from "./types";

/**
 * Template-specific configuration for the HTML builder.
 * Maps each template to its background image filename, layout tweaks, and additional info.
 */
interface TemplateConfig {
  bgFile: string;
  bgMime: string;
  textColor: string;
  invoiceHeaderVisible: boolean;
  invoiceHeaderMarginTop?: string;
  headerMarginBottom: string;
  footerBottom: string;
  depositSubheader?: string;
  notesHtml?: string;
  additionalInfo?: { phone: string; ig: string };
  additionalInfoBottom?: string;
  isEidhp?: boolean;
  deliveryFeeColor?: string;
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  christmas: {
    bgFile: "invoice_bg.png", bgMime: "image/png", textColor: "#5A4A3A",
    invoiceHeaderVisible: true, headerMarginBottom: "", footerBottom: "360px",
  },
  cny: {
    bgFile: "invoice_bg_chinese.jpeg", bgMime: "image/jpeg", textColor: "#5A4A3A",
    invoiceHeaderVisible: false, headerMarginBottom: "180px", footerBottom: "280px",
    additionalInfo: { phone: "+62 851-9029-9779", ig: "little.hanniel (IG)" },
    additionalInfoBottom: "80px",
  },
  cnyhp: {
    bgFile: "invoice_bg_chinese_hp.jpeg", bgMime: "image/jpeg", textColor: "#5A4A3A",
    invoiceHeaderVisible: true, invoiceHeaderMarginTop: "70px",
    headerMarginBottom: "80px", footerBottom: "300px",
    additionalInfo: { phone: "+62 851-2135-9493", ig: "hanniel.patisserie (IG)" },
    additionalInfoBottom: "110px",
  },
  eid: {
    bgFile: "invoice_bg_eid.png", bgMime: "image/png", textColor: "#5A4A3A",
    invoiceHeaderVisible: false, headerMarginBottom: "180px", footerBottom: "280px",
    additionalInfo: { phone: "+62 851-9029-9779", ig: "little.hanniel (IG)" },
    additionalInfoBottom: "50px",
    deliveryFeeColor: "#3D2E1F",
  },
  eidhp: {
    bgFile: "invoice_bg_eidhp.jpg", bgMime: "image/jpeg", textColor: "#5A4A3A",
    invoiceHeaderVisible: true, invoiceHeaderMarginTop: "70px",
    headerMarginBottom: "80px", footerBottom: "300px",
    isEidhp: true,
    additionalInfo: { phone: "+62 851-2135-9493", ig: "hanniel.patisserie (IG)" },
    additionalInfoBottom: "110px",
  },
  hanniel: {
    bgFile: "invoice_bg_hanniel.png", bgMime: "image/png", textColor: "#5A4A3A",
    invoiceHeaderVisible: false, headerMarginBottom: "150px", footerBottom: "200px",
  },
  "hanniel-dp": {
    bgFile: "invoice_bg_hanniel.png", bgMime: "image/png", textColor: "#5A4A3A",
    invoiceHeaderVisible: false, headerMarginBottom: "150px", footerBottom: "200px",
    depositSubheader: "Deposit Invoice",
    notesHtml: "Custom order will be prepared after deposit confirmation. <br>Remaining payment will be settled before delivery.",
  },
  "hanniel-fi": {
    bgFile: "invoice_bg_hanniel.png", bgMime: "image/png", textColor: "#5A4A3A",
    invoiceHeaderVisible: false, headerMarginBottom: "150px", footerBottom: "140px",
    depositSubheader: "Final Invoice",
    notesHtml: "Thank you for your order. <br>Kindly complete the remaining payment.",
  },
};

function formatIDR(num: number): string {
  return num.toLocaleString("id-ID");
}

function formatInvoiceDate(dateStr: string): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = months[parseInt(parts[1], 10) - 1] ?? parts[1];
  const year = parts[0];
  return `${day} ${month} ${year}`;
}

/**
 * Builds a self-contained HTML string for the invoice, ready for Puppeteer screenshot.
 * The HTML includes inline CSS, embedded fonts (via Google Fonts link), and the
 * background image as a base64 data URI.
 *
 * @param result - The calculated invoice result
 * @param bgBase64 - The background image as a base64-encoded data URI string (e.g., "data:image/png;base64,...")
 */
export function buildInvoiceHtml(result: InvoiceResult, bgBase64: string): string {
  const config = TEMPLATE_CONFIGS[result.template];
  if (!config) throw new Error(`Unknown template: ${result.template}`);

  const isDP = result.template === "hanniel-dp";
  const isFI = result.template === "hanniel-fi";
  const isDPorFI = isDP || isFI;
  const hasDiscount = result.discount_rate > 0;
  const hasCourtesy = result.courtesy_adjustment > 0;
  const showFooter = hasDiscount || hasCourtesy || isDPorFI;

  // Build item rows
  const itemRowsHtml = result.items
    .map((item) => {
      const descriptionHtml =
        isDPorFI && item.description
          ? `<div style="font-style:italic; color:rgba(90,74,58,0.6); font-size:0.85rem; margin-top:2px; font-family:'Karla',sans-serif;">${escapeHtml(item.description)}</div>`
          : "";
      return `
      <tr style="border-bottom:1px solid #D6Cbb3;">
        <td style="padding:1rem 0; text-align:left;">
          <span style="font-family:'DM Serif Display',serif; font-size:1.125rem; font-weight:bold; color:#5A4A3A; display:block; padding-right:1.25em;">${escapeHtml(item.name)}</span>
          ${descriptionHtml}
        </td>
        <td style="padding:1rem 0; text-align:center;"><span style="display:inline-block; width:48px; text-align:center; border-bottom:1px solid rgba(90,74,58,0.15); padding-bottom:1px;">${item.quantity}</span></td>
        <td style="padding:1rem 0; text-align:right; font-family:'Karla',sans-serif; color:rgba(90,74,58,0.8);">${formatIDR(item.unit_price)}</td>
        <td style="padding:1rem 0; text-align:right; font-family:'Karla',sans-serif; font-weight:bold;">${formatIDR(item.line_total)}</td>
      </tr>`;
    })
    .join("\n");

  // Build footer rows (discount, courtesy)
  let footerRowsHtml = "";
  if (showFooter) {
    if (hasDiscount) {
      const discountLabel = `Special Discount (${Math.round(result.discount_rate * 100)}%)`;
      footerRowsHtml += `
      <tr style="border-top:1px solid #B0A090;">
        <td style="padding:0.5rem 0; text-align:left; font-weight:bold; font-family:'DM Serif Display',serif; font-style:italic;">${discountLabel}</td>
        <td></td>
        <td></td>
        <td style="padding:0.5rem 0; text-align:right; font-family:'Karla',sans-serif; font-weight:bold; color:#dc2626;">-${formatIDR(result.discount_amount)}</td>
      </tr>`;
    }
    if (hasCourtesy && isDPorFI) {
      footerRowsHtml += `
      <tr style="border-top:1px solid #B0A090;">
        <td style="padding:0.5rem 0; text-align:left; font-weight:bold; font-family:'DM Serif Display',serif; font-style:italic;">Courtesy Adjustment</td>
        <td></td>
        <td></td>
        <td style="padding:0.5rem 0; text-align:right; font-family:'Karla',sans-serif; font-weight:bold; color:#dc2626;">-${formatIDR(result.courtesy_adjustment)}</td>
      </tr>`;
    }
  }

  // Notes section (DP/FI only)
  const notesHtml =
    isDPorFI && config.notesHtml
      ? `<div style="margin-top:16px; padding:0 8px; color:#8B7355; font-family:'Karla',sans-serif;">
          <h3 style="font-weight:bold; font-size:1.125rem; margin-bottom:8px;">Notes:</h3>
          <p style="margin-bottom:16px; line-height:1.625;">${config.notesHtml}</p>
          <hr style="border-color:#B0A090; margin-bottom:16px;">
        </div>`
      : "";

  // Order Value, Deposit, Balance Due (DP/FI only)
  let dpFiFieldsHtml = "";
  if (isDPorFI) {
    dpFiFieldsHtml += `
    <div style="display:flex; align-items:center; gap:8px; font-size:1.25rem; font-weight:bold; color:#8B7355; margin-bottom:8px;">
      <span>Total Order</span>
      <span style="display:inline-block; width:128px; text-align:right;">${formatIDR(result.total_order_value)}</span>
    </div>`;

    if (result.deposit_paid > 0) {
      const depositLabel = isFI ? "Deposit Paid" : "Deposit";
      dpFiFieldsHtml += `
      <div style="display:flex; align-items:center; gap:8px; font-size:1.25rem; font-weight:bold; color:#8B7355; margin-bottom:8px;">
        <span>${depositLabel}</span>
        <span style="display:inline-block; width:128px; text-align:right;">${formatIDR(result.deposit_paid)}</span>
      </div>`;
    }

    if (isFI) {
      dpFiFieldsHtml += `
      <div style="display:flex; align-items:center; gap:8px; font-size:1.25rem; font-weight:bold; color:#8B7355; margin-bottom:16px;">
        <span>Balance Due</span>
        <span style="display:inline-block; width:128px; text-align:right;">${formatIDR(result.balance_due)}</span>
      </div>`;
    }
  }

  // Additional information section
  let additionalInfoHtml = "";
  if (config.additionalInfo) {
    additionalInfoHtml = `
    <div style="position:absolute; bottom:${config.additionalInfoBottom}; left:48px; color:${config.deliveryFeeColor || "#8B7355"}; font-family:'Karla',sans-serif; z-index:20;">
      <h3 style="font-weight:bold; font-size:1.125rem; margin-bottom:4px;">ADDITIONAL INFORMATION:</h3>
      <p style="font-size:1rem;">${config.additionalInfo.phone}</p>
      <p style="font-size:1rem;">${config.additionalInfo.ig}</p>
    </div>`;
  }

  // EIDHP overlay + border
  let eidhpOverlayHtml = "";
  if (config.isEidhp) {
    eidhpOverlayHtml = `
    <div style="position:absolute; top:0; left:0; right:0; bottom:0; background-color:rgba(255,255,255,0.5); z-index:1; pointer-events:none;"></div>
    <div style="position:absolute; top:16px; left:16px; right:16px; bottom:16px; border:3px solid #2D6A4F; border-radius:24px; z-index:2; pointer-events:none;"></div>`;
  }

  const contentZIndex = config.isEidhp ? "position:relative; z-index:3;" : "";
  const deliveryFeeStyle = config.deliveryFeeColor ? `color:${config.deliveryFeeColor};` : "color:#8B7355;";

  // Invoice header
  const invoiceHeaderHtml = config.invoiceHeaderVisible
    ? `<h1 style="font-size:3.75rem; font-family:'DM Serif Display',serif; color:#5A4A3A; ${config.invoiceHeaderMarginTop ? `margin-top:${config.invoiceHeaderMarginTop};` : ""}">INVOICE</h1>`
    : `<h1 style="font-size:3.75rem; font-family:'DM Serif Display',serif; color:#5A4A3A; visibility:hidden;">INVOICE</h1>`;

  // Deposit subheader
  const depositSubheaderHtml = config.depositSubheader
    ? `<div style="font-size:1.5rem; font-weight:bold; text-align:right; transform:translateX(-105px);">${config.depositSubheader}</div>`
    : "";

  // Invoice metadata (invoice_no and invoice_date)
  let invoiceMetaHtml = "";
  if (result.invoice_no || result.invoice_date) {
    const formattedDate = result.invoice_date
      ? formatInvoiceDate(result.invoice_date)
      : "";
    invoiceMetaHtml = `
      <div style="margin-top:8px; display:flex; justify-content:flex-end; font-family:'Karla',sans-serif;">
        <div style="display:grid; grid-template-columns:auto auto auto; column-gap:6px; row-gap:4px; font-size:0.85rem; align-items:baseline;">
          ${result.invoice_no ? `<span style="font-weight:500; color:#666; text-align:left;">Invoice No.</span><span style="font-weight:600; color:#444;">:</span><span style="font-weight:600; color:#444;">${escapeHtml(result.invoice_no)}</span>` : ""}
          ${formattedDate ? `<span style="font-weight:500; color:#666; text-align:left;">Invoice Date</span><span style="font-weight:600; color:#444;">:</span><span style="font-weight:600; color:#444;">${formattedDate}</span>` : ""}
        </div>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Karla:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Karla', sans-serif; }
    .invoice-container {
      width: 794px;
      height: 1123px;
      position: relative;
      background-color: #F5F0E6;
      background-image: url('${bgBase64}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      color: ${config.textColor};
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-top: 1px solid #B0A090; border-bottom: 1px solid #B0A090; }
    thead th { padding: 8px 0; font-size: 1.125rem; font-weight: bold; }
  </style>
</head>
<body>
  <div class="invoice-container">
    ${eidhpOverlayHtml}
    <div style="padding:48px; height:100%; display:flex; flex-direction:column; ${contentZIndex}">
      <!-- Header -->
      <div style="margin-bottom:${config.headerMarginBottom || "48px"}; text-align:right;">
        ${invoiceHeaderHtml}
        ${depositSubheaderHtml}
        ${invoiceMetaHtml}
      </div>

      <!-- Info Section -->
      <div style="display:flex; justify-content:space-between; margin-bottom:32px;">
        <!-- Bill To -->
        <div style="width:33%;">
          <h3 style="font-weight:bold; text-transform:uppercase; letter-spacing:0.1em; font-size:0.875rem; margin-bottom:16px;">BILL TO:</h3>
          <div>
            <span style="font-family:'Karla',sans-serif; font-size:1.125rem; display:block; width:100%; border-bottom:1px solid rgba(90,74,58,0.3); padding-bottom:2px;">${escapeHtml(result.customer_name)}</span>
          </div>
        </div>

        <!-- Payment Account -->
        <div style="width:50%; padding-left:40px;">
          <div style="text-align:left;">
            <h3 style="font-weight:bold; text-transform:uppercase; letter-spacing:0.1em; font-size:0.875rem; margin-bottom:16px;">PAYMENT ACCOUNT:</h3>
            <div style="display:grid; grid-template-columns:auto 1fr; column-gap:8px; row-gap:16px; font-size:0.875rem; margin-top:4px;">
              <span style="white-space:nowrap;">Account Name</span>
              <span style="font-weight:bold; text-align:left; white-space:nowrap;">: HANNIEL KAIROS INDONESIA</span>
              <span style="white-space:nowrap;">Account No (BCA)</span>
              <span style="font-weight:bold; text-align:left;">: 719 531 6091</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div style="flex:1;">
        <table>
          <thead>
            <tr>
              <th style="text-align:left; width:41.67%;">Item</th>
              <th style="text-align:center; width:16.67%;">Qty</th>
              <th style="text-align:right; width:16.67%; line-height:1.25;">Unit<br><span style="font-size:0.875rem;">(IDR)</span></th>
              <th style="text-align:right; width:25%; line-height:1.25;">Total<br><span style="font-size:0.875rem;">(IDR)</span></th>
            </tr>
          </thead>
          <tbody style="font-size:1.125rem;">
            ${itemRowsHtml}
          </tbody>
          ${showFooter ? `<tfoot style="font-size:1.125rem;">${footerRowsHtml}</tfoot>` : ""}
        </table>
      </div>

<!-- Notes + DP/FI Fields side by side -->
      ${isDPorFI && notesHtml
        ? `<div style="margin-top:16px; color:#8B7355; font-family:'Karla',sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:48px;">
              <!-- Left: Notes -->
              <div style="flex:1;">
                <h3 style="font-weight:bold; font-size:1.125rem; margin-bottom:8px;">Notes:</h3>
                <p style="margin-bottom:16px; line-height:1.625;">${config.notesHtml}</p>
              </div>
              <!-- Right: DP/FI Fields -->
              <div style="text-align:right;">
                ${dpFiFieldsHtml}
              </div>
            </div>
            <hr style="border-color:#B0A090; margin-top:8px;">
          </div>`
        : notesHtml}

      <!-- Footer -->
      <div style="position:absolute; bottom:${config.footerBottom}; left:0; width:100%; padding:0 48px; z-index:20;">
        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
          <!-- Delivery Fee -->
          <div style="display:flex; align-items:center; gap:8px; font-size:1.25rem; font-weight:bold; ${deliveryFeeStyle} margin-bottom:8px;">
            <span>Delivery Fee</span>
            <span style="display:inline-block; width:96px; border-bottom:1px solid #8B7355; text-align:right; padding-bottom:2px;">${formatIDR(result.delivery_fee)}</span>
          </div>

          <!-- Right Column -->
          <div style="display:flex; flex-direction:column; align-items:flex-end;">
            <!-- Grand Total Box -->
            <div style="background-color:#D6Cbb3; padding:12px 24px; min-width:300px; display:flex; justify-content:space-between; align-items:center; font-weight:bold; font-size:1.25rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
              <span>GRAND TOTAL</span>
              <span>${formatIDR(result.grand_total)}</span>
            </div>
          </div>
        </div>
      </div>

      ${additionalInfoHtml}

      <!-- Bottom spacer -->
      <div style="height:192px; width:100%;"></div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns the background image filename and MIME type for a given template.
 */
export function getBackgroundInfo(template: string): { file: string; mime: string } | null {
  const config = TEMPLATE_CONFIGS[template];
  if (!config) return null;
  return { file: config.bgFile, mime: config.bgMime };
}
