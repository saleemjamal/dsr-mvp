# 1. Introduction

This document outlines the complete fullstack architecture for DSR-MVP Dual-Source Retail ERP, focusing on the enhancement to integrate GoFrugal API data while preserving the existing manual entry system. This unified architecture covers both backend and frontend concerns to guide the implementation of a validation layer that transforms manual data entry from a weakness into a strategic validation advantage.

### Project Context

- **Existing System**: DSR-MVP with 90% complete cash management functionality
- **Tech Stack**: Next.js 15.0.3, TypeScript, Tailwind CSS, Supabase
- **Enhancement Strategy**: Parallel API layer without disrupting current operations
- **Key Innovation**: Three-way reconciliation between POS, manual entry, and bank data
