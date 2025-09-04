# 12. Security & Performance

### Security
- API keys server-side only (never NEXT_PUBLIC_)
- Input validation with Zod schemas
- Rate limiting for API calls
- Application-level store isolation

### Performance
- 5-minute cache for GoFrugal data
- Incremental sync (date-based)
- Database indexes on key fields
- < 2s target for sync operations
