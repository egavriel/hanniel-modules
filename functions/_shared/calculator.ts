import type { InvoiceInput, InvoiceResult, InvoiceResultItem, ApiError } from "./types";
import { getProductById, isValidTemplate, type CatalogEnv } from "./catalog";

export type CalculateResult =
  | { ok: true; result: InvoiceResult }
  | { ok: false; error: ApiError };

export async function calculateInvoice(env: CatalogEnv, input: InvoiceInput): Promise<CalculateResult> {
  // Validate template
  if (!input.template || !(await isValidTemplate(env, input.template))) {
    return { ok: false, error: { error: "Unknown template", code: "INVALID_TEMPLATE", field: "template" } };
  }

  if (!input.customer_name || input.customer_name.trim() === "") {
    return { ok: false, error: { error: "customer_name is required", code: "MISSING_CUSTOMER_NAME", field: "customer_name" } };
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { ok: false, error: { error: "items must be a non-empty array", code: "MISSING_ITEMS", field: "items" } };
  }

  const resolvedItems: InvoiceResultItem[] = [];

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    const product = await getProductById(env, item.product_id);
    if (!product) {
      return {
        ok: false,
        error: { error: `Unknown product_id: ${item.product_id}`, code: "PRODUCT_NOT_FOUND", field: `items[${i}].product_id` },
      };
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return {
        ok: false,
        error: { error: `quantity must be a positive integer`, code: "INVALID_QUANTITY", field: `items[${i}].quantity` },
      };
    }
    if (product.template !== input.template) {
      return {
        ok: false,
        error: {
          error: `Product "${item.product_id}" belongs to template "${product.template}", not "${input.template}"`,
          code: "PRODUCT_TEMPLATE_MISMATCH",
          field: `items[${i}].product_id`,
        },
      };
    }
    resolvedItems.push({
      product_id: item.product_id,
      name: product.name,
      quantity: item.quantity,
      unit_price: product.price,
      line_total: product.price * item.quantity,
      ...(item.description !== undefined ? { description: item.description } : {}),
    });
  }

  const subtotal = resolvedItems.reduce((sum, it) => sum + it.line_total, 0);
  const discountRate = input.discount_rate ?? 0;
  const discountAmount = Math.round(subtotal * discountRate);
  const courtesyAdjustment = input.courtesy_adjustment ?? 0;
  const deliveryFee = input.delivery_fee ?? 0;
  const depositPaid = input.deposit_paid ?? 0;

  const totalOrderValue = subtotal - discountAmount - courtesyAdjustment;

  let grandTotal: number;
  let balanceDue: number;

  if (input.template === "hanniel-dp") {
    // DP: grand_total = deposit_paid
    grandTotal = depositPaid;
    balanceDue = 0;
  } else if (input.template === "hanniel-fi") {
    // FI: balance_due = total_order_value - deposit_paid, grand_total = balance_due + delivery_fee
    balanceDue = totalOrderValue - depositPaid;
    grandTotal = balanceDue + deliveryFee;
  } else {
    // Standard: grand_total = subtotal - discount + delivery_fee
    grandTotal = subtotal - discountAmount + deliveryFee;
    balanceDue = 0;
  }

  return {
    ok: true,
    result: {
      template: input.template,
      customer_name: input.customer_name,
      items: resolvedItems,
      subtotal,
      discount_rate: discountRate,
      discount_amount: discountAmount,
      courtesy_adjustment: courtesyAdjustment,
      total_order_value: totalOrderValue,
      delivery_fee: deliveryFee,
      deposit_paid: depositPaid,
      balance_due: balanceDue,
      grand_total: grandTotal,
      currency: "IDR",
      calculated_at: new Date().toISOString(),
    },
  };
}
