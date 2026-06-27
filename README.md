# DigitalStore — Digital Products Marketplace

A production-ready platform for selling digital assets (e-books, design files, software, templates, etc.). Built on [Payload CMS v3](https://payloadcms.com) + [Next.js 16](https://nextjs.org) with Stripe payments, instant download delivery, and Docker deployment.

## Features

- **Digital Products** — Upload files, set download limits and expiration, automatic download link activation on purchase
- **Stripe Payments** — Credit card checkout with Stripe Elements
- **Instant Downloads** — Buyers get immediate access with download count tracking and time-limited access
- **Search & Filter** — Full-text search, category sidebar, and sort options on the homepage
- **Admin Panel** — Full CMS at `/admin` for managing products, orders, users, and digital assets
- **Customer Accounts** — Registration, login, password reset, order history, download history
- **Guest Checkout** — Anonymous purchases with email-based order access
- **Multi-language** — Accept-Language auto-detection
- **HTTPS** — Caddy reverse proxy with auto TLS
- **Docker** — One-command deployment with PostgreSQL, Redis, and Caddy

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| Caddy | 8443 | HTTPS reverse proxy (TLS termination) |
| App | 3000 (internal) | Payload CMS + Next.js storefront |
| PostgreSQL | 5432 | Database |
| Redis | 6380 | Optional cache / event bus |

## Quick Start (Docker)

```bash
# 1. Clone and set up
git clone <repo-url> digital-store
cd digital-store

# 2. Configure environment
cp .env.docker .env
# Edit .env with your Stripe keys and secrets

# 3. Generate SSL certificates
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/localhost.key \
  -out certs/localhost.crt -days 365 -nodes -subj "/CN=localhost"

# 4. Start all services
docker compose up -d

# 5. Create database tables and admin user
docker compose exec app pnpm payload migrate:create
docker compose exec app pnpm payload migrate
curl -k -X POST https://localhost:8443/api/users/first-register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@digitalstore.com","password":"admin123456"}'

# 6. Open in browser
open https://localhost:8443          # Storefront
open https://localhost:8443/admin    # Admin panel
```

## Quick Start (Local Dev)

```bash
pnpm install
cp .env.example .env
# Edit .env with your database URL and Stripe keys
pnpm payload migrate:create
pnpm payload migrate
pnpm dev
# Open http://localhost:3000
# Create first admin user at http://localhost:3000/admin
```

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@digitalstore.com` | `admin123456` |

> **Docker**: Create the user via the API (see Quick Start above).  
> **Local Dev**: First user is created on initial login to `/admin`.

## Environment Variables (`.env`)

```bash
# Required
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/payload-digital-store
PAYLOAD_SECRET=your-secret-here
NEXT_PUBLIC_SERVER_URL=http://localhost:3000

# Stripe Payments (required for checkout)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOKS_SIGNING_SECRET=whsec_xxx

# Email / SMTP (optional — uses console logging if unset)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASS=app_password
# SMTP_FROM=noreply@digitalstore.com
# SMTP_FROM_NAME=DigitalStore

# R2 / S3 Storage (optional — uses local disk if unset)
# S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
# S3_BUCKET=digital-assets
# S3_ACCESS_KEY_ID=xxx
# S3_SECRET_ACCESS_KEY=xxx
# S3_REGION=auto
```

For Docker, use `.env.docker` with service hostnames:
```bash
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/payload
NEXT_PUBLIC_SERVER_URL=https://localhost:8443
```

## Database Migrations

```bash
# Create migration files
pnpm payload migrate:create

# Apply migrations
pnpm payload migrate
```

Docker containers auto-run migrations on startup (`CMD ["sh", "-c", "pnpm payload migrate || true && pnpm start"]`).

## Build & Production

```bash
# Build
pnpm build

# Start production server
pnpm start
```

All pages use `force-dynamic` rendering — no static pre-rendering. The app requires a running database during build and runtime.

## Project Structure

```
src/
├── app/(app)/               # Next.js storefront pages
│   ├── page.tsx              # Homepage (search + categories + product grid)
│   ├── products/[slug]/      # Product detail page
│   ├── checkout/             # Checkout page (Stripe + free)
│   ├── (account)/            # Account dashboard
│   │   ├── account/          # Settings
│   │   ├── orders/           # Order history + download buttons
│   │   └── downloads/        # My Downloads page
│   ├── login/                # Login
│   ├── create-account/       # Registration
│   └── forgot-password/     # Password reset
├── collections/              # Payload CMS collections
│   ├── Products/             # Product (overrides ecommerce plugin)
│   ├── DigitalAssets.ts      # Digital file management
│   ├── Media.ts              # File uploads
│   ├── Users/                # User accounts
│   ├── Categories.ts         # Product categories
│   └── Pages.ts             # CMS pages
├── components/               # React components
│   ├── Cart/                 # AddToCart, CartModal
│   ├── checkout/             # SimpleCheckout (Stripe)
│   ├── admin/                # Admin panel widgets
│   └── ui/                   # shadcn/ui components
├── endpoints/
│   ├── download.ts           # GET /api/downloads/:id (auth + limits + file stream)
│   └── create-payment.ts     # POST /api/create-payment (Stripe PaymentIntent)
├── hooks/
│   └── activateDigitalDownloads.ts  # Order completion → activate download links
├── lib/
│   └── r2-adapter.ts         # Cloudflare R2 / S3 storage adapter
├── plugins/
│   └── index.ts              # Ecommerce, SEO, Form Builder, Cloud Storage plugins
└── payload.config.ts         # Main Payload configuration
```

## Key API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/first-register` | Create initial admin user (works once) |
| POST | `/api/users/login` | Login → returns JWT token |
| GET | `/api/downloads/:id` | Download digital file (auth + limits) |
| POST | `/api/create-payment` | Create Stripe PaymentIntent |
| GET | `/api/payments/stripe/webhooks` | Stripe webhook receiver |
| POST | `/api/carts` | Create shopping cart |
| POST | `/api/carts/:id/add-item` | Add item to cart |
| POST | `/api/orders` | Create order |

## Adding Digital Products

1. **Admin** → Digital Assets → Create New
   - Select Product from dropdown
   - Upload file
   - Fill filename, size, MIME type
   - Set max downloads (default 5)
2. **Admin** → Products → Edit → Check **Digital Product** in sidebar
3. After purchase, the download section appears on:
   - Order detail page (`/orders/:id`)
   - My Downloads page (`/downloads`)
   - Product detail page as "Included Files"

## Stripe Webhook (Local Dev)

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe/webhooks
stripe trigger payment_intent.succeeded
```

## License

MIT
