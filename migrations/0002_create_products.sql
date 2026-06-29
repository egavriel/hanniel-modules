-- Migration 0002: Create products table — D1 is the runtime source of truth.
--
-- Before this migration, products lived in `shared/catalog.json` and were
-- imported at build/request time by `functions/_shared/catalog.ts`. That file
-- drifted out of sync with the deployed catalog because products were being
-- edited via the Cloudflare Dashboard (or a non-committed local checkout) and
-- the JSON file in git was never updated.
--
-- This migration moves the canonical store to D1. From now on:
--   * D1 `products` table is the source of truth at request time.
--   * `shared/catalog.json` is a SEED snapshot only — used by the
--     `getAllProducts()` cold-start fallback in `_shared/catalog.ts` when
--     the D1 table is empty (fresh project, before this migration runs).
--   * Product writes go through the existing /api/products endpoint
--     (functions/api/products.ts), backed by the helpers in
--     functions/_shared/db.ts (createProduct / updateProduct /
--     deactivateProduct / reactivateProduct).
--
-- Run order: 0001 (customers/invoices/items) → 0002 (products). All idempotent.

CREATE TABLE IF NOT EXISTS products (
    id         TEXT PRIMARY KEY,  -- "Name::template" composite key
    name       TEXT NOT NULL,
    price      INTEGER NOT NULL CHECK (price >= 0),
    template   TEXT NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,  -- soft-delete: 0 hides from /api/products
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_products_template ON products(template);
CREATE INDEX IF NOT EXISTS idx_products_active    ON products(active);

-- Seed from the LIVE API snapshot taken 2026-06-24 (50 products).
-- Source of truth: https://app.hanniel.co/api/products
-- Anything missing from this seed will be added by /api/admin/products/sync
-- or manually via POST /api/admin/products. Do NOT edit this list without
-- also updating /api/products — they must match.
INSERT OR IGNORE INTO products (id, name, price, template) VALUES
  ('Almond choco oat::christmas',          'Almond choco oat',          70000, 'christmas'),
  ('Almond choco oat::cny',                'Almond choco oat',          70000, 'cny'),
  ('Almond choco oat::cnyhp',              'Almond choco oat',          70000, 'cnyhp'),
  ('Almond choco oat::hanniel',            'Almond choco oat',          70000, 'hanniel'),
  ('Amara Set::eidhp',                     'Amara Set',                299000, 'eidhp'),
  ('Banana Loaf::hanniel',                 'Banana Loaf',               38000, 'hanniel'),
  ('Banana Loaf::hanniel-dp',              'Banana Loaf',               38000, 'hanniel-dp'),
  ('Biskuit Bijen Hitam::cnyhp',           'Biskuit Bijen Hitam',       89000, 'cnyhp'),
  ('Biskuit Kacang Almond Renda::cnyhp',   'Biskuit Kacang Almond Renda', 89000, 'cnyhp'),
  ('Carrot Cake::hanniel',                 'Carrot Cake',               48000, 'hanniel'),
  ('Christmas Hampers Tin::christmas',     'Christmas Hampers Tin',    159000, 'christmas'),
  ('Classic Kuih Bangkit::cnyhp',          'Classic Kuih Bangkit',      82000, 'cnyhp'),
  ('Custom Banana Loaf::hanniel',          'Custom Banana Loaf',       188000, 'hanniel'),
  ('Custom Banana Loaf::hanniel-dp',       'Custom Banana Loaf',       188000, 'hanniel-dp'),
  ('Custom Banana Loaf::hanniel-fi',       'Custom Banana Loaf',       188000, 'hanniel-fi'),
  ('Custom Hampers Cookies::hanniel',      'Custom Hampers Cookies',    40000, 'hanniel'),
  ('Custom Hampers Cookies::hanniel-dp',   'Custom Hampers Cookies',    40000, 'hanniel-dp'),
  ('Custom Hampers Cookies::hanniel-fi',   'Custom Hampers Cookies',    40000, 'hanniel-fi'),
  ('Custom Overnight Oats::hanniel',       'Custom Overnight Oats',    168000, 'hanniel'),
  ('Custom tin cookie hamper::hanniel-dp', 'Custom tin cookie hamper',  65000, 'hanniel-dp'),
  ('Custom tin cookie hamper::hanniel-fi', 'Custom tin cookie hamper',  65000, 'hanniel-fi'),
  ('Double choco oat::christmas',          'Double choco oat',          70000, 'christmas'),
  ('Double choco oat::cny',                'Double choco oat',          70000, 'cny'),
  ('Double choco oat::cnyhp',              'Double choco oat',          70000, 'cnyhp'),
  ('Double choco oat::hanniel',            'Double choco oat',          70000, 'hanniel'),
  ('Double choco overnight oats::cny',     'Double choco overnight oats', 42000, 'cny'),
  ('Double choco overnight oats::eidhp',   'Double choco overnight oats', 42000, 'eidhp'),
  ('Double choco overnight oats::hanniel', 'Double choco overnight oats', 42000, 'hanniel'),
  ('Double choco overnight oats::hanniel-fi','Double choco overnight oats', 42000, 'hanniel-fi'),
  ('Egg and Veggies Gimbap::hanniel',      'Egg and Veggies Gimbap',    70000, 'hanniel'),
  ('Eid Royale Tin::eid',                  'Eid Royale Tin',           188000, 'eid'),
  ('Etoile duo::christmas',                'Etoile duo',               349000, 'christmas'),
  ('Etoile four::christmas',               'Etoile four',              599000, 'christmas'),
  ('Etoile one::christmas',                'Etoile one',               149000, 'christmas'),
  ('Kembang Pusaka::cnyhp',                'Kembang Pusaka',           599000, 'cnyhp'),
  ('Kuih Nenas::cnyhp',                    'Kuih Nenas',                99000, 'cnyhp'),
  ('Lunar Bloom Tin::cny',                 'Lunar Bloom Tin',          188000, 'cny'),
  ('Noor Royale Set::eidhp',               'Noor Royale Set',          978000, 'eidhp'),
  ('Raisin oat::christmas',                'Raisin oat',                70000, 'christmas'),
  ('Raisin oat::cny',                      'Raisin oat',                70000, 'cny'),
  ('Raisin oat::cnyhp',                    'Raisin oat',                70000, 'cnyhp'),
  ('Raisin oat::hanniel',                  'Raisin oat',                70000, 'hanniel'),
  ('Safiya Set::eidhp',                    'Safiya Set',               599000, 'eidhp'),
  ('Seri Kemala::cnyhp',                   'Seri Kemala',              349000, 'cnyhp'),
  ('Strawberry overnight oats::cny',       'Strawberry overnight oats',  42000, 'cny'),
  ('Strawberry overnight oats::eidhp',     'Strawberry overnight oats',  42000, 'eidhp'),
  ('Strawberry overnight oats::hanniel',   'Strawberry overnight oats',  42000, 'hanniel'),
  ('Tiramisu overnight oats::cny',         'Tiramisu overnight oats',    42000, 'cny'),
  ('Tiramisu overnight oats::eidhp',       'Tiramisu overnight oats',    42000, 'eidhp'),
  ('Tiramisu overnight oats::hanniel',     'Tiramisu overnight oats',    42000, 'hanniel');
