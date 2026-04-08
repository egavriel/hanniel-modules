# Little Hanniel Invoice API — Agent Skills Guide

Base URL: `https://app.hanniel.co`

This document describes how an AI assistant (e.g., Nanoclaw WhatsApp bot) can generate invoices via the API.

---

## Skill: Generate Invoice Image

**When to use:** Customer confirms an order and needs an invoice image (JPEG).

### Endpoint

```
POST /api/invoice/generate
Content-Type: application/json
```

**Response:** `image/jpeg` binary (downloadable invoice image, 794x1123px)

### Request Body

```json
{
  "template": "hanniel",
  "customer_name": "Ms. Ksenia",
  "items": [
    { "product_id": "Strawberry overnight oats::hanniel", "quantity": 3 },
    { "product_id": "Double choco overnight oats::hanniel", "quantity": 2 }
  ],
  "delivery_fee": 25000,
  "discount_rate": 0,
  "courtesy_adjustment": 0,
  "deposit_paid": 0
}
```

### Parameters

| Field | Type | Required | Description |
|---|---|---|---|
| `template` | string | Yes | Template ID (see table below) |
| `customer_name` | string | Yes | Customer name shown on invoice |
| `items` | array | Yes | At least 1 item (see Items section) |
| `delivery_fee` | integer | No | Delivery fee in IDR (default: 0) |
| `discount_rate` | number | No | Discount as decimal: 0.05 = 5%, 0.10 = 10%, 0.20 = 20% (default: 0) |
| `courtesy_adjustment` | integer | No | Flat IDR deduction, hanniel-dp/fi only (default: 0) |
| `deposit_paid` | integer | No | Deposit amount in IDR, hanniel-dp/fi only (default: 0) |

### Items Format

Each item in the `items` array:

| Field | Type | Required | Description |
|---|---|---|---|
| `product_id` | string | Yes | Exact product ID from the catalog (format: `Name::template`) |
| `quantity` | integer | Yes | Quantity, minimum 1 |
| `description` | string | No | Item description, only for hanniel-dp/fi templates |

---

## Templates

| Template ID | Label | Use Case |
|---|---|---|
| `hanniel` | Little Hanniel | Regular orders (oats, cookies) |
| `hanniel-dp` | Hanniel Deposit | Custom orders requiring deposit |
| `hanniel-fi` | Hanniel Final Invoice | Final invoice after deposit paid |
| `eid` | Eid 2026 | Eid seasonal products |
| `eidhp` | Eid Hamper 2026 | Eid hamper sets |
| `cny` | CNY 2026 | Chinese New Year seasonal |
| `cnyhp` | CNY Hamper 2026 | CNY hamper sets |
| `christmas` | Christmas 2025 | Christmas seasonal |

### Template-specific behavior

- **Standard templates** (hanniel, eid, eidhp, cny, cnyhp, christmas): `grand_total = subtotal - discount + delivery_fee`
- **hanniel-dp** (Deposit): `grand_total = deposit_paid` — use when collecting a deposit for custom orders
- **hanniel-fi** (Final Invoice): `grand_total = balance_due + delivery_fee` where `balance_due = total_order_value - deposit_paid`

---

## Product Catalog

> **Important:** Each product belongs to a specific template. The `product_id` must match the template used.

### hanniel (Little Hanniel)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Strawberry overnight oats::hanniel` | Strawberry overnight oats | 42,000 |
| `Double choco overnight oats::hanniel` | Double choco overnight oats | 42,000 |
| `Tiramisu overnight oats::hanniel` | Tiramisu overnight oats | 42,000 |
| `Double choco oat::hanniel` | Double choco oat | 70,000 |
| `Raisin oat::hanniel` | Raisin oat | 70,000 |
| `Almond choco oat::hanniel` | Almond choco | 70,000 |

### hanniel-dp / hanniel-fi (Deposit & Final Invoice)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Custom tin cookie hamper::hanniel-dp` | Custom tin cookie hamper | 65,000 |
| `Custom tin cookie hamper::hanniel-fi` | Custom tin cookie hamper | 65,000 |

### eid (Eid 2026)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Eid Royale Tin::eid` | Eid Royale Tin | 188,000 |

### eidhp (Eid Hamper 2026)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Noor Royale Set::eidhp` | Noor Royale Set | 978,000 |
| `Safiya Set::eidhp` | Safiya Set | 599,000 |
| `Amara Set::eidhp` | Amara Set | 299,000 |
| `Strawberry overnight oats::eidhp` | Strawberry overnight oats | 42,000 |
| `Double choco overnight oats::eidhp` | Double choco overnight oats | 42,000 |
| `Tiramisu overnight oats::eidhp` | Tiramisu overnight oats | 42,000 |

### cny (Chinese New Year 2026)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Lunar Bloom Tin::cny` | Lunar Bloom Tin | 188,000 |
| `Double choco oat::cny` | Double choco oat | 70,000 |
| `Raisin oat::cny` | Raisin oat | 70,000 |
| `Almond choco oat::cny` | Almond choco | 70,000 |
| `Strawberry overnight oats::cny` | Strawberry overnight oats | 42,000 |
| `Double choco overnight oats::cny` | Double choco overnight oats | 42,000 |
| `Tiramisu overnight oats::cny` | Tiramisu overnight oats | 42,000 |

### cnyhp (CNY Hamper 2026)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Kembang Pusaka::cnyhp` | Kembang Pusaka | 599,000 |
| `Seri Kemala::cnyhp` | Seri Kemala | 349,000 |
| `Biskuit Kacang Almond Renda::cnyhp` | Biskuit Kacang Almond Renda | 89,000 |
| `Kuih Nenas::cnyhp` | Kuih Nenas | 99,000 |
| `Biskuit Bijen Hitam::cnyhp` | Biskuit Bijen Hitam | 89,000 |
| `Classic Kuih Bangkit::cnyhp` | Classic Kuih Bangkit | 82,000 |
| `Double choco oat::cnyhp` | Double choco oat | 70,000 |
| `Raisin oat::cnyhp` | Raisin oat | 70,000 |
| `Almond choco oat::cnyhp` | Almond choco | 70,000 |

### christmas (Christmas 2025)

| Product ID | Name | Price (IDR) |
|---|---|---|
| `Etoile one::christmas` | Etoile one | 149,000 |
| `Etoile duo::christmas` | Etoile duo | 349,000 |
| `Etoile four::christmas` | Etoile four | 599,000 |
| `Christmas Hampers Tin::christmas` | Christmas Hampers Tin | 159,000 |
| `Double choco oat::christmas` | Double choco oat | 70,000 |
| `Raisin oat::christmas` | Raisin oat | 70,000 |
| `Almond choco oat::christmas` | Almond choco | 70,000 |

---

## Example Scenarios

### 1. Simple order (Little Hanniel)

Customer: "I want 3 strawberry overnight oats and 2 double choco overnight oats, delivery fee 15k"

```json
{
  "template": "hanniel",
  "customer_name": "Ms. Sarah",
  "items": [
    { "product_id": "Strawberry overnight oats::hanniel", "quantity": 3 },
    { "product_id": "Double choco overnight oats::hanniel", "quantity": 2 }
  ],
  "delivery_fee": 15000
}
```

Grand total: (3 x 42,000) + (2 x 42,000) + 15,000 = **225,000**

### 2. Order with discount

Customer: "5 Eid Royale Tin, 10% discount, delivery 30k"

```json
{
  "template": "eid",
  "customer_name": "Mrs. Fatimah",
  "items": [
    { "product_id": "Eid Royale Tin::eid", "quantity": 5 }
  ],
  "delivery_fee": 30000,
  "discount_rate": 0.10
}
```

Grand total: (5 x 188,000) - 10% + 30,000 = 940,000 - 94,000 + 30,000 = **876,000**

### 3. Deposit invoice (hanniel-dp)

Customer: "I want to order 10 custom tin cookie hampers, deposit 300k, description: Vanilla & Choco mix"

```json
{
  "template": "hanniel-dp",
  "customer_name": "Mr. Budi",
  "items": [
    { "product_id": "Custom tin cookie hamper::hanniel-dp", "quantity": 10, "description": "Vanilla & Choco mix" }
  ],
  "deposit_paid": 300000
}
```

Grand total: **300,000** (deposit amount only)

### 4. Final invoice after deposit (hanniel-fi)

Customer already paid 300k deposit, now settling the rest with 25k delivery.

```json
{
  "template": "hanniel-fi",
  "customer_name": "Mr. Budi",
  "items": [
    { "product_id": "Custom tin cookie hamper::hanniel-fi", "quantity": 10, "description": "Vanilla & Choco mix" }
  ],
  "delivery_fee": 25000,
  "deposit_paid": 300000
}
```

Balance due: 650,000 - 300,000 = 350,000
Grand total: 350,000 + 25,000 = **375,000**

### 5. Eid Hamper order

Customer: "1 Noor Royale Set and 2 Amara Set"

```json
{
  "template": "eidhp",
  "customer_name": "Ms. Aisha",
  "items": [
    { "product_id": "Noor Royale Set::eidhp", "quantity": 1 },
    { "product_id": "Amara Set::eidhp", "quantity": 2 }
  ],
  "delivery_fee": 0
}
```

Grand total: 978,000 + (2 x 299,000) = **1,576,000**

---

## Other Useful Endpoints

### Get product catalog (for lookup)

```
GET /api/products
GET /api/products?template=hanniel
```

Returns all products or filtered by template. Use this to verify product IDs.

### Calculate totals without image

```
POST /api/invoice/calculate
Content-Type: application/json
```

Same request body as `/api/invoice/generate`, but returns JSON with calculated totals instead of an image. Useful for confirming amounts before generating the invoice.

### Get API specification

```
GET /api/openapi.json
```

Full OpenAPI 3.1.0 spec for all endpoints.

---

## Error Handling

| HTTP Code | Meaning |
|---|---|
| 200 | Success — JPEG image returned |
| 400 | Invalid JSON body |
| 405 | Wrong HTTP method (must be POST) |
| 422 | Validation error (wrong template, invalid product_id, missing fields) |
| 500 | Server error (background image or rendering failure) |

Error responses return JSON:
```json
{
  "error": "Unknown product_id: Banana Loaf::hanniel",
  "code": "PRODUCT_NOT_FOUND",
  "field": "items[0].product_id"
}
```

---

## Agent Instructions

When a customer places an order via WhatsApp:

1. **Identify the template** — Match the product type to the correct template. If unsure, use `hanniel` for regular items or `eidhp` for Eid hamper sets.
2. **Match product names** — Use the exact `product_id` from the catalog. The format is always `Product Name::template`.
3. **Ask for customer name** — This appears on the invoice under "BILL TO".
4. **Ask for delivery fee** — If the customer mentions "ongkir" or delivery, include it. Otherwise default to 0.
5. **Generate the invoice** — POST to `/api/invoice/generate` and send the returned JPEG image to the customer.
6. **For custom orders** — Use `hanniel-dp` for the deposit invoice, then `hanniel-fi` for the final invoice when the customer settles the remaining balance.

### Matching customer messages to products

| Customer says | Product ID to use |
|---|---|
| "overnight oats strawberry" / "OO strawberry" | `Strawberry overnight oats::hanniel` |
| "overnight oats double choco" / "OO coklat" | `Double choco overnight oats::hanniel` |
| "overnight oats tiramisu" / "OO tiramisu" | `Tiramisu overnight oats::hanniel` |
| "oat bar double choco" / "oat coklat" | `Double choco oat::hanniel` |
| "oat bar raisin" / "oat kismis" | `Raisin oat::hanniel` |
| "oat bar almond" / "oat almond" | `Almond choco oat::hanniel` |
| "hamper noor royale" / "set noor" | `Noor Royale Set::eidhp` |
| "hamper safiya" / "set safiya" | `Safiya Set::eidhp` |
| "hamper amara" / "set amara" | `Amara Set::eidhp` |
| "eid royale" / "tin eid" | `Eid Royale Tin::eid` |
| "custom hamper" / "custom tin" | `Custom tin cookie hamper::hanniel-dp` or `hanniel-fi` |
