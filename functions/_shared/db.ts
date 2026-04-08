import type { InvoiceResult, StoredInvoice, Customer, CustomerAddress, CustomerEvent } from "./types";

// --- Invoice Number Generation ---

export async function generateInvoiceNo(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const result = await db
    .prepare(
      `INSERT INTO invoice_sequences (year, last_seq) VALUES (?1, 1)
       ON CONFLICT(year) DO UPDATE SET last_seq = last_seq + 1
       RETURNING last_seq`
    )
    .bind(year)
    .first<{ last_seq: number }>();

  const seq = result!.last_seq;
  return `LH-${year}-${String(seq).padStart(4, "0")}`;
}

// --- Invoice Operations ---

interface CreateInvoiceOpts {
  result: InvoiceResult;
  customer_id?: number;
  customer_phone?: string;
  delivery_address_id?: number;
  delivery_address?: string;
  deposit_invoice_no?: string;
  notes?: string;
  created_by?: string;
}

export async function createInvoice(db: D1Database, opts: CreateInvoiceOpts): Promise<StoredInvoice> {
  const invoiceNo = await generateInvoiceNo(db);
  const invoiceDate = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  const r = opts.result;

  // Validate deposit reference if provided
  if (opts.deposit_invoice_no) {
    const dep = await db
      .prepare("SELECT invoice_no, template FROM invoices WHERE invoice_no = ?1")
      .bind(opts.deposit_invoice_no)
      .first<{ invoice_no: string; template: string }>();
    if (!dep) throw new Error(`Deposit invoice ${opts.deposit_invoice_no} not found`);
    if (dep.template !== "hanniel-dp") throw new Error(`Invoice ${opts.deposit_invoice_no} is not a deposit invoice`);
    const existing = await db
      .prepare("SELECT invoice_no FROM invoices WHERE deposit_invoice_no = ?1")
      .bind(opts.deposit_invoice_no)
      .first();
    if (existing) throw new Error(`Deposit ${opts.deposit_invoice_no} already settled`);
  }

  // Insert invoice
  await db
    .prepare(
      `INSERT INTO invoices (invoice_no, invoice_date, template, customer_id, customer_name, customer_phone,
        delivery_address_id, delivery_address, subtotal, discount_rate, discount_amount, courtesy_adjustment,
        total_order_value, delivery_fee, deposit_paid, balance_due, grand_total, currency, status,
        deposit_invoice_no, notes, created_by, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24)`
    )
    .bind(
      invoiceNo, invoiceDate, r.template, opts.customer_id ?? null, r.customer_name,
      opts.customer_phone ?? null, opts.delivery_address_id ?? null, opts.delivery_address ?? null,
      r.subtotal, r.discount_rate, r.discount_amount, r.courtesy_adjustment,
      r.total_order_value, r.delivery_fee, r.deposit_paid, r.balance_due, r.grand_total,
      r.currency, "issued", opts.deposit_invoice_no ?? null, opts.notes ?? null,
      opts.created_by ?? null, now, now
    )
    .run();

  // Get the inserted invoice id
  const inv = await db
    .prepare("SELECT id FROM invoices WHERE invoice_no = ?1")
    .bind(invoiceNo)
    .first<{ id: number }>();
  const invoiceId = inv!.id;

  // Insert items
  for (let i = 0; i < r.items.length; i++) {
    const item = r.items[i];
    await db
      .prepare(
        `INSERT INTO invoice_items (invoice_id, position, product_id, product_name, description, quantity, unit_price, line_total)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`
      )
      .bind(invoiceId, i + 1, item.product_id, item.name, item.description ?? null, item.quantity, item.unit_price, item.line_total)
      .run();
  }

  // Update customer stats if linked
  if (opts.customer_id) {
    await db
      .prepare(
        `UPDATE customers SET
          total_orders = total_orders + 1,
          total_spent = total_spent + ?1,
          last_order_date = ?2,
          first_order_date = COALESCE(first_order_date, ?2),
          updated_at = ?3
         WHERE id = ?4`
      )
      .bind(r.grand_total, invoiceDate, now, opts.customer_id)
      .run();

    // Log customer event
    await db
      .prepare(
        `INSERT INTO customer_events (customer_id, event_type, event_date, summary, invoice_id, created_by, created_at)
         VALUES (?1, 'order', ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(opts.customer_id, now, `Order ${invoiceNo} — IDR ${r.grand_total.toLocaleString("id-ID")}`, invoiceId, opts.created_by ?? null, now)
      .run();
  }

  return {
    ...r,
    id: invoiceId,
    invoice_no: invoiceNo,
    invoice_date: invoiceDate,
    customer_id: opts.customer_id,
    customer_phone: opts.customer_phone,
    delivery_address_id: opts.delivery_address_id,
    delivery_address: opts.delivery_address,
    status: "issued",
    deposit_invoice_no: opts.deposit_invoice_no,
    notes: opts.notes,
    created_by: opts.created_by,
    created_at: now,
    updated_at: now,
  };
}

export async function getInvoice(db: D1Database, invoiceNo: string): Promise<StoredInvoice | null> {
  const row = await db
    .prepare("SELECT * FROM invoices WHERE invoice_no = ?1")
    .bind(invoiceNo)
    .first<Record<string, unknown>>();
  if (!row) return null;

  const items = await db
    .prepare("SELECT * FROM invoice_items WHERE invoice_id = ?1 ORDER BY position")
    .bind(row.id)
    .all<Record<string, unknown>>();

  return {
    id: row.id as number,
    invoice_no: row.invoice_no as string,
    invoice_date: row.invoice_date as string,
    template: row.template as string,
    customer_name: row.customer_name as string,
    customer_id: row.customer_id as number | undefined,
    customer_phone: row.customer_phone as string | undefined,
    delivery_address_id: row.delivery_address_id as number | undefined,
    delivery_address: row.delivery_address as string | undefined,
    items: items.results.map((it) => ({
      product_id: it.product_id as string,
      name: it.product_name as string,
      quantity: it.quantity as number,
      unit_price: it.unit_price as number,
      line_total: it.line_total as number,
      description: it.description as string | undefined,
    })),
    subtotal: row.subtotal as number,
    discount_rate: row.discount_rate as number,
    discount_amount: row.discount_amount as number,
    courtesy_adjustment: row.courtesy_adjustment as number,
    total_order_value: row.total_order_value as number,
    delivery_fee: row.delivery_fee as number,
    deposit_paid: row.deposit_paid as number,
    balance_due: row.balance_due as number,
    grand_total: row.grand_total as number,
    currency: "IDR",
    calculated_at: row.created_at as string,
    status: row.status as string,
    deposit_invoice_no: row.deposit_invoice_no as string | undefined,
    notes: row.notes as string | undefined,
    created_by: row.created_by as string | undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

interface ListInvoicesOpts {
  customer_id?: number;
  customer_name?: string;
  template?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export async function listInvoices(db: D1Database, opts: ListInvoicesOpts = {}) {
  const conditions: string[] = [];
  const binds: unknown[] = [];
  let idx = 1;

  if (opts.customer_id) { conditions.push(`customer_id = ?${idx++}`); binds.push(opts.customer_id); }
  if (opts.customer_name) { conditions.push(`customer_name LIKE ?${idx++}`); binds.push(`%${opts.customer_name}%`); }
  if (opts.template) { conditions.push(`template = ?${idx++}`); binds.push(opts.template); }
  if (opts.status) { conditions.push(`status = ?${idx++}`); binds.push(opts.status); }
  if (opts.date_from) { conditions.push(`invoice_date >= ?${idx++}`); binds.push(opts.date_from); }
  if (opts.date_to) { conditions.push(`invoice_date <= ?${idx++}`); binds.push(opts.date_to); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  const offset = opts.offset ?? 0;

  const sql = `SELECT * FROM invoices ${where} ORDER BY invoice_date DESC, id DESC LIMIT ?${idx++} OFFSET ?${idx++}`;
  binds.push(limit, offset);

  const result = await db.prepare(sql).bind(...binds).all<Record<string, unknown>>();
  return result.results;
}

// --- Customer Operations ---

export async function findOrCreateCustomer(
  db: D1Database,
  data: { name: string; phone?: string; instagram?: string; notes?: string; preferences?: Record<string, unknown>; tags?: string }
): Promise<Customer> {
  const now = new Date().toISOString();

  // Try to find by phone first
  if (data.phone) {
    const existing = await db
      .prepare("SELECT * FROM customers WHERE phone = ?1")
      .bind(data.phone)
      .first<Customer>();
    if (existing) {
      // Update name if provided and different
      if (data.name && data.name !== existing.name) {
        await db.prepare("UPDATE customers SET name = ?1, updated_at = ?2 WHERE id = ?3").bind(data.name, now, existing.id).run();
        existing.name = data.name;
      }
      return existing;
    }
  }

  // Create new customer
  await db
    .prepare(
      `INSERT INTO customers (name, phone, instagram, notes, preferences, tags, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(
      data.name, data.phone ?? null, data.instagram ?? null, data.notes ?? null,
      data.preferences ? JSON.stringify(data.preferences) : null,
      data.tags ?? null, now, now
    )
    .run();

  const customer = await db
    .prepare("SELECT * FROM customers WHERE rowid = last_insert_rowid()")
    .first<Customer>();
  return customer!;
}

export async function getCustomer(db: D1Database, id: number) {
  const customer = await db.prepare("SELECT * FROM customers WHERE id = ?1").bind(id).first<Customer>();
  if (!customer) return null;

  // Parse preferences JSON
  if (customer.preferences && typeof customer.preferences === "string") {
    try { customer.preferences = JSON.parse(customer.preferences as unknown as string); } catch { /* keep as string */ }
  }

  const addresses = await db
    .prepare("SELECT * FROM customer_addresses WHERE customer_id = ?1 ORDER BY is_default DESC, created_at DESC")
    .bind(id)
    .all<CustomerAddress>();

  const recentOrders = await db
    .prepare("SELECT invoice_no, invoice_date, template, grand_total, status FROM invoices WHERE customer_id = ?1 ORDER BY invoice_date DESC LIMIT 10")
    .bind(id)
    .all<Record<string, unknown>>();

  const events = await db
    .prepare("SELECT * FROM customer_events WHERE customer_id = ?1 ORDER BY event_date DESC LIMIT 20")
    .bind(id)
    .all<CustomerEvent>();

  return {
    ...customer,
    addresses: addresses.results,
    recent_orders: recentOrders.results,
    events: events.results,
  };
}

export async function searchCustomers(db: D1Database, query: string) {
  const results = await db
    .prepare("SELECT * FROM customers WHERE name LIKE ?1 OR phone LIKE ?1 OR instagram LIKE ?1 ORDER BY last_order_date DESC LIMIT 20")
    .bind(`%${query}%`)
    .all<Customer>();
  return results.results;
}

export async function updateCustomerPreferences(db: D1Database, id: number, preferences: Record<string, unknown>) {
  const now = new Date().toISOString();
  const existing = await db.prepare("SELECT preferences FROM customers WHERE id = ?1").bind(id).first<{ preferences: string }>();
  if (!existing) throw new Error("Customer not found");

  let merged = preferences;
  if (existing.preferences) {
    try {
      const current = JSON.parse(existing.preferences);
      merged = { ...current, ...preferences };
    } catch { /* overwrite if unparseable */ }
  }

  await db
    .prepare("UPDATE customers SET preferences = ?1, updated_at = ?2 WHERE id = ?3")
    .bind(JSON.stringify(merged), now, id)
    .run();

  // Log preference update event
  await db
    .prepare(
      `INSERT INTO customer_events (customer_id, event_type, event_date, summary, created_at)
       VALUES (?1, 'preference_update', ?2, ?3, ?4)`
    )
    .bind(id, now, `Updated preferences: ${Object.keys(preferences).join(", ")}`, now)
    .run();

  return merged;
}

export async function addCustomerAddress(db: D1Database, customerId: number, data: {
  label: string; address: string; district?: string; city?: string; postal_code?: string; notes?: string; is_default?: boolean;
}): Promise<CustomerAddress> {
  // If setting as default, unset other defaults
  if (data.is_default) {
    await db.prepare("UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?1").bind(customerId).run();
  }

  await db
    .prepare(
      `INSERT INTO customer_addresses (customer_id, label, address, district, city, postal_code, notes, is_default)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    )
    .bind(customerId, data.label, data.address, data.district ?? null, data.city ?? null, data.postal_code ?? null, data.notes ?? null, data.is_default ? 1 : 0)
    .run();

  const addr = await db.prepare("SELECT * FROM customer_addresses WHERE rowid = last_insert_rowid()").first<CustomerAddress>();
  return addr!;
}

export async function addCustomerEvent(db: D1Database, data: {
  customer_id: number; event_type: string; summary?: string; invoice_id?: number; created_by?: string;
}): Promise<CustomerEvent> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO customer_events (customer_id, event_type, event_date, summary, invoice_id, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    )
    .bind(data.customer_id, data.event_type, now, data.summary ?? null, data.invoice_id ?? null, data.created_by ?? null, now)
    .run();

  const evt = await db.prepare("SELECT * FROM customer_events WHERE rowid = last_insert_rowid()").first<CustomerEvent>();
  return evt!;
}
