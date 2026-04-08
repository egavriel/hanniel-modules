-- Little Hanniel Invoice & Customer Database Schema (Phase 1)

-- customers: profiles and preferences
CREATE TABLE IF NOT EXISTS customers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    name             TEXT    NOT NULL,
    phone            TEXT    UNIQUE,
    instagram        TEXT,
    notes            TEXT,
    preferences      TEXT,    -- JSON blob
    tags             TEXT,    -- comma-separated: "vip,corporate,repeat"
    first_order_date TEXT,
    last_order_date  TEXT,
    total_orders     INTEGER NOT NULL DEFAULT 0,
    total_spent      INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- customer_addresses: multiple addresses per customer
CREATE TABLE IF NOT EXISTS customer_addresses (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    label       TEXT    NOT NULL,
    address     TEXT    NOT NULL,
    district    TEXT,
    city        TEXT,
    postal_code TEXT,
    notes       TEXT,
    is_default  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- invoices: full invoice snapshot
CREATE TABLE IF NOT EXISTS invoices (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no          TEXT    NOT NULL UNIQUE,
    invoice_date        TEXT    NOT NULL,
    template            TEXT    NOT NULL,
    customer_id         INTEGER,
    customer_name       TEXT    NOT NULL,
    customer_phone      TEXT,
    delivery_address_id INTEGER,
    delivery_address    TEXT,
    subtotal            INTEGER NOT NULL,
    discount_rate       REAL    NOT NULL DEFAULT 0,
    discount_amount     INTEGER NOT NULL DEFAULT 0,
    courtesy_adjustment INTEGER NOT NULL DEFAULT 0,
    total_order_value   INTEGER NOT NULL,
    delivery_fee        INTEGER NOT NULL DEFAULT 0,
    deposit_paid        INTEGER NOT NULL DEFAULT 0,
    balance_due         INTEGER NOT NULL DEFAULT 0,
    grand_total         INTEGER NOT NULL,
    currency            TEXT    NOT NULL DEFAULT 'IDR',
    status              TEXT    NOT NULL DEFAULT 'issued',
    deposit_invoice_no  TEXT,
    notes               TEXT,
    created_by          TEXT,
    created_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at          TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (delivery_address_id) REFERENCES customer_addresses(id),
    FOREIGN KEY (deposit_invoice_no) REFERENCES invoices(invoice_no)
);

-- invoice_items: line items with snapshotted prices
CREATE TABLE IF NOT EXISTS invoice_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id   INTEGER NOT NULL,
    position     INTEGER NOT NULL,
    product_id   TEXT    NOT NULL,
    product_name TEXT    NOT NULL,
    description  TEXT,
    quantity     INTEGER NOT NULL CHECK (quantity >= 1),
    unit_price   INTEGER NOT NULL CHECK (unit_price >= 0),
    line_total   INTEGER NOT NULL CHECK (line_total >= 0),

    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- invoice_sequences: auto-increment per year for invoice numbers
CREATE TABLE IF NOT EXISTS invoice_sequences (
    year     INTEGER PRIMARY KEY,
    last_seq INTEGER NOT NULL DEFAULT 0
);

-- customer_events: lightweight CRM activity log
CREATE TABLE IF NOT EXISTS customer_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    event_type  TEXT    NOT NULL,
    event_date  TEXT    NOT NULL,
    summary     TEXT,
    invoice_id  INTEGER,
    created_by  TEXT,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name        ON customers(name);
CREATE INDEX IF NOT EXISTS idx_addresses_customer    ON customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date         ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id  ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_name ON invoices(customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_template     ON invoices(template);
CREATE INDEX IF NOT EXISTS idx_invoices_status       ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_deposit_ref  ON invoices(deposit_invoice_no);
CREATE INDEX IF NOT EXISTS idx_items_invoice_id      ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_events_customer       ON customer_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_events_type           ON customer_events(event_type);
