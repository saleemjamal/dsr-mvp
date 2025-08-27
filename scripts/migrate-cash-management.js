const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration')
  console.error('URL:', supabaseUrl ? 'Present' : 'Missing')
  console.error('Service Key:', supabaseServiceKey ? 'Present' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQLFile(filePath, description) {
  try {
    console.log(`📄 Reading ${description}...`)
    const sql = fs.readFileSync(filePath, 'utf8')
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim()
      if (statement) {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`)
        const { error } = await supabase.rpc('exec', { sql: statement })
        
        if (error) {
          console.error(`❌ Failed at statement ${i + 1}:`, error)
          console.error('Statement:', statement.substring(0, 100) + '...')
          throw error
        }
      }
    }
    
    console.log(`✅ ${description} applied successfully!`)
    return true
  } catch (error) {
    console.error(`❌ ${description} failed:`, error)
    return false
  }
}

async function runMigration() {
  try {
    console.log('🚀 Starting cash management migration...')
    
    // Apply sample store data first
    const storeDataPath = path.join(__dirname, '..', 'supabase', 'seeds', 'sample_stores.sql')
    const storeSuccess = await executeSQLFile(storeDataPath, 'Sample store data')
    
    if (!storeSuccess) {
      console.log('⚠️  Store data failed, continuing with schema...')
    }
    
    // Apply cash management schema
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schemas', '07_cash_management.sql')
    const schemaSuccess = await executeSQLFile(schemaPath, 'Cash management schema')
    
    if (schemaSuccess) {
      console.log('🎉 Migration completed successfully!')
    } else {
      console.log('💥 Migration failed!')
      process.exit(1)
    }
    
  } catch (error) {
    console.error('💥 Migration error:', error)
    process.exit(1)
  }
}

runMigration()