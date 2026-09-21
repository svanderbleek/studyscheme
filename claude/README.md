This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Deployment

StudyScheme is deployed on Vercel: **https://claude-eight-mu.vercel.app** (also aliased at `claude-studyscheme.vercel.app`).

- **Hosting**: Vercel project `studyscheme/claude`.
- **Database**: Neon Postgres, provisioned via the Vercel Marketplace integration (`vercel integration add neon`). This auto-manages `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED` (direct, used for migrations) across the Production/Preview/Development environments — no manual DB env var wiring needed.
- **Other required env vars** (set per-environment via `vercel env add`, not committed): `SESSION_SECRET` (32+ char random string), `ANTHROPIC_API_KEY`.

### Redeploying

```bash
npx vercel deploy         # preview deployment
npx vercel deploy --prod  # production deployment
```

### Running a new migration against production

Prisma Migrate needs the **unpooled** connection for DDL — the pooled `DATABASE_URL` can cause issues with advisory locks:

```bash
npx vercel env pull /tmp/prod.env --environment=production --yes
DATABASE_URL=$(grep '^DATABASE_URL_UNPOOLED=' /tmp/prod.env | cut -d'=' -f2- | tr -d '"') npx prisma migrate deploy
rm /tmp/prod.env
```
