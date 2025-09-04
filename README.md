This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Setup

1. Copy the environment example file:
```bash
cp .env.local.example .env.local
```

2. Configure your environment variables in `.env.local` (see GoFrugal Integration Setup below)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## GoFrugal Integration Setup

### Required Environment Variables

Configure the following in your `.env.local` file:

#### Essential Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

#### GoFrugal API Configuration
- `GOFRUGAL_LICENSE_KEY`: Your GoFrugal license key (X-Auth-Token)
- `GOFRUGAL_BASE_URL`: Your HQ server URL (e.g., `http://192.168.1.100`)
- `GOFRUGAL_HQ_PATH`: Your HQ path (typically `/RayMedi_HQ` or `/WebReporter`)

### Feature Flags

Control feature rollout using these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_GOFRUGAL` | Main toggle for all GoFrugal features | `false` |
| `NEXT_PUBLIC_ENABLE_VARIANCE_BADGES` | Show variance indicators in UI | `false` |
| `NEXT_PUBLIC_ENABLE_SYNC_UI` | Enable sync management pages | `false` |
| `NEXT_PUBLIC_ENABLE_ITEMS_SYNC` | Enable product synchronization | `false` |
| `NEXT_PUBLIC_ENABLE_CUSTOMER_SYNC` | Enable customer synchronization | `false` |
| `NEXT_PUBLIC_ENABLE_LOYALTY` | Enable loyalty points sync | `false` |

### Gradual Rollout Strategy

1. **Start with everything disabled:**
   ```
   NEXT_PUBLIC_ENABLE_GOFRUGAL=false
   ```

2. **Test with specific stores:**
   ```
   ENABLED_STORES=store-id-1,store-id-2
   ```

3. **Percentage-based rollout:**
   ```
   ROLLOUT_PERCENTAGE=10  # Enable for 10% of stores
   ```

4. **Full rollout:**
   ```
   NEXT_PUBLIC_ENABLE_GOFRUGAL=true
   ROLLOUT_PERCENTAGE=100
   ```

### Performance Tuning

Adjust these settings based on your infrastructure:

- `GOFRUGAL_SYNC_BATCH_SIZE`: Records per batch (default: 100)
- `GOFRUGAL_SYNC_TIMEOUT`: API timeout in ms (default: 30000)
- `GOFRUGAL_MAX_RETRIES`: Retry attempts (default: 3)
- `GOFRUGAL_RATE_LIMIT_PER_HOUR`: Max API calls/hour (default: 1000)

### Security Notes

- Never commit `.env.local` to version control
- Keep `GOFRUGAL_LICENSE_KEY` server-side only
- Rotate `CRON_SECRET` regularly
- Use strong, unique values for all secrets

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
