# 6. Components Architecture

### Existing Components
- 14 service files (cash-service, reconciliation-service, etc.)
- 30+ UI components (Radix/Shadcn based)
- Complete pages for sales, expenses, cash management

### New Components for Integration

#### GoFrugalService
```typescript
// src/lib/services/gofrugal-service.ts
export interface GoFrugalService {
  syncSales(storeId: string, date?: Date): Promise<SyncResult>;
  validateAgainstAPI(manual: number, storeId: string, date: Date): Promise<ValidationResult>;
}
```

#### VarianceBadge Component
```typescript
// src/components/ui/variance-badge.tsx
export function VarianceBadge({ variance, threshold = 100 }) {
  const isMatched = Math.abs(variance) <= threshold;
  return <Badge variant={isMatched ? 'success' : 'warning'}>{...}</Badge>;
}
```
