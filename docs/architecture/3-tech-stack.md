# 3. Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.x | Type-safe frontend development | Prevents runtime errors, excellent IDE support |
| Frontend Framework | Next.js | 15.0.3 | React framework with SSG/SSR | Existing investment, App Router provides modern patterns |
| UI Component Library | Radix UI + Shadcn/ui | Latest | Accessible component primitives | Already implemented, unstyled components |
| State Management | Context API | Built-in | Client state management | Simple, no additional dependencies |
| Backend Language | TypeScript | 5.x | Type-safe backend development | Shared types with frontend |
| Backend Framework | Next.js API Routes | 15.0.3 | Serverless API endpoints | Built into Next.js, Edge Runtime support |
| API Style | REST | N/A | HTTP API architecture | Simple GoFrugal integration |
| Database | PostgreSQL (Supabase) | 15 | Primary data storage | Excellent JSON support for API data |
| Cache | Vercel Edge Cache | N/A | CDN and API caching | Built into platform |
| Authentication | Supabase Auth | N/A | User authentication | Existing implementation |
| Testing | Manual + Jest | 29.x | Testing approach | Pragmatic for MVP |
| CI/CD | Vercel CLI (Manual) | Latest | Manual production deployment | Direct control over releases |
| Monitoring | Vercel Analytics | N/A | Performance monitoring | Built-in web vitals |
| CSS Framework | Tailwind CSS | 3.4 | Utility-first styling | Already implemented |
| Data Fetching | TanStack Query | 5.x | Server state management | Excellent caching |
