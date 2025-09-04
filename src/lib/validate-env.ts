// Environment Variable Validation
// Ensures all required environment variables are present

export interface EnvironmentValidationResult {
  valid: boolean
  missing: string[]
  warnings: string[]
}

export function validateEnvironment(): EnvironmentValidationResult {
  const missing: string[] = []
  const warnings: string[] = []
  
  // Base requirements for the application
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ]
  
  // Requirements for GoFrugal integration (only if enabled)
  const requiredForGoFrugal = [
    'GOFRUGAL_LICENSE_KEY',
    'GOFRUGAL_BASE_URL',
    'GOFRUGAL_HQ_PATH'
  ]
  
  // Requirements for automated sync (only if auto-sync enabled)
  const requiredForAutoSync = [
    'CRON_SECRET'
  ]
  
  // Check base requirements
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }
  
  // Check GoFrugal requirements if enabled
  if (process.env.NEXT_PUBLIC_ENABLE_GOFRUGAL === 'true') {
    for (const key of requiredForGoFrugal) {
      if (!process.env[key]) {
        missing.push(key)
      }
    }
    
    // Validate GoFrugal URL format
    if (process.env.GOFRUGAL_BASE_URL && !isValidUrl(process.env.GOFRUGAL_BASE_URL)) {
      warnings.push('GOFRUGAL_BASE_URL should be a valid URL (e.g., http://192.168.1.100)')
    }
    
    // Validate HQ path format
    if (process.env.GOFRUGAL_HQ_PATH && !process.env.GOFRUGAL_HQ_PATH.startsWith('/')) {
      warnings.push('GOFRUGAL_HQ_PATH should start with / (e.g., /RayMedi_HQ)')
    }
  }
  
  // Check auto-sync requirements if enabled
  if (process.env.ENABLE_AUTO_SYNC === 'true') {
    for (const key of requiredForAutoSync) {
      if (!process.env[key]) {
        missing.push(key)
      }
    }
    
    // Warn if CRON_SECRET is too weak
    if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 16) {
      warnings.push('CRON_SECRET should be at least 16 characters for security')
    }
  }
  
  // Validate numeric environment variables
  validateNumericEnv('GOFRUGAL_SYNC_BATCH_SIZE', 1, 1000, warnings)
  validateNumericEnv('GOFRUGAL_SYNC_TIMEOUT', 1000, 300000, warnings)
  validateNumericEnv('GOFRUGAL_MAX_RETRIES', 0, 10, warnings)
  validateNumericEnv('GOFRUGAL_RATE_LIMIT_PER_HOUR', 1, 10000, warnings)
  validateNumericEnv('GOFRUGAL_RATE_LIMIT_PER_MINUTE', 1, 100, warnings)
  validateNumericEnv('ROLLOUT_PERCENTAGE', 0, 100, warnings)
  
  // Check for example values
  checkForExampleValues(warnings)
  
  return {
    valid: missing.length === 0,
    missing,
    warnings
  }
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

function validateNumericEnv(
  key: string, 
  min: number, 
  max: number, 
  warnings: string[]
): void {
  const value = process.env[key]
  if (!value) return
  
  const num = parseInt(value)
  if (isNaN(num)) {
    warnings.push(`${key} should be a number`)
  } else if (num < min || num > max) {
    warnings.push(`${key} should be between ${min} and ${max}`)
  }
}

function checkForExampleValues(warnings: string[]): void {
  const exampleValues = [
    'your_supabase_url_here',
    'your_supabase_anon_key_here',
    'your_license_key_here',
    'your_cron_secret_here',
    'your_google_client_id',
    'your_google_client_secret'
  ]
  
  for (const [key, value] of Object.entries(process.env)) {
    if (value && exampleValues.some(example => value.includes(example))) {
      warnings.push(`${key} still contains example value`)
    }
  }
}

// Throw error if validation fails (for critical environments)
export function enforceEnvironment(): void {
  const result = validateEnvironment()
  
  if (!result.valid) {
    const message = [
      'Missing required environment variables:',
      ...result.missing.map(key => `  - ${key}`),
      '',
      'Please check your .env.local file and ensure all required variables are set.',
      'Copy .env.local.example to .env.local and fill in your values.'
    ].join('\n')
    
    throw new Error(message)
  }
  
  if (result.warnings.length > 0) {
    console.warn('Environment configuration warnings:')
    result.warnings.forEach(warning => {
      console.warn(`  ⚠️  ${warning}`)
    })
  }
}

// Log environment status (for debugging)
export function logEnvironmentStatus(): void {
  const result = validateEnvironment()
  
  console.log('Environment Configuration Status:')
  console.log('================================')
  
  if (result.valid) {
    console.log('✅ All required environment variables are present')
  } else {
    console.log('❌ Missing environment variables:')
    result.missing.forEach(key => {
      console.log(`   - ${key}`)
    })
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`)
    })
  }
  
  // Log feature status
  console.log('\nFeature Status:')
  console.log(`  GoFrugal Integration: ${process.env.NEXT_PUBLIC_ENABLE_GOFRUGAL === 'true' ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`  Auto Sync: ${process.env.ENABLE_AUTO_SYNC === 'true' ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`  Variance Badges: ${process.env.NEXT_PUBLIC_ENABLE_VARIANCE_BADGES === 'true' ? '✅ Enabled' : '❌ Disabled'}`)
  console.log(`  Sync UI: ${process.env.NEXT_PUBLIC_ENABLE_SYNC_UI === 'true' ? '✅ Enabled' : '❌ Disabled'}`)
  
  if (process.env.ENABLED_STORES) {
    console.log(`  Enabled Stores: ${process.env.ENABLED_STORES}`)
  }
  
  if (process.env.ROLLOUT_PERCENTAGE) {
    console.log(`  Rollout Percentage: ${process.env.ROLLOUT_PERCENTAGE}%`)
  }
}

// Call validation on server startup (not in browser)
if (typeof window === 'undefined') {
  try {
    // Only enforce in production
    if (process.env.NODE_ENV === 'production') {
      enforceEnvironment()
    } else {
      // In development, just log warnings
      const result = validateEnvironment()
      if (!result.valid || result.warnings.length > 0) {
        logEnvironmentStatus()
      }
    }
  } catch (error) {
    console.error('Environment validation failed:', error)
    // In production, we want to fail fast
    if (process.env.NODE_ENV === 'production') {
      process.exit(1)
    }
  }
}