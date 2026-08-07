"""Builds d1/historical-declarations/seed.sample.sql: a 100-declaration
sample from seed.sql with company and beneficiary/HCO names replaced by
clearly-fake placeholders, for local testing (wrangler d1 execute --local)
without real names in the sample.

Scope is intentionally narrow, matching what was requested: only the
`name` columns (companies.name, companies.parent_name,
beneficiaries.name) and their denormalized copies on `declarations`
(company_name, beneficiary_name) are replaced. Left untouched:
- beneficiaries.address / city — some real addresses directly contain
  the institution's real name (e.g. "Portsmouth Hospital NHS Trust" as
  an address line), so a fake name can still be re-identified via
  address alone in a few rows.
- companies.unique_identifier — at least one row in the source data has
  a real company name in this field instead of a VAT/business ID
  (legacy data quality issue), which this script does not detect.
Re-run after re-seeding from a fresh export; the sample is regenerated
deterministically (random.seed) but SQLite's own RANDOM() selection of
which 100 rows isn't reproducible run-to-run.
"""
import sqlite3
import random
import os

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D1_DIR = os.path.join(REPO_ROOT, "d1", "historical-declarations")
SCHEMA_PATH = os.path.join(D1_DIR, "schema.sql")
SEED_PATH = os.path.join(D1_DIR, "seed.sql")
OUT_PATH = os.path.join(D1_DIR, "seed.sample.sql")

SAMPLE_SIZE = 100
random.seed(42)  # deterministic sample, easy to regenerate/diff

FAKE_COMPANY_NAMES = [
    "Northwind MedTech", "Bluepeak Diagnostics", "Cascade Surgical",
    "Ironwood Devices", "Solara Health Systems", "Meridian Biotech",
    "Fernbridge Medical", "Cobalt Instruments", "Amberlight Therapeutics",
    "Pinecrest Devices", "Havenport Health", "Silverline Diagnostics",
]

FAKE_HCO_NAMES = [
    "Riverside General Hospital", "St. Aldric Medical Centre",
    "Northgate University Clinic", "Lakeview Regional Hospital",
    "Oakfield Health Institute", "Brightwater Clinic",
    "Hillcrest Teaching Hospital", "Marlowe Community Hospital",
    "Ashgrove Medical Foundation", "Thornfield Clinic",
    "Westbrook Health Centre", "Cedarview Hospital",
]


def build():
    con = sqlite3.connect(":memory:")
    con.executescript(open(SCHEMA_PATH, encoding="utf-8").read())
    con.executescript(open(SEED_PATH, encoding="utf-8").read())
    cur = con.cursor()

    declarations = cur.execute(
        "SELECT * FROM declarations ORDER BY RANDOM() LIMIT ?", (SAMPLE_SIZE,)
    ).fetchall()
    decl_cols = [d[0] for d in cur.description]

    company_ids = sorted({row[decl_cols.index("company_id")] for row in declarations})
    beneficiary_ids = sorted({row[decl_cols.index("beneficiary_id")] for row in declarations})

    def fetchall_by_ids(table, ids):
        placeholders = ",".join("?" for _ in ids)
        cur.execute(f"SELECT * FROM {table} WHERE id IN ({placeholders})", ids)
        cols = [d[0] for d in cur.description]
        return cols, cur.fetchall()

    company_cols, companies = fetchall_by_ids("companies", company_ids)
    beneficiary_cols, beneficiaries = fetchall_by_ids("beneficiaries", beneficiary_ids)

    countries = cur.execute("SELECT * FROM countries").fetchall()
    country_cols = [d[0] for d in cur.description]
    currencies = cur.execute("SELECT * FROM currencies").fetchall()
    currency_cols = [d[0] for d in cur.description]

    # Sanitize: replace company/beneficiary display names with clearly-fake
    # placeholders. Nothing else (ids, addresses, countries, contact_url,
    # amounts) is touched — this is a dev/test fixture, not final data.
    name_idx_c = company_cols.index("name")
    name_idx_b = beneficiary_cols.index("name")

    def randomized(rows, name_idx, pool):
        shuffled = pool * (len(rows) // len(pool) + 1)
        random.shuffle(shuffled)
        out = []
        for i, row in enumerate(rows):
            row = list(row)
            row[name_idx] = f"{shuffled[i]} (test data)"
            out.append(tuple(row))
        return out

    companies = randomized(companies, name_idx_c, FAKE_COMPANY_NAMES)
    beneficiaries = randomized(beneficiaries, name_idx_b, FAKE_HCO_NAMES)

    # parent_name is also a real company name (the parent company's), not
    # covered by the "name" column sanitization above.
    parent_name_idx = company_cols.index("parent_name")
    sanitized_companies = []
    for row in companies:
        row = list(row)
        if row[parent_name_idx]:
            row[parent_name_idx] = f"{random.choice(FAKE_COMPANY_NAMES)} (test data)"
        sanitized_companies.append(tuple(row))
    companies = sanitized_companies

    # declarations denormalizes company_name/beneficiary_name onto itself
    # (for search performance, per schema.sql) — the search API reads these
    # columns directly, not a join, so they must be sanitized too or the
    # real names leak straight through query results.
    company_id_idx = company_cols.index("id")
    beneficiary_id_idx = beneficiary_cols.index("id")
    fake_company_name_by_id = {row[company_id_idx]: row[name_idx_c] for row in companies}
    fake_beneficiary_name_by_id = {row[beneficiary_id_idx]: row[name_idx_b] for row in beneficiaries}

    decl_company_id_idx = decl_cols.index("company_id")
    decl_beneficiary_id_idx = decl_cols.index("beneficiary_id")
    decl_company_name_idx = decl_cols.index("company_name")
    decl_beneficiary_name_idx = decl_cols.index("beneficiary_name")

    sanitized_declarations = []
    for row in declarations:
        row = list(row)
        row[decl_company_name_idx] = fake_company_name_by_id[row[decl_company_id_idx]]
        row[decl_beneficiary_name_idx] = fake_beneficiary_name_by_id[row[decl_beneficiary_id_idx]]
        sanitized_declarations.append(tuple(row))
    declarations = sanitized_declarations

    def sql_literal(value):
        if value is None:
            return "NULL"
        if isinstance(value, (int, float)):
            return str(value)
        return "'" + str(value).replace("'", "''") + "'"

    def insert_statements(table, cols, rows):
        lines = []
        col_list = ", ".join(cols)
        for row in rows:
            values = ", ".join(sql_literal(v) for v in row)
            lines.append(f"INSERT OR IGNORE INTO {table} ({col_list}) VALUES ({values});")
        return lines

    out_lines = [
        "-- Sanitized local test fixture: 100 sampled declarations.",
        "-- Company and beneficiary/HCO names are replaced with clearly-fake",
        "-- placeholders. All other fields (ids, amounts, countries, years,",
        "-- contact_url) are taken as-is from the rehearsal dataset for",
        "-- realistic filtering/search behavior during local testing only.",
        "-- Regenerate with scratchpad/build_sample.py.",
        "BEGIN TRANSACTION;",
        "",
    ]
    out_lines += insert_statements("countries", country_cols, countries)
    out_lines.append("")
    out_lines += insert_statements("currencies", currency_cols, currencies)
    out_lines.append("")
    out_lines += insert_statements("companies", company_cols, companies)
    out_lines.append("")
    out_lines += insert_statements("beneficiaries", beneficiary_cols, beneficiaries)
    out_lines.append("")
    out_lines += insert_statements("declarations", decl_cols, declarations)
    out_lines.append("")
    out_lines.append("COMMIT;")

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(out_lines) + "\n")

    print(f"declarations: {len(declarations)}")
    print(f"companies: {len(companies)}")
    print(f"beneficiaries: {len(beneficiaries)}")
    print(f"countries: {len(countries)}")
    print(f"currencies: {len(currencies)}")
    print(f"wrote {OUT_PATH}")


if __name__ == "__main__":
    build()
