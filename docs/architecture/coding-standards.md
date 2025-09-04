# Coding Standards

## Overview
This document defines the coding standards and conventions for the DSR-MVP project. All code contributions should follow these guidelines to maintain consistency and quality across the codebase.

## Core Principles

1. **TypeScript First**: All code must be TypeScript with strict type checking
2. **SSG Compliance**: Follow Next.js 15 Static Site Generation rules
3. **Null Safety**: Implement proper null/undefined checks throughout
4. **No Code Deletion**: Never delete existing code without explicit permission
5. **Mobile Responsive**: All UI components must be mobile-friendly

## TypeScript Standards

### Type Safety

```typescript
// ✅ GOOD - Explicit types
export interface Sale {
  id: string
  store_id: string
  amount: number
  tender_type: string
  sale_date: string
  notes?: string  // Optional fields marked clearly
}

// ❌ BAD - Using 'any'
const data: any = await fetchData()
```

### Null Safety Pattern

```typescript
// ✅ GOOD - Proper null checks
const { data, error } = await supabase.from('table').select()
if (error) throw error
return data && data.length > 0 ? data[0] : null

// ❌ BAD - Assuming data exists
const { data } = await supabase.from('table').select()
return data[0]  // Could crash if data is null
```

### Interface Naming

- Interfaces use PascalCase: `SalesOrder`, `CashMovement`
- Prefix with 'I' is NOT used (not `ISalesOrder`)
- Keep interfaces close to their usage
- Export interfaces that are used across files

## React/Next.js Standards

### Component Structure

```typescript
"use client"  // Client components must be marked

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
// External imports first

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
// Internal imports using @ alias

export default function ComponentName() {
  // Hooks first
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Effects after hooks
  useEffect(() => {
    // Effect logic
  }, [dependencies])
  
  // Event handlers
  const handleSubmit = async () => {
    // Handler logic
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### SSG Compliance

```typescript
// ✅ GOOD - Suspense boundary for useSearchParams
import { Suspense } from 'react'

function SearchBarComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchBar />
    </Suspense>
  )
}

// ❌ BAD - Direct useSearchParams without Suspense
function Component() {
  const searchParams = useSearchParams() // Will fail in production
}
```

### State Management

```typescript
// ✅ GOOD - Initialize state properly
const [loading, setLoading] = useState(false)  // Not true by default

// ✅ GOOD - Mounted pattern for client-only content
const [mounted, setMounted] = useState(false)
useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) return null
```

## Service Layer Standards

### Service File Structure

```typescript
// lib/[domain]-service.ts
import { supabase } from './supabase'

// Interfaces at top
export interface DomainModel {
  // properties
}

// Section dividers
// ==========================================
// SECTION NAME
// ==========================================

// Exported functions
export async function functionName() {
  // Implementation
}
```

### Error Handling

```typescript
// ✅ GOOD - Proper error handling
export async function createSale(sale: Sale) {
  try {
    const { data, error } = await supabase
      .from('sales')
      .insert([sale])
    
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error creating sale:', error)
    throw error
  }
}

// ❌ BAD - Swallowing errors
export async function createSale(sale: Sale) {
  const { data } = await supabase.from('sales').insert([sale])
  return data
}
```

### Supabase Query Patterns

```typescript
// ✅ GOOD - Avoid .single() and .limit(1)
const { data, error } = await supabase
  .from('stores')
  .select('*')
  .eq('id', storeId)

return data && data.length > 0 ? data[0] : null

// ❌ BAD - Using .single() can hang
const { data, error } = await supabase
  .from('stores')
  .select('*')
  .eq('id', storeId)
  .single()  // Can cause hanging
```

## UI Component Standards

### Component Files

```typescript
// components/ui/component-name.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface ComponentProps {
  className?: string
  children: React.ReactNode
}

export function ComponentName({ 
  className,
  children 
}: ComponentProps) {
  return (
    <div className={cn("base-classes", className)}>
      {children}
    </div>
  )
}
```

### Styling with Tailwind

```typescript
// ✅ GOOD - Using Tailwind utilities
<div className="flex items-center gap-2 p-4">

// ✅ GOOD - Using cn() for conditional classes
<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)}>

// ❌ BAD - Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

### Mobile Responsiveness

```typescript
// ✅ GOOD - Responsive table with scroll
<div className="overflow-x-auto">
  <table className="min-w-full">
    {/* Table content */}
  </table>
</div>

// ✅ GOOD - Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

## Database Standards

### Migration Files

```sql
-- supabase/migrations/YYYYMMDD_description.sql
-- ✅ GOOD - Descriptive migration
-- Migration: Add cash deposits table
-- Purpose: Track bank deposits and link to cash counts

CREATE TABLE IF NOT EXISTS cash_deposits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES stores(id),
  -- etc
);

-- Add indexes for performance
CREATE INDEX idx_cash_deposits_store_date 
  ON cash_deposits(store_id, deposit_date);
```

### SQL in Services

```typescript
// ✅ GOOD - Parameterized queries
const { data, error } = await supabase
  .from('sales')
  .select('*')
  .eq('store_id', storeId)
  .gte('sale_date', startDate)
  .lte('sale_date', endDate)

// ❌ BAD - String concatenation
const query = `SELECT * FROM sales WHERE store_id = '${storeId}'`
```

## File Organization

### Naming Conventions

- React components: `PascalCase.tsx` (e.g., `CustomerLookup.tsx`)
- Service files: `kebab-case.ts` (e.g., `sales-service.ts`)
- Utilities: `kebab-case.ts` (e.g., `format-currency.ts`)
- Hooks: `use-*.ts` (e.g., `use-permissions.ts`)
- SQL files: `YYYYMMDD_snake_case.sql`

### Import Order

1. React/Next.js imports
2. External library imports
3. Internal components (`@/components`)
4. Internal hooks (`@/hooks`)
5. Internal services (`@/lib`)
6. Internal types (`@/types`)
7. Relative imports

```typescript
// Example proper import order
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { useAuth } from "@/hooks/use-auth"
import { useStore } from "@/contexts/store-context"

import { createSale } from "@/lib/sales-service"
import type { Sale } from "@/lib/sales-service"
```

## Authentication & Security

### Auth Checks

```typescript
// ✅ GOOD - Simple auth pattern
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  router.push('/auth/login')
  return
}

// ✅ GOOD - Profile lookup by ID
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', session.user.id)  // Use ID, not email
```

### Permission Guards

```typescript
// ✅ GOOD - Permission check
import { PermissionGuard } from "@/components/auth/PermissionGuard"

<PermissionGuard permissions={['cash_management.create']}>
  <Button>Protected Action</Button>
</PermissionGuard>
```

## Testing Standards

### Manual Testing Checklist

For each feature:
- [ ] Works on desktop browsers
- [ ] Works on mobile devices  
- [ ] Handles errors gracefully
- [ ] Shows loading states
- [ ] Validates user input
- [ ] Respects user permissions

### Error States

```typescript
// ✅ GOOD - User-friendly error handling
try {
  await performAction()
  toast.success("Action completed successfully")
} catch (error) {
  console.error('Detailed error:', error)
  toast.error("Failed to complete action. Please try again.")
}
```

## Git Commit Standards

### Commit Messages

```
type: description

Types:
- feat: New feature
- fix: Bug fix  
- refactor: Code refactoring
- docs: Documentation
- style: Formatting, missing semicolons, etc.
- test: Adding tests
- chore: Maintain
```

### SQL Migrations

All SQL files must be placed in `supabase/` folder and grouped by functionality:
- `supabase/migrations/` for migration files
- `supabase/schemas/` for schema definitions
- `supabase/seeds/` for sample data

## Performance Guidelines

### Data Fetching

```typescript
// ✅ GOOD - Fetch only needed columns
const { data } = await supabase
  .from('sales')
  .select('id, amount, sale_date')

// ❌ BAD - Fetching everything
const { data } = await supabase
  .from('sales')
  .select('*')
```

### Caching Strategy

```typescript
// ✅ GOOD - 5-minute cache for frequently accessed data
export async function getStores() {
  // Check cache first
  if (storeCache && Date.now() - cacheTime < 5 * 60 * 1000) {
    return storeCache
  }
  
  // Fetch and cache
  const stores = await fetchStores()
  storeCache = stores
  cacheTime = Date.now()
  return stores
}
```

## Common Patterns

### Loading States

```typescript
const [loading, setLoading] = useState(false)

const handleAction = async () => {
  setLoading(true)
  try {
    await performAction()
  } finally {
    setLoading(false)
  }
}

// In render
<Button disabled={loading}>
  {loading && <Loader2 className="animate-spin" />}
  Submit
</Button>
```

### Form Handling

```typescript
const [formData, setFormData] = useState({
  field1: '',
  field2: ''
})

const handleInputChange = (field: string, value: any) => {
  setFormData(prev => ({
    ...prev,
    [field]: value
  }))
}
```

### Table with Mobile Scroll

```typescript
<div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      {/* Headers */}
    </thead>
    <tbody>
      {/* Rows */}
    </tbody>
  </table>
</div>
```

## Anti-Patterns to Avoid

1. **Never use `.single()` or `.limit(1)`** with Supabase queries
2. **Never use `any` type** - always define proper types
3. **Never assume data exists** - always check for null/undefined
4. **Never skip error handling** - always handle errors gracefully
5. **Never use inline styles** - use Tailwind classes
6. **Never hardcode sensitive data** - use environment variables
7. **Never skip loading states** - always show loading feedback
8. **Never ignore mobile users** - always test responsive design

## Code Review Checklist

Before submitting code:
- [ ] TypeScript compiles without errors
- [ ] No ESLint warnings
- [ ] Follows SSG requirements (Suspense boundaries)
- [ ] Proper error handling
- [ ] Mobile responsive
- [ ] Loading states implemented
- [ ] Null safety checks
- [ ] No commented-out code
- [ ] SQL files in correct location