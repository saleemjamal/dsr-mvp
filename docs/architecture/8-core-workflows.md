# 8. Core Workflows

### Daily Sales Entry with Validation
1. Store manager enters tender breakdown
2. System fetches GoFrugal data for comparison
3. If variance > ₹100, explanation required
4. Creates cash movements for cash tender only

### Hourly Sync Process
1. Vercel Cron triggers at :05 past hour
2. Fetch incremental data from GoFrugal
3. Store in gofrugal_sales table
4. Run validation against manual entries
5. Create variance alerts if needed
