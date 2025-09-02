# Daily Cash Tracking System - Implementation Plan

## Executive Summary
Implement a comprehensive daily cash tracking system that maintains day-by-day cash positions while supporting multi-day deposit accumulation for weekends and bank holidays.

## Phase 1: Database Schema (Week 1)

### 1.1 Create Core Tables

#### daily_cash_positions
```sql
CREATE TABLE daily_cash_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  business_date DATE NOT NULL,
  
  -- Opening balance (carried from previous day)
  opening_balance DECIMAL(12,2) DEFAULT 0,
  
  -- Daily inflows
  cash_sales DECIMAL(12,2) DEFAULT 0,
  so_advances DECIMAL(12,2) DEFAULT 0,
  gift_voucher_sales DECIMAL(12,2) DEFAULT 0,
  hand_bill_collections DECIMAL(12,2) DEFAULT 0,
  petty_transfers_in DECIMAL(12,2) DEFAULT 0,
  other_receipts DECIMAL(12,2) DEFAULT 0,
  
  -- Daily outflows  
  cash_returns DECIMAL(12,2) DEFAULT 0,
  cash_refunds DECIMAL(12,2) DEFAULT 0,
  petty_transfers_out DECIMAL(12,2) DEFAULT 0,
  cash_deposits DECIMAL(12,2) DEFAULT 0,
  
  -- Calculated closing (using GENERATED column)
  closing_balance DECIMAL(12,2) GENERATED ALWAYS AS (
    opening_balance 
    + cash_sales + so_advances + gift_voucher_sales 
    + hand_bill_collections + petty_transfers_in + other_receipts
    - cash_returns - cash_refunds - petty_transfers_out - cash_deposits
  ) STORED,
  
  -- Deposit tracking
  deposit_status VARCHAR(20) DEFAULT 'pending' CHECK (
    deposit_status IN ('pending', 'deposited', 'partial', 'carried_forward')
  ),
  deposit_id UUID REFERENCES cash_deposits(id),
  deposited_amount DECIMAL(12,2),
  deposited_at TIMESTAMPTZ,
  
  -- Counting & reconciliation
  count_id UUID REFERENCES cash_counts(id),
  counted_amount DECIMAL(12,2),
  count_variance DECIMAL(12,2),
  variance_reason TEXT,
  variance_resolved BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  is_bank_holiday BOOLEAN DEFAULT FALSE,
  holiday_name VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),
  
  -- Constraints
  UNIQUE(store_id, business_date),
  CHECK (closing_balance >= 0 OR variance_resolved = TRUE)
);

-- Indexes for performance
CREATE INDEX idx_daily_cash_store_date ON daily_cash_positions(store_id, business_date DESC);
CREATE INDEX idx_daily_cash_deposit_status ON daily_cash_positions(deposit_status) 
  WHERE deposit_status = 'pending';
CREATE INDEX idx_daily_cash_variance ON daily_cash_positions(store_id, variance_resolved) 
  WHERE variance_resolved = FALSE;
```

#### deposit_day_mappings
```sql
CREATE TABLE deposit_day_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES cash_deposits(id) ON DELETE CASCADE,
  daily_position_id UUID NOT NULL REFERENCES daily_cash_positions(id),
  business_date DATE NOT NULL,
  amount_included DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(deposit_id, daily_position_id)
);

CREATE INDEX idx_deposit_mappings_deposit ON deposit_day_mappings(deposit_id);
CREATE INDEX idx_deposit_mappings_date ON deposit_day_mappings(business_date);
```

### 1.2 Update Existing Tables

```sql
-- Add fields to cash_deposits
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS from_date DATE;
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS to_date DATE;
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS days_included INTEGER;
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS accumulated_amount DECIMAL(12,2);
ALTER TABLE cash_deposits ADD COLUMN IF NOT EXISTS pre_deposit_balance DECIMAL(12,2);
```

### 1.3 Create Supporting Views

```sql
-- Pending deposits summary
CREATE VIEW pending_deposits_summary AS
SELECT 
  store_id,
  stores.store_name,
  MIN(business_date) as oldest_pending_date,
  MAX(business_date) as latest_pending_date,
  COUNT(*) as days_pending,
  SUM(closing_balance) as total_pending_amount,
  MAX(CURRENT_DATE - business_date) as oldest_days_ago,
  ARRAY_AGG(
    json_build_object(
      'date', business_date,
      'amount', closing_balance,
      'is_holiday', is_bank_holiday
    ) ORDER BY business_date
  ) as daily_breakdown
FROM daily_cash_positions
JOIN stores ON stores.id = daily_cash_positions.store_id
WHERE deposit_status = 'pending'
  AND closing_balance > 0
GROUP BY store_id, stores.store_name;

-- Daily cash flow view
CREATE VIEW daily_cash_flow AS
SELECT 
  dcp.*,
  COALESCE(dcp.counted_amount, dcp.closing_balance) as effective_balance,
  CASE 
    WHEN deposit_status = 'pending' AND (CURRENT_DATE - business_date) > 3 
    THEN 'overdue'
    WHEN deposit_status = 'pending' AND (CURRENT_DATE - business_date) = 3 
    THEN 'due_today'
    WHEN deposit_status = 'pending' 
    THEN 'accumulating'
    ELSE deposit_status
  END as deposit_urgency,
  s.store_name,
  s.store_code
FROM daily_cash_positions dcp
JOIN stores s ON s.id = dcp.store_id;
```

## Phase 2: Backend Services (Week 1-2)

### 2.1 Core Functions

```typescript
// lib/daily-cash-service.ts

export interface DailyCashPosition {
  id: string
  storeId: string
  businessDate: string
  openingBalance: number
  cashSales: number
  soAdvances: number
  giftVoucherSales: number
  handBillCollections: number
  pettyTransfersIn: number
  otherReceipts: number
  cashReturns: number
  cashRefunds: number
  pettyTransfersOut: number
  cashDeposits: number
  closingBalance: number
  depositStatus: 'pending' | 'deposited' | 'partial' | 'carried_forward'
  depositId?: string
  depositedAmount?: number
  depositedAt?: string
  countId?: string
  countedAmount?: number
  countVariance?: number
  varianceReason?: string
  varianceResolved: boolean
  isBankHoliday: boolean
  holidayName?: string
  notes?: string
}

// Get or create today's position
export async function ensureDailyPosition(
  storeId: string, 
  date: string = today()
): Promise<DailyCashPosition> {
  // Check if exists
  let position = await getDailyPosition(storeId, date)
  
  if (!position) {
    // Get yesterday's closing as today's opening
    const yesterday = await getDailyPosition(storeId, previousDay(date))
    const openingBalance = yesterday?.closingBalance || 0
    
    position = await createDailyPosition({
      storeId,
      businessDate: date,
      openingBalance,
      depositStatus: 'pending'
    })
  }
  
  return position
}

// Update daily position from movements
export async function updateDailyFromMovement(
  movement: CashMovement
): Promise<void> {
  const position = await ensureDailyPosition(
    movement.store_id, 
    movement.movement_date
  )
  
  const updates: Partial<DailyCashPosition> = {}
  
  switch(movement.movement_type) {
    case 'sale':
      updates.cashSales = (position.cashSales || 0) + movement.amount
      break
    case 'advance':
      updates.soAdvances = (position.soAdvances || 0) + movement.amount
      break
    case 'transfer_out':
      updates.pettyTransfersOut = (position.pettyTransfersOut || 0) + movement.amount
      break
    // ... other cases
  }
  
  await updateDailyPosition(position.id, updates)
}

// Get pending positions for deposit
export async function getPendingPositions(
  storeId: string,
  maxDays?: number
): Promise<DailyCashPosition[]> {
  return await supabase
    .from('daily_cash_positions')
    .select('*')
    .eq('store_id', storeId)
    .eq('deposit_status', 'pending')
    .gt('closing_balance', 0)
    .order('business_date', { ascending: true })
    .limit(maxDays || 30)
}

// Create deposit from multiple days
export async function createMultiDayDeposit(params: {
  storeId: string
  positionIds: string[]
  depositAmount: number
  depositSlipNumber: string
  bankName: string
  depositedBy: string
  notes?: string
}): Promise<CashDeposit> {
  // Start transaction
  const positions = await getPositionsByIds(params.positionIds)
  
  // Validate amount matches
  const totalPending = positions.reduce((sum, p) => sum + p.closingBalance, 0)
  if (Math.abs(totalPending - params.depositAmount) > 0.01) {
    throw new Error(`Deposit amount (${params.depositAmount}) must match pending total (${totalPending})`)
  }
  
  // Create deposit record
  const deposit = await createCashDeposit({
    ...params,
    from_date: positions[0].businessDate,
    to_date: positions[positions.length - 1].businessDate,
    days_included: positions.length,
    accumulated_amount: totalPending
  })
  
  // Mark positions as deposited
  await markPositionsAsDeposited(params.positionIds, deposit.id)
  
  // Create day mappings
  await createDayMappings(deposit.id, positions)
  
  // Create cash movement
  await createDepositMovement(params.storeId, params.depositAmount, deposit.id)
  
  return deposit
}
```

### 2.2 Database Triggers

```sql
-- Auto-update daily positions from movements
CREATE OR REPLACE FUNCTION update_daily_position_from_movement()
RETURNS TRIGGER AS $$
DECLARE
  daily_position_id UUID;
BEGIN
  -- Get or create daily position
  INSERT INTO daily_cash_positions (store_id, business_date, opening_balance)
  VALUES (NEW.store_id, NEW.movement_date::date, 0)
  ON CONFLICT (store_id, business_date) DO NOTHING
  RETURNING id INTO daily_position_id;
  
  -- Update the appropriate column based on movement type
  UPDATE daily_cash_positions
  SET 
    cash_sales = CASE 
      WHEN NEW.movement_type = 'sale' AND NEW.account_type = 'sales_cash'
      THEN COALESCE(cash_sales, 0) + NEW.amount
      ELSE cash_sales
    END,
    so_advances = CASE
      WHEN NEW.movement_type = 'advance' 
      THEN COALESCE(so_advances, 0) + NEW.amount  
      ELSE so_advances
    END,
    petty_transfers_out = CASE
      WHEN NEW.movement_type = 'transfer_out' AND NEW.account_type = 'sales_cash'
      THEN COALESCE(petty_transfers_out, 0) + NEW.amount
      ELSE petty_transfers_out
    END,
    updated_at = NOW()
  WHERE store_id = NEW.store_id 
    AND business_date = NEW.movement_date::date;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_position
AFTER INSERT ON cash_movements
FOR EACH ROW
EXECUTE FUNCTION update_daily_position_from_movement();

-- Carry forward closing balance to next day opening
CREATE OR REPLACE FUNCTION carry_forward_balance()
RETURNS void AS $$
DECLARE
  store RECORD;
  yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  today DATE := CURRENT_DATE;
BEGIN
  FOR store IN SELECT id FROM stores WHERE is_active = true LOOP
    INSERT INTO daily_cash_positions (
      store_id, 
      business_date, 
      opening_balance
    )
    SELECT 
      store.id,
      today,
      COALESCE(closing_balance, 0)
    FROM daily_cash_positions
    WHERE store_id = store.id
      AND business_date = yesterday
    ON CONFLICT (store_id, business_date) 
    DO UPDATE SET
      opening_balance = EXCLUDED.opening_balance
    WHERE daily_cash_positions.opening_balance = 0;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule daily at midnight
SELECT cron.schedule('carry-forward-balances', '0 0 * * *', 'SELECT carry_forward_balance()');
```

## Phase 3: UI Implementation (Week 2-3)

### 3.1 Cash Management Dashboard Enhancement

```typescript
// app/cash-management/page.tsx updates

interface DailyCashSummary {
  today: DailyCashPosition
  pendingDays: DailyCashPosition[]
  totalPending: number
  oldestPendingDays: number
  requiresDeposit: boolean
  depositUrgency: 'normal' | 'warning' | 'critical'
}

export default function CashManagementPage() {
  const [dailySummary, setDailySummary] = useState<DailyCashSummary>()
  
  return (
    <div>
      {/* Daily Position Card */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Cash Position</CardTitle>
          <Badge variant={getUrgencyVariant(dailySummary?.depositUrgency)}>
            {dailySummary?.pendingDays.length} days pending
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Today's Summary */}
            <div>
              <h4>Today: {format(new Date(), 'MMM dd, yyyy')}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Opening Balance</Label>
                  <div className="text-2xl font-bold">
                    ₹{dailySummary?.today.openingBalance}
                  </div>
                </div>
                <div>
                  <Label>Current Balance</Label>
                  <div className="text-2xl font-bold">
                    ₹{dailySummary?.today.closingBalance}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Pending Days Accordion */}
            <Accordion>
              <AccordionItem value="pending">
                <AccordionTrigger>
                  Pending Deposit: ₹{dailySummary?.totalPending} 
                  ({dailySummary?.pendingDays.length} days)
                </AccordionTrigger>
                <AccordionContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Sales</TableHead>
                        <TableHead>Advances</TableHead>
                        <TableHead>Transfers</TableHead>
                        <TableHead>Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailySummary?.pendingDays.map(day => (
                        <TableRow key={day.id}>
                          <TableCell>
                            {format(new Date(day.businessDate), 'MMM dd')}
                            {day.isBankHoliday && (
                              <Badge variant="outline" className="ml-2">
                                {day.holidayName}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>₹{day.cashSales}</TableCell>
                          <TableCell>₹{day.soAdvances}</TableCell>
                          <TableCell>₹{day.pettyTransfersOut}</TableCell>
                          <TableCell className="font-bold">
                            ₹{day.closingBalance}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/cash-management/deposit')}
                variant={dailySummary?.requiresDeposit ? 'default' : 'outline'}
              >
                Record Deposit
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push('/cash-management/daily-report')}
              >
                View Daily Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3.2 Enhanced Deposit Page

```typescript
// app/cash-management/deposit/page.tsx

export default function DepositPage() {
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const [pendingPositions, setPendingPositions] = useState<DailyCashPosition[]>([])
  
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Record Bank Deposit</CardTitle>
          <CardDescription>
            Select days to include in this deposit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Day Selection */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectAll}
              >
                Select All
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={selectLast3Days}
              >
                Last 3 Days
              </Button>
            </div>
            
            {/* Daily Breakdown Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Other</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPositions.map(position => (
                  <TableRow 
                    key={position.id}
                    className={selectedDays.includes(position.id) ? 'bg-muted/50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedDays.includes(position.id)}
                        onCheckedChange={() => toggleDay(position.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(position.businessDate), 'MMM dd')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(position.businessDate), 'EEEE')}
                      {position.isBankHoliday && (
                        <Badge variant="outline" className="ml-2" size="sm">
                          Holiday
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>₹{position.cashSales}</TableCell>
                    <TableCell>
                      ₹{position.soAdvances + position.giftVoucherSales}
                    </TableCell>
                    <TableCell className="font-bold">
                      ₹{position.closingBalance}
                    </TableCell>
                    <TableCell>
                      {getDaysAgo(position.businessDate) > 3 ? (
                        <Badge variant="destructive">
                          {getDaysAgo(position.businessDate)} days old
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>Selected Total</TableCell>
                  <TableCell className="font-bold text-lg">
                    ₹{calculateSelectedTotal()}
                  </TableCell>
                  <TableCell>
                    {selectedDays.length} days
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
            
            {/* Deposit Form */}
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Deposit Amount*</Label>
                <Input
                  type="number"
                  value={calculateSelectedTotal()}
                  disabled
                  className="font-bold"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Must deposit full amount
                </p>
              </div>
              
              <div>
                <Label>Counted Amount</Label>
                <Input
                  type="number"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                  placeholder="Enter if different"
                />
              </div>
            </div>
            
            {/* Variance Alert */}
            {variance !== 0 && (
              <Alert variant={Math.abs(variance) > threshold ? "destructive" : "warning"}>
                <AlertTitle>Variance Detected</AlertTitle>
                <AlertDescription>
                  Expected: ₹{calculateSelectedTotal()}, 
                  Counted: ₹{countedAmount}, 
                  Variance: ₹{variance}
                  {Math.abs(variance) > threshold && (
                    <div className="mt-2">
                      <Label>Explanation Required*</Label>
                      <Textarea
                        value={varianceReason}
                        onChange={(e) => setVarianceReason(e.target.value)}
                        required
                      />
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={handleDeposit}
              disabled={!canDeposit()}
              className="w-full"
            >
              Record Deposit for {selectedDays.length} Days
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3.3 New Daily Report Page

```typescript
// app/cash-management/daily-report/page.tsx

export default function DailyReportPage() {
  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Daily Cash Report</CardTitle>
          <FilterBar />
        </CardHeader>
        <CardContent>
          {/* Calendar View */}
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map(day => (
              <div
                key={day}
                className={cn(
                  "p-2 border rounded text-center",
                  getStatusColor(positions[day])
                )}
              >
                <div className="text-sm">{format(day, 'd')}</div>
                <div className="font-bold">₹{positions[day]?.closingBalance || 0}</div>
                <Badge size="sm" variant={getStatusVariant(positions[day])}>
                  {positions[day]?.depositStatus || 'no-data'}
                </Badge>
              </div>
            ))}
          </div>
          
          {/* Monthly Summary */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader>Total Sales</CardHeader>
              <CardContent>₹{monthlyTotals.sales}</CardContent>
            </Card>
            <Card>
              <CardHeader>Total Deposits</CardHeader>
              <CardContent>₹{monthlyTotals.deposits}</CardContent>
            </Card>
            <Card>
              <CardHeader>Pending</CardHeader>
              <CardContent>₹{monthlyTotals.pending}</CardContent>
            </Card>
            <Card>
              <CardHeader>Deposit Frequency</CardHeader>
              <CardContent>{averageDaysBetweenDeposits} days avg</CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## Phase 4: Migration Strategy (Week 3)

### 4.1 Data Migration Script

```sql
-- Populate historical daily positions from cash_movements
INSERT INTO daily_cash_positions (
  store_id,
  business_date,
  cash_sales,
  so_advances,
  petty_transfers_out,
  closing_balance,
  deposit_status
)
SELECT 
  store_id,
  movement_date::date as business_date,
  SUM(CASE WHEN movement_type = 'sale' THEN amount ELSE 0 END) as cash_sales,
  SUM(CASE WHEN movement_type = 'advance' THEN amount ELSE 0 END) as so_advances,
  SUM(CASE WHEN movement_type = 'transfer_out' THEN amount ELSE 0 END) as petty_transfers_out,
  SUM(CASE 
    WHEN movement_type IN ('sale', 'advance') THEN amount
    WHEN movement_type IN ('transfer_out', 'deposit') THEN -amount
    ELSE 0
  END) as closing_balance,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM cash_deposits cd 
      WHERE cd.store_id = cm.store_id 
      AND cd.deposit_date = cm.movement_date::date
    ) THEN 'deposited'
    ELSE 'pending'
  END as deposit_status
FROM cash_movements cm
WHERE account_type = 'sales_cash'
GROUP BY store_id, movement_date::date
ON CONFLICT (store_id, business_date) DO NOTHING;

-- Update opening balances
UPDATE daily_cash_positions t1
SET opening_balance = (
  SELECT COALESCE(t2.closing_balance, 0)
  FROM daily_cash_positions t2
  WHERE t2.store_id = t1.store_id
    AND t2.business_date = t1.business_date - INTERVAL '1 day'
)
WHERE opening_balance = 0;
```

### 4.2 Parallel Running Period

1. **Week 1-2**: Run new system in read-only mode
   - Display daily positions alongside existing views
   - No writes to daily_cash_positions yet
   - Validate calculations match

2. **Week 3**: Shadow writes
   - Write to both systems
   - Compare results
   - Fix any discrepancies

3. **Week 4**: Gradual cutover
   - New deposits use daily system
   - Old deposits remain unchanged
   - Monitor for issues

4. **Week 5**: Full migration
   - All operations use daily system
   - Keep old tables for historical reference
   - Archive after 3 months

## Phase 5: Testing Plan (Week 3-4)

### 5.1 Unit Tests

```typescript
describe('Daily Cash Position', () => {
  it('should carry forward closing balance to next day opening', async () => {
    const yesterday = await createDailyPosition({
      businessDate: '2024-01-31',
      closingBalance: 15000
    })
    
    const today = await ensureDailyPosition(storeId, '2024-02-01')
    
    expect(today.openingBalance).toBe(15000)
  })
  
  it('should accumulate movements correctly', async () => {
    const position = await ensureDailyPosition(storeId, '2024-02-01')
    
    await createMovement({ type: 'sale', amount: 5000 })
    await createMovement({ type: 'advance', amount: 3000 })
    await createMovement({ type: 'transfer_out', amount: 1000 })
    
    const updated = await getDailyPosition(storeId, '2024-02-01')
    
    expect(updated.cashSales).toBe(5000)
    expect(updated.soAdvances).toBe(3000)
    expect(updated.pettyTransfersOut).toBe(1000)
    expect(updated.closingBalance).toBe(position.openingBalance + 7000)
  })
  
  it('should handle multi-day deposits correctly', async () => {
    const positions = await createMultipleDayPositions(3)
    const totalAmount = positions.reduce((sum, p) => sum + p.closingBalance, 0)
    
    const deposit = await createMultiDayDeposit({
      positionIds: positions.map(p => p.id),
      depositAmount: totalAmount
    })
    
    expect(deposit.days_included).toBe(3)
    expect(deposit.accumulated_amount).toBe(totalAmount)
    
    // Check positions marked as deposited
    for (const position of positions) {
      const updated = await getDailyPosition(position.storeId, position.businessDate)
      expect(updated.depositStatus).toBe('deposited')
    }
  })
})
```

### 5.2 Integration Tests

```typescript
describe('Deposit Workflow', () => {
  it('should prevent deposit if variance exceeds threshold', async () => {
    const positions = await setupPendingPositions(3, 10000) // 3 days, 10k each
    
    await expect(
      createDeposit({
        positionIds: positions.map(p => p.id),
        depositAmount: 25000, // Should be 30000
        requireExplanation: false
      })
    ).rejects.toThrow('Variance exceeds threshold')
  })
  
  it('should alert for deposits older than 3 days', async () => {
    const oldPosition = await createDailyPosition({
      businessDate: daysAgo(4),
      closingBalance: 10000
    })
    
    const alerts = await getDepositAlerts(storeId)
    
    expect(alerts).toContainEqual({
      type: 'overdue_deposit',
      severity: 'high',
      message: expect.stringContaining('4 days')
    })
  })
})
```

### 5.3 End-to-End Tests

```typescript
describe('Complete Daily Cycle', () => {
  it('should handle full day cycle correctly', async () => {
    // Morning: carry forward balance
    await triggerDailyCarryForward()
    
    // Day: record sales
    await recordSale({ amount: 5000, tenderType: 'cash' })
    await recordSale({ amount: 3000, tenderType: 'cash' })
    
    // Evening: count cash
    await recordCashCount({ amount: 8000 })
    
    // Next morning: check position
    const position = await getDailyPosition(storeId, today())
    
    expect(position.cashSales).toBe(8000)
    expect(position.countVariance).toBe(0)
    expect(position.depositStatus).toBe('pending')
  })
})
```

## Phase 6: Monitoring & Alerts (Week 4)

### 6.1 Dashboard Metrics

```sql
-- Real-time monitoring view
CREATE VIEW cash_monitoring_metrics AS
SELECT
  s.store_name,
  COUNT(CASE WHEN deposit_status = 'pending' THEN 1 END) as pending_days,
  SUM(CASE WHEN deposit_status = 'pending' THEN closing_balance ELSE 0 END) as pending_amount,
  MAX(CASE WHEN deposit_status = 'pending' THEN CURRENT_DATE - business_date END) as oldest_pending_days,
  AVG(CASE WHEN count_variance IS NOT NULL THEN ABS(count_variance) END) as avg_variance,
  COUNT(CASE WHEN variance_resolved = FALSE THEN 1 END) as unresolved_variances
FROM daily_cash_positions dcp
JOIN stores s ON s.id = dcp.store_id
WHERE business_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.store_name;
```

### 6.2 Alert Rules

```typescript
const alertRules = [
  {
    name: 'Overdue Deposit',
    condition: (position) => position.daysOld > 3 && position.depositStatus === 'pending',
    severity: 'high',
    notification: 'email,sms'
  },
  {
    name: 'High Variance',
    condition: (position) => Math.abs(position.countVariance) > 500,
    severity: 'medium',
    notification: 'email'
  },
  {
    name: 'Missing Daily Position',
    condition: (store) => !store.todayPosition,
    severity: 'low',
    notification: 'dashboard'
  }
]
```

## Phase 7: Documentation & Training (Week 4)

### 7.1 User Documentation
- Daily cash tracking workflow
- How to handle multi-day deposits
- Variance resolution process
- Bank holiday procedures

### 7.2 Admin Documentation
- System architecture
- Database schema
- Troubleshooting guide
- Alert configuration

### 7.3 Training Materials
- Video walkthrough
- Step-by-step guides
- FAQ document
- Quick reference cards

## Success Metrics

### Technical Metrics
- Zero data loss during migration
- < 2 second page load times
- 99.9% uptime
- All tests passing

### Business Metrics
- Reduce undeposited days from avg 4 to 2
- Decrease variance incidents by 50%
- Improve deposit reconciliation time by 75%
- 100% daily position tracking

### User Satisfaction
- User training completion rate > 90%
- Support tickets < 10 in first month
- User satisfaction score > 4.5/5

## Risk Mitigation

### Risk 1: Data Migration Errors
- **Mitigation**: Run parallel for 2 weeks, daily reconciliation reports

### Risk 2: User Resistance
- **Mitigation**: Gradual rollout, comprehensive training, maintain old views initially

### Risk 3: Performance Issues
- **Mitigation**: Proper indexing, pagination, caching strategies

### Risk 4: Calculation Discrepancies
- **Mitigation**: Extensive testing, audit logs, manual override capability

## Timeline Summary

- **Week 1**: Database schema, basic backend
- **Week 2**: Complete backend, start UI
- **Week 3**: Complete UI, migration scripts, testing
- **Week 4**: Deploy to staging, training, monitoring setup
- **Week 5**: Production rollout (phased)
- **Week 6**: Full adoption, decommission old system

## Appendix: SQL Scripts

[Full migration scripts, indexes, views, and functions would be included here]

## Appendix: API Documentation

[Complete API endpoint documentation would be included here]

This plan provides a comprehensive approach to implementing daily cash tracking while maintaining system stability and user confidence.