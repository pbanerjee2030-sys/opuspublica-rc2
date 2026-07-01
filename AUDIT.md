# Opus Publica — Project Audit Document
Generated: 2026-07-01

---

## 1. Folder Structure (tree -L 3 -I node_modules)

```
Opus-Publica-Minimalistic-Website/
├── app/
│   ├── actions/
│   │   └── submitArticle.ts
│   ├── admin/
│   │   ├── articles/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── journals/
│   │   │   └── page.tsx
│   │   ├── reviewers/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/
│   │   ├── admin/
│   │   │   ├── data/
│   │   │   │   └── route.ts
│   │   │   └── setup/
│   │   │       └── route.ts
│   │   ├── debug/
│   │   │   └── route.ts
│   │   ├── doi/
│   │   │   └── mint/
│   │   │       └── route.ts
│   │   └── notifications/
│   │       └── route.ts
│   ├── books/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── cookies/
│   │   ├── CookieClient.tsx
│   │   └── page.tsx
│   ├── login/
│   │   └── page.tsx
│   ├── privacy/
│   │   ├── PrivacyClient.tsx
│   │   └── page.tsx
│   ├── profile/
│   │   └── [id]/
│   │       └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   ├── search/
│   │   └── page.tsx
│   ├── setup/
│   │   └── page.tsx
│   ├── submit/
│   │   └── page.tsx
│   ├── terms/
│   │   ├── TermsClient.tsx
│   │   └── page.tsx
│   ├── [journal-slug]/
│   │   ├── article/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   └── page.tsx
│   ├── error.tsx
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── not-found.tsx
│   └── page.tsx
├── components/
│   ├── CitationBox.tsx
│   ├── CitationExport.tsx
│   ├── CookieConsent.tsx
│   ├── CookieSettingsButton.tsx
│   ├── Footer.tsx
│   ├── Navbar.tsx
│   ├── ScrollToTop.tsx
│   └── SearchBar.tsx
├── lib/
│   ├── admin-api.ts
│   ├── crossref.ts
│   ├── data.ts
│   ├── supabase-admin.ts
│   ├── supabase-server.ts
│   ├── supabase.ts
│   └── types.ts
├── public/
│   ├── books/
│   │   ├── Echoes of the Himalayas.png
│   │   ├── From the Bhagavad Gita to the Ballot Box.png
│   │   └── GRACE-Timekeepers-of-Ancient-Cultural-Legacy.png
│   ├── pdfs/
│   │   ├── conflict-peace-studies.pdf
│   │   ├── expressions-sustainable-art.pdf
│   │   └── migration-matters.pdf
│   ├── CyberSec Journal.jpg
│   ├── Echoes-of-the-Himalayas-user-preview.png
│   ├── EcoLaw Journal.jpg
│   ├── Expressions.jpg
│   ├── From-the-Bhagavad-Gita-to-the-Ballot-Box-...-preview.png
│   ├── GPPD.jpg
│   ├── GRACE-Timekeepers-of-Ancient-Cultural-Legacy-user-preview.png
│   ├── Journal of Conflict and Peace Studies.jpg
│   ├── Migration Matters.jpg
│   ├── Opus Publica flat logo.jpg
│   ├── OpusPublica icon.png
│   ├── The World Trade and Finance Journal.jpg
│   ├── Voice and rights.jpg
│   ├── Welcome to Opus Publica.jpg
│   ├── favicon2.ico
│   ├── robots.txt
│   └── sitemap.xml
├── scripts/
│   ├── migrate_ojs.ts
│   ├── remove_navbars.ts
│   ├── update_author_name.ts
│   └── upload_covers.ts
├── sections/
│   ├── About.tsx
│   ├── Books.tsx
│   ├── Contact.tsx
│   ├── Hero.tsx
│   └── Journals.tsx
├── supabase/
│   ├── migrations/
│   │   ├── 20260627000000_multi_tenant_setup.sql
│   │   ├── 20260627000001_add_article_and_profile_fields.sql
│   │   ├── 20260627000002_add_doi_to_articles.sql
│   │   ├── 20260627000003_add_rejection_reason_to_articles.sql
│   │   └── 20260628000000_add_version_control_and_reviewers.sql
│   ├── FIX_missing_tables.sql
│   ├── FIX_trigger.sql
│   ├── FIX_trigger_v2.sql
│   ├── FIX_trigger_v3.sql
│   └── schema.sql
├── .env.local
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tailwind.config.js
├── tsconfig.json
└── tsconfig.tsbuildinfo
```

---

## 2. package.json

```json
{
  "name": "opus-publica",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@next/font": "^14.2.15",
    "@supabase/supabase-js": "^2.108.2",
    "framer-motion": "^12.40.0",
    "lucide-react": "^1.21.0",
    "next": "16.2.9",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "react-intersection-observer": "^10.0.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.9",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Key Dependencies:
| Package | Version | Purpose |
|---------|---------|---------|
| next | 16.2.9 | React framework (App Router) |
| react | 19.2.4 | UI library |
| @supabase/supabase-js | 2.108.2 | Database, Auth, Storage client |
| framer-motion | 12.40.0 | Animations |
| lucide-react | 1.21.0 | Icons |
| tailwindcss | 4.x | CSS framework |

---

## 3. Prisma / ORM Status

**prisma/schema.prisma: DOES NOT EXIST**

This project does **not** use Prisma or any ORM. All database operations go directly through the **Supabase JS Client** (`@supabase/supabase-js`), which communicates with PostgreSQL via Supabase's REST API (PostgREST).

Database schema is defined in:
- `supabase/schema.sql` — canonical schema
- `supabase/migrations/` — migration history (5 migrations)
- `supabase/FIX_*.sql` — hotfix scripts

---

## 4. Environment Configuration (.env.local)

**.env.example: DOES NOT EXIST**

### Services Wired Up:

| Service | Provider | Env Vars | Purpose |
|---------|----------|----------|---------|
| **Database** | Supabase (PostgreSQL) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public client — reads, auth |
| **Database Admin** | Supabase (Service Role) | `SUPABASE_SERVICE_ROLE_KEY` | Server-only — bypasses RLS for admin operations |
| **DOI Minting** | Crossref | `CROSSREF_USERNAME`, `CROSSREF_PASSWORD` | Registers DOIs for published articles |
| **Email** | Resend (not yet configured) | `RESEND_API_KEY` (missing) | Transactional emails — submission, publish, reject, review notifications |

### Redacted .env.local:

```
NEXT_PUBLIC_SUPABASE_URL=http...e.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...tuNI
SUPABASE_SERVICE_ROLE_KEY=eyJh...DcgQ
CROSSREF_USERNAME=pron....com
CROSSREF_PASSWORD=AUN4...2030
```

### Supabase Project:
- **Project Ref**: `pnrmsxowlquoifhhfeom`
- **URL**: `https://pnrmsxowlquoifhhfeom.supabase.co`
- **Tables**: `journals`, `profiles`, `articles`, `article_authors`, `reviewer_assignments`, `article_versions`
- **Storage Buckets**: `publications` (PDFs), `covers` (journal images)

### Missing for Full Functionality:
- `RESEND_API_KEY` — needed for email notifications (currently logs to console as fallback)

---

## 5. Architecture Summary

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 16 App Router (React 19, Tailwind 4)   │
│                                                  │
│  Pages: 26 routes                                │
│  - Public: home, journals, articles, books,      │
│    search, profile, login, register, submit      │
│  - Admin: dashboard, articles, journals, users,  │
│    reviewers, settings, setup                    │
│  - Legal: privacy, terms, cookies                │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │  Supabase Browser Client │
          │  (RLS-enforced reads)    │
          └────────────┬────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│                 API ROUTES                        │
│  /api/admin/data   — Admin CRUD (service role)    │
│  /api/admin/setup  — Promote user to admin        │
│  /api/doi/mint     — Crossref DOI registration    │
│  /api/notifications — Resend email dispatch       │
│  /api/debug        — Diagnostic endpoint          │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │  Supabase Admin Client   │
          │  (Service Role, no RLS)  │
          └────────────┬────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│              SUPABASE (PostgreSQL)                │
│  Tables: journals, profiles, articles,           │
│          article_authors, reviewer_assignments,   │
│          article_versions                         │
│  Auth: Email/Password with trigger-based          │
│        profile creation                           │
│  Storage: publications (PDFs), covers (images)   │
└─────────────────────────────────────────────────┘
```

---

## 6. Database Schema (Current)

| Table | Columns | Row Count |
|-------|---------|-----------|
| `journals` | id, name, slug, description, cover_image, created_at, updated_at | 8 |
| `profiles` | id, role, journal_id, full_name, avatar_url, bio, affiliation, email, created_at, updated_at | 2 |
| `articles` | id, title, content, status, journal_id, abstract, pdf_url, doi, published_at, rejection_reason, version, created_at, updated_at | 4 |
| `article_authors` | article_id, profile_id | 4 |
| `reviewer_assignments` | id, article_id, reviewer_id, status, recommendation, comments, created_at, updated_at | 0 (table pending migration) |
| `article_versions` | id, article_id, version_number, content, changelog, created_by, created_at | 0 (table pending migration) |

### User Roles:
- `admin` — Full platform access
- `editor` — Article review, DOI minting, reviewer management
- `author` — Submit manuscripts, view own profile
- `reviewer` — Complete assigned reviews (not yet in enum)

### Article Statuses:
- `pending_review` — Awaiting editorial decision
- `published` — Approved and indexed
- `rejected` — Rejected with reason

---

## 7. Audit Checklist

- [x] No Prisma/ORM — direct Supabase client usage
- [x] Service role key server-side only (never exposed to browser)
- [x] RLS enabled on all tables
- [x] Auth trigger auto-creates profile on signup
- [x] Admin data API bypasses RLS with service role
- [x] DOI minting via Crossref REST API
- [x] Email notifications via Resend (pending API key)
- [x] PDF storage in Supabase Storage bucket
- [x] Image optimization via Next.js Image component
- [x] Build passes (26 routes, 0 TypeScript errors)
- [ ] RESEND_API_KEY not configured (emails log to console)
- [ ] reviewer_assignments table needs SQL migration
- [ ] article_versions table needs SQL migration
- [ ] No rate limiting on public API routes
- [ ] No CSRF protection beyond Bearer tokens
