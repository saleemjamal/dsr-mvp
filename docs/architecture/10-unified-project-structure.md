# 10. Unified Project Structure

```
dsr-mvp/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # Existing protected routes
│   │   ├── api/
│   │   │   ├── sync/            # NEW - GoFrugal sync endpoints
│   │   │   ├── validate/        # NEW - Validation endpoint
│   │   │   └── cron/           # NEW - Scheduled tasks
│   ├── components/
│   │   └── ui/
│   │       ├── [existing components]
│   │       └── variance-badge.tsx  # NEW
│   └── lib/
│       └── services/
│           ├── [existing services]
│           └── gofrugal-service.ts # NEW
├── supabase/
│   └── migrations/
│       └── 20250203_add_gofrugal_tables.sql # NEW
└── vercel.json                    # Add cron configuration
```
