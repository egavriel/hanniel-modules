export interface Product {
  name: string;
  price: number;
  template: string;
}

export interface TemplateInfo {
  id: string;
  label: string;
  features: {
    discount: boolean;
    courtesy_adjustment: boolean;
    deposit: boolean;
    item_description: boolean;
    balance_due: boolean;
  };
  product_count: number;
}

export interface InvoiceItem {
  product_id: string;
  quantity: number;
  description?: string;
}

export interface InvoiceInput {
  template: string;
  customer_name: string;
  items: InvoiceItem[];
  delivery_fee?: number;
  discount_rate?: number;
  courtesy_adjustment?: number;
  deposit_paid?: number;
}

export interface InvoiceResultItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  description?: string;
}

export interface InvoiceResult {
  template: string;
  customer_name: string;
  items: InvoiceResultItem[];
  subtotal: number;
  discount_rate: number;
  discount_amount: number;
  courtesy_adjustment: number;
  total_order_value: number;
  delivery_fee: number;
  deposit_paid: number;
  balance_due: number;
  grand_total: number;
  currency: "IDR";
  calculated_at: string;
}

export interface ApiError {
  error: string;
  code: string;
  field?: string;
}
