# 9. Database Schema

### New Tables (Simplified)

```sql
-- Store GoFrugal API data
CREATE TABLE gofrugal_sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id),
  sale_date date NOT NULL,
  total_amount numeric NOT NULL,
  transaction_count integer,
  raw_data jsonb,
  sync_timestamp timestamp DEFAULT now(),
  UNIQUE(store_id, sale_date)
);

-- Track reconciliation
CREATE TABLE reconciliation_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id),
  reconciliation_date date NOT NULL,
  manual_total numeric NOT NULL,
  api_total numeric NOT NULL,
  variance_amount numeric GENERATED ALWAYS AS (manual_total - api_total) STORED,
  status varchar CHECK (status IN ('matched', 'variance', 'resolved')),
  resolution_notes text,
  UNIQUE(store_id, reconciliation_date)
);

-- Variance alerts
CREATE TABLE variance_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid REFERENCES stores(id),
  alert_date date DEFAULT CURRENT_DATE,
  variance_amount numeric NOT NULL,
  threshold_amount numeric DEFAULT 100,
  acknowledged_at timestamp
);

-- Indexes for performance
CREATE INDEX idx_gofrugal_date ON gofrugal_sales(store_id, sale_date);
CREATE INDEX idx_recon_date ON reconciliation_logs(store_id, reconciliation_date);
```
