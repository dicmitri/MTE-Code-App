-- Alexandria D1 Schema
-- Optimized for read-only historical transparency data.

CREATE TABLE IF NOT EXISTS countries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    iso_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS currencies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unique_identifier TEXT,
    country_code TEXT,
    postal_code TEXT,
    parent_name TEXT,
    contact_url TEXT
);

CREATE TABLE IF NOT EXISTS beneficiaries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unique_identifier TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    country_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS declarations (
    id TEXT PRIMARY KEY,
    year INTEGER NOT NULL,
    amount REAL NOT NULL,
    currency_code TEXT NOT NULL,
    nature TEXT NOT NULL,
    nature_label TEXT NOT NULL,
    description TEXT,
    company_id TEXT NOT NULL,
    beneficiary_id TEXT NOT NULL,
    -- Denormalized fields for fast search/filtering
    company_name TEXT NOT NULL,
    beneficiary_name TEXT NOT NULL,
    beneficiary_country_code TEXT NOT NULL,
    company_country_code TEXT,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (beneficiary_id) REFERENCES beneficiaries(id)
);

-- Indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_declarations_year ON declarations(year);
CREATE INDEX IF NOT EXISTS idx_declarations_company_name ON declarations(company_name);
CREATE INDEX IF NOT EXISTS idx_declarations_beneficiary_name ON declarations(beneficiary_name);
CREATE INDEX IF NOT EXISTS idx_declarations_beneficiary_country ON declarations(beneficiary_country_code);
CREATE INDEX IF NOT EXISTS idx_declarations_company_country ON declarations(company_country_code);
CREATE INDEX IF NOT EXISTS idx_declarations_nature ON declarations(nature);
