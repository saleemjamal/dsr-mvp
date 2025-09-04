# Section 7: Security & Compliance

### Security Requirements

**Authentication & Authorization:**
- Supabase Auth with email/password and Google SSO
- Whitelist model: Users must exist in database before login
- Role-based access control (Store User, AIC, Super User)
- Store-level data isolation via RLS policies
- Session management with 30-minute inactivity timeout
- API key rotation every 90 days

**Data Protection Standards:**
```typescript
// Encryption requirements
const SECURITY_CONFIG = {
  // Data in transit
  API_ENCRYPTION: 'TLS 1.3',
  DATABASE_CONNECTION: 'SSL required',
  
  // Data at rest
  SENSITIVE_FIELDS: ['bank_account', 'gst_number', 'phone'],
  ENCRYPTION_METHOD: 'AES-256-GCM',
  
  // Access logging
  AUDIT_EVENTS: ['login', 'data_export', 'reconciliation', 'adjustment'],
  LOG_RETENTION: '2 years',
  
  // Session security
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  CONCURRENT_SESSIONS: 3, // Max per user
}
```

**Financial Data Security:**
- No storage of complete bank account numbers (last 4 digits only)
- Cash variance audit trail with immutable logs
- Approval workflows for adjustments >₹5,000
- Segregation of duties (entry vs approval)
- Daily backup with point-in-time recovery

### Compliance Requirements

**GST Compliance:**
- Tender-type accuracy for GST filing
- HSN/SAC code support for items
- GSTR-1 and GSTR-3B report generation
- E-invoice readiness (Phase 2)
- Audit trail for all modifications

**Data Privacy (India):**
- Compliance with IT Act 2000 amendments
- User consent for data collection
- Data localization (servers in India)
- Right to data portability
- PII data masking in exports

**Financial Regulations:**
- PCI DSS compliance for card data (no storage, only totals)
- Anti-money laundering checks for large cash transactions
- Suspicious transaction reporting (>₹10 lakh cash)
- Retention of financial records for 8 years

### Access Control Matrix

| Role | Stores | View Sales | Edit Sales | Reconcile | Approve | Admin | Reports |
|------|--------|------------|------------|-----------|---------|-------|---------|
| Store User | Assigned only | ✓ Own | ✓ Pending only | ✗ | ✗ | ✗ | Own store |
| AIC | All assigned | ✓ All | ✓ Pending only | ✓ | ✓ <₹5000 | ✗ | All assigned |
| Super User | All | ✓ All | ✓ All | ✓ | ✓ All | ✓ | All |
| Owner | All | ✓ All | ✗ | ✗ | ✓ All | ✗ | All |

### Audit & Monitoring

**Audit Trail Requirements:**
```sql
-- Immutable audit log
CREATE TABLE audit_log (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  action varchar(50) NOT NULL,
  entity_type varchar(50),
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp DEFAULT now(),
  -- No update or delete allowed
  CHECK (false) NO INHERIT
);
```

**Monitoring & Alerts:**
- Failed login attempts (>3 = temporary lock)
- Unusual variance patterns (ML-based anomaly detection)
- Bulk data exports (alert for >1000 records)
- After-hours access from new IP
- API sync failures (>3 consecutive)

### Data Governance

**Data Retention Policy:**
- Transaction data: 8 years (legal requirement)
- Audit logs: 2 years active, 6 years archived
- User activity: 1 year
- Temporary/cache data: 7 days
- Backups: 30 days rolling

**Data Quality Controls:**
- Input validation on all forms
- Referential integrity via foreign keys
- Duplicate detection for transactions
- Automatic data cleansing rules
- Regular data quality reports

---
