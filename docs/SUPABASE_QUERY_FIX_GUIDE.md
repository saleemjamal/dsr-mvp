# Supabase Query Hanging Issue - Fix Documentation

## Problem Summary
Supabase queries using `.select().limit(1)` or `.single()` or `.maybeSingle()` patterns cause indefinite hanging in production environments. This affects page loading, data fetching, and creates poor user experience with infinite loading spinners.

## Root Cause
The hanging occurs due to:
1. **Next.js caching conflicts** with Supabase client
2. **RLS (Row Level Security) policy** evaluation issues
3. **Connection pooling problems** in production environments
4. **Complex query chaining** (e.g., `.insert().select().limit(1)`)

## The Fix Pattern

### ❌ **WRONG - Will Hang**
```typescript
// DON'T DO THIS - Will hang indefinitely
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .limit(1)  // <-- This causes hanging

// Also problematic
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single()  // <-- This also hangs

// Complex chaining that hangs
const { data, error } = await supabase
  .from('table_name')
  .insert([newData])
  .select()
  .limit(1)  // <-- Hangs after insert
```

### ✅ **CORRECT - Works Reliably**
```typescript
// DO THIS - Works reliably
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)  // No .limit(1)

if (error) {
  console.error('Error fetching data:', error)
  return null
}

// Return first item if found
return data && data.length > 0 ? data[0] : null
```

## Complete Fix Implementation

### 1. Service Function Pattern
```typescript
// Before (WRONG)
export async function getRecordById(id: string): Promise<Record | null> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('id', id)
    .limit(1)  // PROBLEM: This hangs

  if (error) {
    console.error('Error fetching record:', error)
    return null
  }
  
  if (!data || data.length === 0) {
    return null
  }
  
  return data[0] as Record
}

// After (CORRECT)
export async function getRecordById(id: string): Promise<Record | null> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('id', id)  // No .limit(1)

    if (error) {
      console.error('Error fetching record:', error)
      return null
    }
    
    // Return first item if found, null otherwise
    return data && data.length > 0 ? data[0] as Record : null
  } catch (err) {
    console.error('Exception fetching record:', err)
    return null
  }
}
```

### 2. Insert Operations Pattern
```typescript
// Before (WRONG)
export async function createRecord(record: NewRecord) {
  const { data, error } = await supabase
    .from('records')
    .insert([record])
    .select()
    .limit(1)  // PROBLEM: Hangs after insert

  if (error) throw error
  return data[0]
}

// After (CORRECT)
export async function createRecord(record: NewRecord) {
  const { error } = await supabase
    .from('records')
    .insert([record])  // Just insert, no select

  if (error) {
    console.error('Error creating record:', error)
    throw error  // Throw original error with code/details
  }
  
  // Return success indicator
  return { success: true, id: record.id }
}
```

### 3. Update Operations Pattern
```typescript
// Before (WRONG)
export async function updateRecord(id: string, updates: Partial<Record>) {
  const { data, error } = await supabase
    .from('records')
    .update(updates)
    .eq('id', id)
    .select()
    .single()  // PROBLEM: Hangs

  if (error) throw error
  return data
}

// After (CORRECT)
export async function updateRecord(id: string, updates: Partial<Record>) {
  const { error } = await supabase
    .from('records')
    .update(updates)
    .eq('id', id)  // Simple update, no select

  if (error) {
    console.error('Error updating record:', error)
    throw error
  }
  
  return { success: true, id }
}
```

### 4. Add Timeout Protection in UI Components
```typescript
// Add timeout mechanism to prevent indefinite loading
export default function RecordEditPage() {
  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)

  useEffect(() => {
    const loadRecord = async () => {
      try {
        setLoading(true)
        
        // Add timeout to prevent indefinite loading
        const timeoutId = setTimeout(() => {
          toast.error('Loading timed out. Please refresh the page.')
          setLoading(false)
        }, 10000) // 10 second timeout
        
        const recordData = await getRecordById(recordId)
        clearTimeout(timeoutId)  // Clear timeout if successful
        
        if (!recordData) {
          toast.error('Record not found')
          router.push('/records')
          return
        }
        
        setRecord(recordData)
      } catch (error) {
        console.error('Error loading record:', error)
        toast.error('Failed to load record')
      } finally {
        setLoading(false)
      }
    }

    loadRecord()
  }, [recordId])

  // ... rest of component
}
```

## Files That Need Fixing

Search your codebase for these patterns and fix them:

### 1. Find all `.limit(1)` usage:
```bash
grep -r "\.limit(1)" --include="*.ts" --include="*.tsx"
```

### 2. Find all `.single()` usage:
```bash
grep -r "\.single()" --include="*.ts" --include="*.tsx"
```

### 3. Find all `.maybeSingle()` usage:
```bash
grep -r "\.maybeSingle()" --include="*.ts" --include="*.tsx"
```

## Testing Checklist

After applying fixes, test each module:

- [ ] Create operations work without hanging
- [ ] Read/Get by ID operations load quickly
- [ ] Update operations complete successfully
- [ ] List/Search operations return data
- [ ] Navigation between pages works smoothly
- [ ] No infinite loading spinners
- [ ] Timeout errors show after 10-15 seconds (not infinite)

## Additional Best Practices

### 1. Error Handling
Always throw the original error object to preserve error codes:
```typescript
if (error) {
  console.error('Database error:', error)
  throw error  // Preserve error.code and error.details
}
```

### 2. User-Friendly Error Messages
Parse database error codes in the UI:
```typescript
catch (error) {
  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any
    
    switch (dbError.code) {
      case '23505': // Unique constraint
        toast.error('This record already exists')
        break
      case '23502': // Not null constraint
        toast.error('Required information is missing')
        break
      case '23503': // Foreign key constraint
        toast.error('Invalid reference. Please refresh and try again')
        break
      default:
        toast.error('An error occurred. Please try again')
    }
  }
}
```

### 3. Loading State Management
Always set loading to false in finally blocks:
```typescript
try {
  setLoading(true)
  // ... operations
} catch (error) {
  // ... error handling
} finally {
  setLoading(false)  // Always runs
}
```

## Summary

**Key Rule**: Never use `.limit(1)`, `.single()`, or `.maybeSingle()` with Supabase queries in Next.js applications. Always fetch the data and handle array indexing in your code.

This pattern has been tested and proven to resolve all hanging issues across the DSR application. Apply these fixes systematically to all service functions and components for reliable database operations.