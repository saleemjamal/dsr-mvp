import { format, parseISO } from 'date-fns'
import { getSalesForDateRange } from './sales-service'
import { getExpensesForDateRange } from './expense-service'
import { getHandBillsForDateRange } from './hand-bills-service'
import { getReturnsForDateRange } from './returns-service'

export interface TallyExportConfig {
  dateFrom: string
  dateTo: string
  storeIds: string[] | null
  format: 'xml' | 'excel' | 'csv'
  voucherTypes: string[]
  includeGST: boolean
  groupByStore: boolean
  companyName?: string
}

export interface TallyVoucher {
  date: string
  voucherType: string
  voucherNumber: string
  narration: string
  ledgerEntries: TallyLedgerEntry[]
  reference?: string
  storeCode?: string
}

export interface TallyLedgerEntry {
  ledgerName: string
  amount: number
  isDeemedPositive: boolean
  gstRate?: number
  gstAmount?: number
}

// Standard Tally ledger mappings - these should match your Tally chart of accounts
const TALLY_LEDGERS = {
  // Income Ledgers
  CASH_SALES: 'Cash Sales',
  CARD_SALES: 'Card Sales', 
  UPI_SALES: 'UPI Sales',
  HAND_BILL_SALES: 'Credit Sales',
  
  // Asset Ledgers
  CASH_IN_HAND: 'Cash in Hand',
  BANK_ACCOUNT: 'Bank Account',
  ACCOUNTS_RECEIVABLE: 'Accounts Receivable',
  
  // Expense Ledgers (will be mapped based on expense categories)
  OFFICE_EXPENSES: 'Office Expenses',
  TRAVEL_EXPENSES: 'Travel Expenses',
  UTILITIES: 'Utilities',
  MISCELLANEOUS: 'Miscellaneous Expenses',
  
  // GST Ledgers
  GST_OUTPUT: 'GST Output',
  GST_INPUT: 'GST Input'
}

/**
 * Main function to export data in Tally format
 */
export async function generateTallyExport(config: TallyExportConfig): Promise<{ content: string; filename: string }> {
  // Load all transaction data
  const [salesData, expensesData, handBillsData, returnsData] = await Promise.all([
    getSalesForDateRange(config.dateFrom, config.dateTo, config.storeIds),
    getExpensesForDateRange(config.dateFrom, config.dateTo, config.storeIds),
    getHandBillsForDateRange(config.dateFrom, config.dateTo, config.storeIds),
    getReturnsForDateRange(config.dateFrom, config.dateTo, config.storeIds)
  ])

  // Convert transactions to Tally vouchers
  const vouchers: TallyVoucher[] = []
  
  // Add sales vouchers
  if (config.voucherTypes.includes('sales') && salesData) {
    vouchers.push(...convertSalesToVouchers(salesData, config))
  }
  
  // Add payment vouchers (expenses)
  if (config.voucherTypes.includes('payment') && expensesData) {
    vouchers.push(...convertExpensesToVouchers(expensesData, config))
  }
  
  // Add receipt vouchers (advances, hand bills)
  if (config.voucherTypes.includes('receipt') && handBillsData) {
    vouchers.push(...convertHandBillsToVouchers(handBillsData, config))
  }
  
  // Add journal vouchers (returns, adjustments)
  if (config.voucherTypes.includes('journal') && returnsData) {
    vouchers.push(...convertReturnsToVouchers(returnsData, config))
  }

  // Generate output based on format
  switch (config.format) {
    case 'xml':
      return generateTallyXML(vouchers, config)
    case 'excel':
      return generateExcel(vouchers, config)
    case 'csv':
      return generateCSV(vouchers, config)
    default:
      throw new Error(`Unsupported export format: ${config.format}`)
  }
}

/**
 * Convert sales transactions to Tally sales vouchers
 */
function convertSalesToVouchers(salesData: any[], config: TallyExportConfig): TallyVoucher[] {
  return salesData.map((sale, index) => {
    const voucherNumber = `S${format(parseISO(sale.created_at), 'yyyyMMdd')}-${String(index + 1).padStart(4, '0')}`
    const date = format(parseISO(sale.created_at), 'yyyyMMdd')
    const storeCode = sale.stores?.store_code || 'MAIN'
    
    // Determine sales ledger based on payment method
    let salesLedger = TALLY_LEDGERS.CASH_SALES
    switch (sale.tender_type?.toLowerCase()) {
      case 'card':
      case 'credit_card':
      case 'debit_card':
        salesLedger = TALLY_LEDGERS.CARD_SALES
        break
      case 'upi':
      case 'digital':
        salesLedger = TALLY_LEDGERS.UPI_SALES
        break
      default:
        salesLedger = TALLY_LEDGERS.CASH_SALES
    }
    
    const ledgerEntries: TallyLedgerEntry[] = [
      // Debit: Cash/Bank (Asset increases)
      {
        ledgerName: sale.tender_type?.toLowerCase() === 'cash' ? TALLY_LEDGERS.CASH_IN_HAND : TALLY_LEDGERS.BANK_ACCOUNT,
        amount: sale.amount,
        isDeemedPositive: true // Debit
      },
      // Credit: Sales (Income increases)
      {
        ledgerName: salesLedger,
        amount: -sale.amount, // Negative for credit
        isDeemedPositive: false
      }
    ]
    
    // Add GST entries if enabled and GST applicable
    if (config.includeGST && sale.amount > 0) {
      const gstRate = 18 // Default GST rate - should be configurable
      const baseAmount = sale.amount / (1 + gstRate / 100)
      const gstAmount = sale.amount - baseAmount
      
      if (gstAmount > 0) {
        // Adjust sales amount to exclude GST
        ledgerEntries[1].amount = -baseAmount
        
        // Add GST output entry
        ledgerEntries.push({
          ledgerName: TALLY_LEDGERS.GST_OUTPUT,
          amount: -gstAmount,
          isDeemedPositive: false,
          gstRate,
          gstAmount
        })
      }
    }

    return {
      date,
      voucherType: 'Sales',
      voucherNumber,
      narration: `Sales - ${sale.stores?.store_name || 'Store'} - ${sale.tender_type || 'Cash'}`,
      ledgerEntries,
      reference: sale.id,
      storeCode
    }
  })
}

/**
 * Convert expense transactions to Tally payment vouchers
 */
function convertExpensesToVouchers(expensesData: any[], config: TallyExportConfig): TallyVoucher[] {
  return expensesData.map((expense, index) => {
    const voucherNumber = `P${format(parseISO(expense.created_at), 'yyyyMMdd')}-${String(index + 1).padStart(4, '0')}`
    const date = format(parseISO(expense.created_at), 'yyyyMMdd')
    const storeCode = expense.stores?.store_code || 'MAIN'
    
    // Map expense category to Tally ledger
    let expenseLedger = TALLY_LEDGERS.MISCELLANEOUS
    const categoryName = expense.expense_categories?.name?.toLowerCase()
    
    if (categoryName?.includes('office') || categoryName?.includes('stationery')) {
      expenseLedger = TALLY_LEDGERS.OFFICE_EXPENSES
    } else if (categoryName?.includes('travel') || categoryName?.includes('transport')) {
      expenseLedger = TALLY_LEDGERS.TRAVEL_EXPENSES  
    } else if (categoryName?.includes('utility') || categoryName?.includes('electricity') || categoryName?.includes('water')) {
      expenseLedger = TALLY_LEDGERS.UTILITIES
    } else {
      // Use category name directly if available
      expenseLedger = expense.expense_categories?.name || TALLY_LEDGERS.MISCELLANEOUS
    }

    const ledgerEntries: TallyLedgerEntry[] = [
      // Debit: Expense (Expense increases)
      {
        ledgerName: expenseLedger,
        amount: expense.amount,
        isDeemedPositive: true
      },
      // Credit: Cash (Asset decreases)  
      {
        ledgerName: TALLY_LEDGERS.CASH_IN_HAND,
        amount: -expense.amount,
        isDeemedPositive: false
      }
    ]
    
    // Add GST input credit if applicable
    if (config.includeGST && expense.amount > 0) {
      const gstRate = 18 // Should be configurable or derived from expense data
      const baseAmount = expense.amount / (1 + gstRate / 100)
      const gstAmount = expense.amount - baseAmount
      
      if (gstAmount > 0) {
        // Adjust expense amount to exclude GST
        ledgerEntries[0].amount = baseAmount
        
        // Add GST input entry (GST paid can be claimed as input credit)
        ledgerEntries.push({
          ledgerName: TALLY_LEDGERS.GST_INPUT,
          amount: gstAmount,
          isDeemedPositive: true,
          gstRate,
          gstAmount
        })
      }
    }

    return {
      date,
      voucherType: 'Payment',
      voucherNumber,
      narration: `${expense.expense_categories?.name || 'Expense'} - ${expense.description || 'Payment'}`,
      ledgerEntries,
      reference: expense.id,
      storeCode
    }
  })
}

/**
 * Convert hand bills to Tally receipt vouchers
 */
function convertHandBillsToVouchers(handBillsData: any[], config: TallyExportConfig): TallyVoucher[] {
  return handBillsData.map((bill, index) => {
    const voucherNumber = `R${format(parseISO(bill.created_at), 'yyyyMMdd')}-${String(index + 1).padStart(4, '0')}`
    const date = format(parseISO(bill.created_at), 'yyyyMMdd')
    const storeCode = bill.stores?.store_code || 'MAIN'

    const ledgerEntries: TallyLedgerEntry[] = [
      // Debit: Accounts Receivable (Asset increases)
      {
        ledgerName: TALLY_LEDGERS.ACCOUNTS_RECEIVABLE,
        amount: bill.total_amount,
        isDeemedPositive: true
      },
      // Credit: Credit Sales (Income increases)
      {
        ledgerName: TALLY_LEDGERS.HAND_BILL_SALES,
        amount: -bill.total_amount,
        isDeemedPositive: false
      }
    ]

    return {
      date,
      voucherType: 'Receipt',
      voucherNumber,
      narration: `Hand Bill - ${bill.customer_name || 'Customer'} - Bill: ${bill.bill_number || 'N/A'}`,
      ledgerEntries,
      reference: bill.id,
      storeCode
    }
  })
}

/**
 * Convert returns to Tally journal vouchers
 */
function convertReturnsToVouchers(returnsData: any[], config: TallyExportConfig): TallyVoucher[] {
  return returnsData.map((returnItem, index) => {
    const voucherNumber = `J${format(parseISO(returnItem.created_at), 'yyyyMMdd')}-${String(index + 1).padStart(4, '0')}`
    const date = format(parseISO(returnItem.created_at), 'yyyyMMdd')
    const storeCode = returnItem.stores?.store_code || 'MAIN'

    // For returns, we reverse the original sale entry
    const ledgerEntries: TallyLedgerEntry[] = [
      // Debit: Sales Return (reduces income)
      {
        ledgerName: 'Sales Returns',
        amount: returnItem.return_amount,
        isDeemedPositive: true
      },
      // Credit: Cash/Bank (refund payment)
      {
        ledgerName: returnItem.refund_method?.toLowerCase() === 'cash' ? TALLY_LEDGERS.CASH_IN_HAND : TALLY_LEDGERS.BANK_ACCOUNT,
        amount: -returnItem.return_amount,
        isDeemedPositive: false
      }
    ]

    return {
      date,
      voucherType: 'Journal',
      voucherNumber,
      narration: `Return - ${returnItem.customer_name || 'Customer'} - Ref: ${returnItem.original_bill_reference}`,
      ledgerEntries,
      reference: returnItem.id,
      storeCode
    }
  })
}

/**
 * Generate Tally XML format
 */
function generateTallyXML(vouchers: TallyVoucher[], config: TallyExportConfig): { content: string; filename: string } {
  const companyName = config.companyName || 'DSR Company'
  const dateRange = `${config.dateFrom}_to_${config.dateTo}`
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">`

  // Add each voucher
  vouchers.forEach(voucher => {
    xml += `
          <VOUCHER VCHTYPE="${voucher.voucherType}" ACTION="Create">
            <DATE>${voucher.date}</DATE>
            <VOUCHERTYPENAME>${voucher.voucherType}</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucher.voucherNumber}</VOUCHERNUMBER>
            <NARRATION>${escapeXML(voucher.narration)}</NARRATION>`
    
    // Add store reference if grouping by store
    if (config.groupByStore && voucher.storeCode) {
      xml += `
            <REFERENCE>${voucher.storeCode}</REFERENCE>`
    }

    // Add ledger entries
    voucher.ledgerEntries.forEach(entry => {
      xml += `
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXML(entry.ledgerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>${entry.isDeemedPositive ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>
              <AMOUNT>${entry.amount.toFixed(2)}</AMOUNT>`
      
      // Add GST details if present
      if (entry.gstRate && entry.gstAmount) {
        xml += `
              <GSTRATE>${entry.gstRate}</GSTRATE>
              <GSTAMOUNT>${entry.gstAmount.toFixed(2)}</GSTAMOUNT>`
      }
      
      xml += `
            </ALLLEDGERENTRIES.LIST>`
    })

    xml += `
          </VOUCHER>`
  })

  xml += `
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`

  const filename = `tally_export_${dateRange}.xml`
  return { content: xml, filename }
}

/**
 * Generate Excel format (simplified structure)
 */
function generateExcel(vouchers: TallyVoucher[], config: TallyExportConfig): { content: string; filename: string } {
  // This would use a library like xlsx to generate actual Excel files
  // For now, returning CSV-like structure as placeholder
  
  let content = 'Date,Voucher Type,Voucher Number,Narration,Ledger Name,Amount,Debit/Credit\n'
  
  vouchers.forEach(voucher => {
    voucher.ledgerEntries.forEach(entry => {
      const debitCredit = entry.isDeemedPositive ? 'Debit' : 'Credit'
      const amount = Math.abs(entry.amount)
      
      content += `${voucher.date},${voucher.voucherType},"${voucher.voucherNumber}","${voucher.narration}","${entry.ledgerName}",${amount},${debitCredit}\n`
    })
  })

  const dateRange = `${config.dateFrom}_to_${config.dateTo}`
  const filename = `tally_export_${dateRange}.xlsx`
  
  return { content, filename }
}

/**
 * Generate CSV format
 */
function generateCSV(vouchers: TallyVoucher[], config: TallyExportConfig): { content: string; filename: string } {
  let content = 'Date,Voucher Type,Voucher Number,Narration,Ledger Name,Amount,Debit/Credit,Store Code\n'
  
  vouchers.forEach(voucher => {
    voucher.ledgerEntries.forEach(entry => {
      const debitCredit = entry.isDeemedPositive ? 'Debit' : 'Credit'
      const amount = Math.abs(entry.amount)
      
      content += `${voucher.date},${voucher.voucherType},"${voucher.voucherNumber}","${voucher.narration.replace(/"/g, '""')}","${entry.ledgerName}",${amount},${debitCredit},${voucher.storeCode || ''}\n`
    })
  })

  const dateRange = `${config.dateFrom}_to_${config.dateTo}`
  const filename = `tally_export_${dateRange}.csv`
  
  return { content, filename }
}

/**
 * Escape special XML characters
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Get export preview data
 */
export async function getTallyExportPreview(config: Pick<TallyExportConfig, 'dateFrom' | 'dateTo' | 'storeIds' | 'voucherTypes'>): Promise<{
  sales: number
  expenses: number
  handBills: number
  returns: number
  totalRecords: number
}> {
  const [salesData, expensesData, handBillsData, returnsData] = await Promise.all([
    config.voucherTypes.includes('sales') ? getSalesForDateRange(config.dateFrom, config.dateTo, config.storeIds) : Promise.resolve([]),
    config.voucherTypes.includes('payment') ? getExpensesForDateRange(config.dateFrom, config.dateTo, config.storeIds) : Promise.resolve([]),
    config.voucherTypes.includes('receipt') ? getHandBillsForDateRange(config.dateFrom, config.dateTo, config.storeIds) : Promise.resolve([]),
    config.voucherTypes.includes('journal') ? getReturnsForDateRange(config.dateFrom, config.dateTo, config.storeIds) : Promise.resolve([])
  ])

  const sales = salesData?.length || 0
  const expenses = expensesData?.length || 0  
  const handBills = handBillsData?.length || 0
  const returns = returnsData?.length || 0

  return {
    sales,
    expenses,
    handBills,
    returns,
    totalRecords: sales + expenses + handBills + returns
  }
}