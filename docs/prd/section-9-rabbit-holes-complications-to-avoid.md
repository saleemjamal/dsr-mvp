# Section 9: Rabbit Holes & Complications to Avoid

### Technical Rabbit Holes

**Over-Engineering Pitfalls:**

❌ **Perfect Data Synchronization**
- Trap: Building complex conflict resolution for edge cases
- Reality: 100ms sync delay is acceptable
- Solution: Simple last-write-wins with audit log

❌ **Custom Reporting Framework**  
- Trap: Building flexible report builder from scratch
- Reality: 10-15 fixed reports cover 95% of needs
- Solution: Preset reports with export options

❌ **Offline-First Architecture**
- Trap: Complex sync when devices come online
- Reality: Stores have reliable internet
- Solution: Simple connection retry with queue

❌ **Microservices Architecture**
- Trap: Splitting into multiple services prematurely
- Reality: Monolith works fine for MVP scale
- Solution: Modular monolith with clear boundaries

### Business Logic Complications

**Avoid These Scope Creeps:**

❌ **Multi-Currency Handling**
- Stores deal only in INR
- Exchange rates add unnecessary complexity
- Postpone until international expansion

❌ **Complex Approval Hierarchies**
- Simple two-level approval sufficient (Store → AIC)
- Matrix approvals can wait
- Focus on single approver per level

❌ **Historical Data Migration**
- Don't migrate years of Excel data
- Start fresh from go-live date
- Provide read-only access to old system

❌ **Custom Integrations Per Store**
- Standardize workflows across all stores
- No store-specific customizations in MVP
- Configuration, not customization

### User Experience Traps

**Don't Over-Optimize:**

❌ **Perfect Mobile Experience**
- Desktop-first for data entry users
- Mobile for viewing/approval only
- Native apps are Phase 3

❌ **Real-Time Everything**
- Hourly sync is sufficient for most data
- Real-time only for critical variances
- Batch processing acceptable for reports

❌ **Excessive Automation**
- Keep manual override options
- Some decisions need human judgment
- Gradual automation based on patterns

### Integration Pitfalls

**API Integration Gotchas:**

⚠️ **GoFrugal API Limitations**
- Rate limits may restrict real-time sync
- Mitigation: Intelligent caching and batch requests
- Don't build assuming unlimited API calls

⚠️ **Bank File Format Variations**
- Each bank has different CSV formats
- Mitigation: Start with top 3 banks only
- Manual entry fallback always available

⚠️ **WhatsApp Business API**
- Expensive and complex approval process
- Mitigation: Email alerts for MVP
- WhatsApp only when volume justifies cost

### Common Decision Paralysis Points

**Make These Decisions Quickly:**

1. **Variance Threshold:** Start with ₹100, adjust based on data
2. **Sync Frequency:** Hourly is good enough, don't over-optimize
3. **Report Formats:** Excel export solves 90% of needs
4. **Access Control:** Three roles are sufficient for MVP
5. **Data Retention:** Follow legal requirements, don't over-store

### Performance Optimization Traps

❌ **Premature Optimization**
- Don't optimize queries until you have real data
- Don't add caching layers until needed
- Don't shard database prematurely

✅ **Focus On:**
- Correct indexing from day one
- Pagination for large datasets
- Efficient API payload sizes

---
