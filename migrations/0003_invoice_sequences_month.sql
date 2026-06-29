-- Migration: Add month column to invoice_sequences for LH-YYMM-#### format
-- Run this to update the existing invoice_sequences table

ALTER TABLE invoice_sequences ADD COLUMN month INTEGER NOT NULL DEFAULT 1;

-- Recreate the primary key as a composite of (year, month)
-- First drop the old PK constraint, then add the new one
CREATE TABLE IF NOT EXISTS invoice_sequences_new (
    year     INTEGER NOT NULL,
    month    INTEGER NOT NULL,
    last_seq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (year, month)
);

-- Copy data from old table (month will default to 1 for existing rows — acceptable)
INSERT OR IGNORE INTO invoice_sequences_new (year, month, last_seq)
SELECT year, 1, last_seq FROM invoice_sequences;

DROP TABLE invoice_sequences;
ALTER TABLE invoice_sequences_new RENAME TO invoice_sequences;
