# 11. Development & Deployment

### Environment Variables
```bash
# Existing
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# New (server-side only)
GOFRUGAL_API_KEY=xxx
GOFRUGAL_API_SECRET=xxx
CRON_SECRET=xxx
```

### Deployment Strategy (Production-First)
1. Deploy with feature flags OFF
2. Test with TEST001 store
3. Enable for one real store
4. Monitor for 24 hours
5. Full rollout

### Feature Flags
```typescript
export const features = {
  gofrugalSync: process.env.NEXT_PUBLIC_ENABLE_GOFRUGAL === 'true'
};
```
