CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  photo_url     TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  is_display    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS is_display BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS sales (
  id          SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  commission  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (commission >= 0),
  date        DATE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_employee_id ON sales(employee_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_employee_date ON sales(employee_id, date);
