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
  invoice_no?: string;
  invoice_date?: string;
  customer_id?: number;
  customer_phone?: string;
  delivery_address_id?: number;
  delivery_address?: string;
  notes?: string;
  created_by?: string;
  store?: boolean;
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
  invoice_no?: string;
  invoice_date?: string;
}

export interface StoredInvoice extends InvoiceResult {
  id: number;
  invoice_no: string;
  invoice_date: string;
  customer_id?: number;
  customer_phone?: string;
  delivery_address_id?: number;
  delivery_address?: string;
  status: string;
  deposit_invoice_no?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  phone?: string;
  instagram?: string;
  notes?: string;
  preferences?: Record<string, unknown>;
  tags?: string;
  first_order_date?: string;
  last_order_date?: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerAddress {
  id: number;
  customer_id: number;
  label: string;
  address: string;
  district?: string;
  city?: string;
  postal_code?: string;
  notes?: string;
  is_default: number;
  created_at: string;
}

export interface CustomerEvent {
  id: number;
  customer_id: number;
  event_type: string;
  event_date: string;
  summary?: string;
  invoice_id?: number;
  created_by?: string;
  created_at: string;
}

export interface ApiError {
  error: string;
  code: string;
  field?: string;
}
