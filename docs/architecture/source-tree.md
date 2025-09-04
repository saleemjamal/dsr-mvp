# Source Tree Structure

## Overview
DSR-MVP is a Next.js 15 application with TypeScript, using the App Router pattern. The project follows a modular architecture with clear separation between UI components, business logic, and data services.

## Directory Structure

```
dsr-mvp/
├── .bmad-core/              # BMAD configuration
├── .claude/                 # Claude AI configuration
├── docs/                    # Documentation
│   ├── architecture/        # Sharded architecture docs
│   ├── prd/                # Sharded PRD docs
│   └── *.md                # Other documentation files
├── public/                  # Static assets
├── src/                     # Source code
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── contexts/           # React context providers
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions and services
│   ├── services/           # Additional services
│   └── types/              # TypeScript type definitions
├── supabase/               # Database files
│   ├── migrations/         # Database migrations
│   ├── schemas/           # Schema definitions
│   └── seeds/             # Sample data
├── styles/                 # Global CSS styles
└── [config files]          # Root configuration files
```

## Core Directories

### `/src/app` - Next.js App Router Pages

Feature-based organization with route groups for protected areas:

```
app/
├── (dashboard)/            # Protected dashboard layout group
│   └── layout.tsx         # Shared dashboard layout
├── admin/                 # Admin panel pages
│   ├── expense-categories/
│   ├── stores/
│   ├── tender-types/
│   └── users/
├── auth/                  # Authentication pages
│   ├── login/
│   └── signup/
├── cash-management/       # Cash management module
│   ├── adjustment/
│   ├── audit/
│   ├── count/
│   ├── deposit/
│   ├── deposit-multi/
│   └── transfers/
├── customers/             # Customer management
├── dashboard/             # Main dashboard
├── expenses/              # Expense tracking
│   └── new/
├── hand-bills/           # Hand bills module
│   ├── convert/
│   └── new/
├── help/                 # Help documentation
├── orders/               # Sales orders
│   ├── convert/
│   └── new/
├── reconciliation/       # Transaction reconciliation
├── reports/              # Reporting module
│   ├── compliance/
│   │   └── tally-export/
│   └── financial/
│       ├── daily-sales-summary/
│       └── expense-report/
├── returns/              # Returns processing
│   └── redeem/
├── sales/                # Sales management
│   └── new/
├── settings/             # Application settings
└── vouchers/             # Gift vouchers
    ├── new/
    └── redeem/
```

### `/src/components` - React Components

Organized by component type and purpose:

```
components/
├── auth/                  # Authentication components
│   ├── auth-guard.tsx
│   └── PermissionGuard.tsx
├── help/                  # Role-specific help components
│   ├── accounts-incharge-help.tsx
│   ├── cashier-help.tsx
│   ├── store-manager-help.tsx
│   └── super-user-help.tsx
├── layout/                # Layout components
│   ├── header.tsx
│   ├── sidebar.tsx
│   └── store-switcher.tsx
├── ui/                    # Reusable UI components
│   ├── [Radix/Shadcn components]
│   ├── customer-lookup.tsx
│   ├── denomination-counter.tsx
│   ├── filter-bar.tsx
│   ├── mobile-camera-input.tsx
│   ├── return-reason-select.tsx
│   ├── smart-camera-capture.tsx
│   └── tender-type-select.tsx
├── theme-provider.tsx
└── theme-toggle.tsx
```

### `/src/lib` - Services and Utilities

Business logic and data access services:

```
lib/                       # Services are directly in lib/, not lib/services/
├── cash-service.ts
├── customer-service.ts
├── daily-cash-service.ts
├── dashboard-service.ts
├── expense-service.ts
├── gift-vouchers-service.ts
├── hand-bills-service.ts
├── reconciliation-service.ts
├── returns-service.ts
├── sales-orders-service.ts
├── sales-service.ts
├── storage-service.ts
├── store-service.ts
├── tally-export-service.ts
├── user-service.ts
├── auth-helpers.ts        # Authentication utilities
├── page-config.ts         # Page configuration
├── permissions.ts         # Permission definitions
├── supabase.ts           # Supabase client
└── utils.ts              # General utilities
```

### `/src/services` - Additional Services

```
services/
└── camera-service.ts      # Camera functionality service
```

### `/src/contexts` - React Contexts

Application-wide state management:

```
contexts/
├── StoreContext.tsx       # Store selection and access
└── FilterContext.tsx      # Global filter state
```

### `/src/hooks` - Custom Hooks

Reusable React hooks:

```
hooks/
├── use-accessible-stores.ts
├── use-current-store.ts
├── use-permissions.ts
└── use-user.ts
```

### `/src/types` - TypeScript Definitions

Type definitions for the application:

```
types/
├── permissions.ts         # Permission types
├── reconciliation.ts      # Reconciliation types
└── [other domain types]
```

### `/supabase` - Database Files

Database schema, migrations, and seed data:

```
supabase/
├── migrations/           # Timestamped migration files
│   ├── 20250201_add_cash_deposits.sql
│   ├── 20250201_add_credit_bills.sql
│   ├── 20250202_add_daily_cash_tracking.sql
│   ├── 20250202_fix_cash_only_movements.sql
│   └── [other migrations]
├── schemas/              # Schema by feature
│   ├── cash-management.sql
│   ├── sales.sql
│   ├── expenses.sql
│   └── [other schemas]
├── seeds/                # Sample/test data
└── current-schema-pulled/ # Latest schema from database
    └── remote-schema.sql
```

## Configuration Files

### Root Level Configuration

```
├── .env.local            # Environment variables
├── .eslintrc.json        # ESLint configuration
├── .gitignore           # Git ignore rules
├── CLAUDE.md            # Project-specific Claude instructions
├── components.json       # Shadcn/ui configuration
├── next.config.js       # Next.js configuration
├── package.json         # Node dependencies
├── postcss.config.js    # PostCSS configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── vercel.json          # Vercel deployment config
```

## File Naming Conventions

### Components
- React components: `PascalCase.tsx` (e.g., `FilterBar.tsx`)
- Utilities/services: `kebab-case.ts` (e.g., `sales-service.ts`)
- Hooks: `use-*.ts` pattern (e.g., `use-permissions.ts`)

### Pages (App Router)
- Page components: `page.tsx`
- Layouts: `layout.tsx`
- Loading states: `loading.tsx`
- Error boundaries: `error.tsx`

### Database Files
- Migrations: `YYYYMMDD_description.sql`
- Schemas: `feature-name.sql`

## Module Organization

### Feature Modules
Each major feature has:
- Page component in `/app/[feature]/`
- Service file in `/lib/`
- UI components in `/components/ui/`
- Database schema in `/supabase/schemas/`
- Migration files in `/supabase/migrations/`

### Example: Cash Management Module
```
├── app/cash-management/         # Pages
│   ├── page.tsx
│   ├── count/page.tsx
│   ├── deposit/page.tsx
│   └── transfers/page.tsx
├── lib/cash-service.ts          # Service layer
├── lib/daily-cash-service.ts    # Additional services
├── components/ui/denomination-counter.tsx  # UI components
└── supabase/
    ├── schemas/cash-management.sql
    └── migrations/20250202_add_daily_cash_tracking.sql
```

## Import Paths

The project uses TypeScript path aliases:

```typescript
// Absolute imports using @/ alias
import { Button } from '@/components/ui/button'
import { getCashBalance } from '@/lib/cash-service'
import { usePermissions } from '@/hooks/use-permissions'
```

## Build Output

```
├── .next/                # Next.js build output
├── out/                  # Static export (if used)
└── node_modules/         # NPM dependencies
```

## Development Tools

```
├── .bmad-core/           # BMAD development tools
│   └── core-config.yaml  # BMAD configuration
├── .claude/              # Claude AI configuration
│   └── CLAUDE.md        # User-specific instructions
└── .cursor/              # Cursor IDE settings
```

## Notes

1. **Services Location**: Services are located directly in `/src/lib/` (not `/src/lib/services/`). Camera service is in `/src/services/`
2. **Feature-First Organization**: Each feature has its pages, services, and components grouped logically
3. **Protected Routes**: Dashboard routes use route groups `(dashboard)` for shared layouts
4. **Database-First**: All features have corresponding database schemas and migrations
5. **Type Safety**: TypeScript interfaces defined close to their usage, with shared types in `/src/types/`