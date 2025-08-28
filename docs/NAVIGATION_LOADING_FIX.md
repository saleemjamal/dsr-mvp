# Client-Side Navigation Loading State Fix

## Problem
Pages show perpetual loading spinners when navigating via Next.js router (client-side navigation), but work correctly on hard refresh (F5).

## Root Cause
Loading states are initialized to `true` by default, but the useEffect hooks that should set them to `false` return early when dependencies aren't ready. This creates a deadlock where loading never gets set to false during client-side navigation.

## The Fix

### ❌ WRONG - Causes Perpetual Loading
```typescript
export default function PageComponent() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(true)  // ❌ Starts true
  const [filters, setFilters] = useState(null)
  
  useEffect(() => {
    if (!filters || !profile || !accessibleStores) {
      // This returns early, never setting loading to false
      return
    }
    
    const loadData = async () => {
      setLoading(true)
      // ... fetch data
      setLoading(false)
    }
    loadData()
  }, [filters, profile, accessibleStores])
}
```

### ✅ CORRECT - Works on Navigation
```typescript
export default function PageComponent() {
  const { profile } = useAuth()
  const { accessibleStores } = useStore()
  const [loading, setLoading] = useState(false)  // ✅ Starts false
  const [filters, setFilters] = useState(null)
  
  useEffect(() => {
    if (!filters || !profile || !accessibleStores) {
      // Early return is fine - loading stays false
      return
    }
    
    const loadData = async () => {
      setLoading(true)  // Only set true when actually loading
      // ... fetch data
      setLoading(false)
    }
    loadData()
  }, [filters, profile, accessibleStores])
}
```

## Key Principles

1. **Initialize loading states to `false`** - Only set to `true` when actively fetching data
2. **Don't set loading in early returns** - If dependencies aren't ready, just return without touching loading state
3. **Set loading true only when starting async operations** - Right before the actual fetch/query

## Files to Check and Fix

Search for this pattern in all page components:
```bash
# Find all loading state initializations
grep -r "useState(true)" --include="*.tsx" | grep -i loading
```

Common files that need this fix:
- `/app/page.tsx` (Dashboard)
- `/app/orders/page.tsx`
- `/app/sales/page.tsx`
- `/app/expenses/page.tsx`
- `/app/returns/page.tsx`
- `/app/hand-bills/page.tsx`
- `/app/vouchers/page.tsx`
- `/app/cash-management/page.tsx`
- Any other page with FilterBar integration

## Testing

After applying the fix:
1. Navigate to the page via sidebar/links - should load without spinner
2. Hard refresh (F5) - should still work
3. Change filters - loading spinner should appear only during data fetch
4. Navigate away and back - should not show perpetual loading

## Why This Happens

During client-side navigation:
- React components maintain their state between navigations
- The `useState(true)` runs on mount
- But the useEffect conditions might not be met immediately
- This leaves loading stuck at `true`

During hard refresh:
- Everything initializes fresh
- Dependencies load in the right order
- useEffect runs properly

## Summary

**Rule**: Always initialize loading states to `false` unless you're immediately starting an async operation on mount.