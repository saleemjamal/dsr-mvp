# 15. Key Architecture Decisions

1. **Parallel Tables**: Keep manual and API data separate for comparison
2. **No RLS Initially**: Use service-layer security for simplicity
3. **Manual Deployment**: Using `vercel --prod` for control
4. **Minimal Changes**: Only 5 tables, 1 service, 3 APIs, 1 component
5. **Production Testing**: Use feature flags and test stores
6. **Defer Bank CSV**: Focus on manual vs API validation first
