# 2. High Level Architecture

### Technical Summary

The DSR-MVP Dual-Source Retail ERP implements a **Validation Layer Architecture** using a surgical enhancement approach on the existing Next.js/Supabase stack. The system combines real-time GoFrugal API integration for automated sales data with enhanced manual tender-type entry for granular cash control, creating an intelligent three-way reconciliation engine between POS, manual, and bank data. Deployed on Vercel with Supabase backend, the architecture leverages serverless Edge Functions for API synchronization while maintaining application-level security for multi-tenant store isolation. This dual-source approach transforms manual data entry from a limitation into a strategic validation advantage, achieving the PRD's goal of reducing reconciliation time by 75% while maintaining complete audit control.

### Platform and Infrastructure

**Platform:** Vercel + Supabase (Existing)
**Key Services:** Vercel (hosting, cron, edge functions), Supabase (PostgreSQL, Auth, Realtime, Storage), GoFrugal API
**Deployment Host and Regions:** Vercel Global CDN with Supabase in Mumbai region (ap-south-1)

### Repository Structure

**Structure:** Monolithic Next.js application
**Monorepo Tool:** N/A - Single application repository
**Package Organization:** Feature-based organization within app directory using Next.js 15 App Router

### Architecture Diagram

```mermaid
graph TB
    subgraph "User Layer"
        SM[Store Manager<br/>Mobile/Desktop]
        AIC[Accounts Incharge<br/>Desktop]
        OWN[Business Owner<br/>Mobile Dashboard]
    end

    subgraph "Vercel Edge Network"
        CF[CDN/Edge Cache]
        NEXT[Next.js App<br/>SSG/ISR Pages]
        API[API Routes<br/>Edge Functions]
        CRON[Vercel Cron<br/>Hourly Sync]
    end

    subgraph "Supabase Platform"
        AUTH[Supabase Auth<br/>Email + Google SSO]
        
        subgraph "Database Layer"
            EXISTING[(Existing Tables<br/>sales, expenses,<br/>cash_movements)]
            APIDATA[(API Tables<br/>gofrugal_sales)]
            RECON[(Reconciliation<br/>Tables)]
        end
        
        REALTIME[Realtime<br/>Subscriptions]
        STORAGE[Storage<br/>Images/Documents]
    end

    subgraph "External Systems"
        GOFRUGAL[GoFrugal API<br/>POS Data]
        SLACK[Slack API<br/>Notifications]
    end

    SM --> CF
    AIC --> CF
    OWN --> CF
    
    CF --> NEXT
    NEXT --> API
    API --> AUTH
    
    CRON --> GOFRUGAL
    GOFRUGAL --> APIDATA
    
    APIDATA --> RECON
    EXISTING --> RECON
    
    RECON --> SLACK
```

### Architectural Patterns

- **Validation Layer Architecture:** Parallel API integration preserves manual entry as validation checkpoint
- **Surgical Enhancement Pattern:** Add capabilities via parallel structures without modifying existing
- **Service Layer Security Pattern:** Centralized data access services enforce store-level isolation
- **Repository Pattern:** Abstract data access for both manual and API data
- **Circuit Breaker Pattern:** Graceful degradation when GoFrugal API fails
- **Optimistic UI Updates:** Immediate feedback with background synchronization
