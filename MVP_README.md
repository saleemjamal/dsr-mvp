# DSR Simplified MVP

A modern, mobile-first daily sales reporting system built with Next.js 15, Tailwind CSS, and shadcn/ui components.

## 🚀 Features

### ✅ Implemented (MVP)
- **Responsive Dashboard** - Mobile-first design with key metrics
- **Sales Management** - Create and view sales transactions
- **Expense Tracking** - Record and categorize business expenses  
- **Dark Mode** - System-aware theme switching
- **Mobile Optimized** - Touch-friendly interface with horizontal scroll tables
- **Modern UI** - Clean interface built with shadcn/ui components

### 🚧 Coming Soon
- **Gift Vouchers** - Create and manage gift vouchers
- **Advanced Reports** - Detailed analytics and exports
- **Authentication** - User management and role-based access
- **Real-time Data** - Live updates via Supabase
- **File Uploads** - Receipt and voucher image handling

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS + shadcn/ui components
- **Icons**: Lucide React
- **Fonts**: Inter
- **Notifications**: Sonner (toast notifications)
- **Theme**: next-themes (dark mode support)
- **Database**: Supabase PostgreSQL (when connected)
- **Deployment**: Vercel

## 📱 Mobile-First Design

- **Responsive tables** with horizontal scroll on mobile
- **Card views** as alternative to tables on small screens
- **Touch-optimized** form controls (44px minimum touch targets)
- **Mobile navigation** with collapsible sidebar
- **Dark mode** support

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or navigate to the project
cd dsr-mvp

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the application.

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run deploy       # Deploy to Vercel (production)
npm run deploy:preview # Deploy preview to Vercel
```

## 🗃 Project Structure

```
dsr-mvp/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── sales/          # Sales management pages
│   │   ├── expenses/       # Expense tracking pages  
│   │   ├── vouchers/       # Gift vouchers (placeholder)
│   │   └── reports/        # Reports (placeholder)
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   ├── layout/        # Layout components (sidebar, header)
│   │   ├── theme-provider.tsx
│   │   └── theme-toggle.tsx
│   ├── lib/
│   │   ├── supabase.ts    # Supabase client setup
│   │   └── utils.ts       # Utility functions
│   └── types/
│       └── database.ts    # TypeScript definitions
├── database-schema.sql     # Database schema for Supabase
├── vercel.json            # Vercel deployment config
└── README.md
```

## 💾 Database Setup (Optional)

The MVP currently uses mock data. To connect to Supabase:

1. Create a new Supabase project
2. Run the SQL in `database-schema.sql` in your Supabase SQL editor
3. Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key  
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎨 UI Features

### Dashboard
- **Metrics cards** showing key business data
- **Recent activity** with real-time appearance
- **Quick actions** for common tasks
- **Responsive grid** layout

### Sales & Expenses
- **Data tables** with horizontal scroll on mobile
- **Card views** for mobile-friendly browsing  
- **Form validation** with error handling
- **Loading states** and success notifications

### Theme Support
- **Light/Dark/System** theme options
- **CSS variables** for consistent theming
- **Smooth transitions** between themes

## 🚀 Deployment

### Vercel (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `npm run deploy`
3. Follow the prompts to deploy

The application is optimized for Vercel with:
- Edge functions support
- Automatic builds
- Environment variable management
- Domain management

## 🔧 Configuration

### Environment Variables

```env
# Supabase (Optional - uses mock data without these)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App Configuration  
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Vercel Settings
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## 📝 Next Steps

1. **Connect to Supabase** - Replace mock data with real database
2. **Add Authentication** - Implement user management
3. **Complete Features** - Build vouchers and reports
4. **Add File Uploads** - Receipt and voucher images
5. **Real-time Updates** - Live data synchronization

## 🤝 Contributing

This is an MVP for rapid prototyping. Future development will include:
- Authentication system
- Complete feature set
- Advanced reporting
- Mobile app support

---

**Status**: MVP Complete ✅  
**Next Phase**: Authentication & Real Data Integration