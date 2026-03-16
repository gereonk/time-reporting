# Time Reporting App

A modern, bright React web app for time reporting with a Supabase backend.

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Supabase (auth, database, edge functions)
- **Styling:** Custom CSS (modern, bright, responsive)
- **Date handling:** date-fns
- **Icons:** Lucide React

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **anon public key** from Settings > API

### 2. Run the database schema

1. Open the **SQL Editor** in your Supabase dashboard
2. Copy and paste the contents of `supabase/schema.sql` and run it
3. Optionally run `supabase/seed.sql` for sample team data

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install and run

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 5. Create your first admin user

1. Register a user through the app (must use an `@svt.se` email)
2. In the Supabase SQL Editor, update that user's role to admin:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@svt.se';
```

## Reminder Email Setup

The `supabase/functions/send-reminders/index.ts` contains a Supabase Edge Function that checks for consultants who haven't reported hours for the previous week.

### Deploy the edge function

```bash
supabase functions deploy send-reminders
```

### Set up scheduled execution

Run the SQL in `supabase/reminder-function.sql` to set up a `pg_cron` job that triggers every Monday at 09:00 UTC.

Alternatively, use an external cron service to call:

```
POST https://your-project.supabase.co/functions/v1/send-reminders
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

### Email provider

The edge function logs reminders by default. To send actual emails, uncomment the Resend/SendGrid section in the edge function and set the `RESEND_API_KEY` secret:

```bash
supabase secrets set RESEND_API_KEY=your-key
```

## User Roles

- **Consultant:** Can report time, manage vacations, view summary
- **Admin:** Can view all time reports, manage teams and users

## Project Structure

```
src/
├── lib/supabase.js           # Supabase client
├── contexts/AuthContext.jsx   # Auth state management
├── components/
│   ├── Layout.jsx             # Sidebar navigation
│   └── ProtectedRoute.jsx     # Auth guard
├── pages/
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── consultant/
│   │   ├── TimeReporting.jsx  # Weekly time entry
│   │   ├── Vacation.jsx       # Vacation management
│   │   ├── Summary.jsx        # Monthly summary
│   │   └── Settings.jsx       # Profile settings
│   └── admin/
│       ├── AdminTimeReporting.jsx  # Overview of all consultants
│       └── AdminUsers.jsx          # Team & user management
└── index.css                  # All styles

supabase/
├── schema.sql                 # Database schema + RLS policies
├── seed.sql                   # Sample data
├── reminder-function.sql      # pg_cron setup
└── functions/
    └── send-reminders/        # Edge function for email reminders
```
