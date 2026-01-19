# Deployment Guide

This comprehensive guide covers deploying the BlogPlatform to production using Render.com free tier, along with local development setup and troubleshooting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Render.com Deployment](#rendercom-deployment)
4. [Initial Admin Account Setup](#initial-admin-account-setup)
5. [Environment Variables Reference](#environment-variables-reference)
6. [Stripe Webhook Setup](#stripe-webhook-setup)
7. [Custom Domain Configuration](#custom-domain-configuration)
8. [Database Management](#database-management)
9. [Monitoring and Maintenance](#monitoring-and-maintenance)
10. [Troubleshooting](#troubleshooting)
11. [Cost Breakdown](#cost-breakdown)
12. [Scaling and Upgrades](#scaling-and-upgrades)

---

## Prerequisites

Before deploying, ensure you have:

### Accounts Required

1. **GitHub Account** - For repository hosting and CI/CD integration
2. **Render.com Account** - Free tier available at render.com
3. **Stripe Account** - For payment processing at stripe.com
4. **Resend Account** - For transactional emails at resend.com
5. **Cloudinary Account** - For image storage at cloudinary.com

### Tools Required

- Node.js 18.x or higher
- npm or yarn
- Git
- Docker (optional, for local PostgreSQL)
- PostgreSQL client (optional, for database management)

---

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/blog-platform.git
cd blog-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL with Docker

The easiest way to run PostgreSQL locally is with Docker:

```bash
# Create and start PostgreSQL container
docker run --name blog-postgres \
  -e POSTGRES_USER=blog_user \
  -e POSTGRES_PASSWORD=blog_password \
  -e POSTGRES_DB=blog \
  -p 5432:5432 \
  -d postgres:15-alpine

# Verify container is running
docker ps
```

To stop and start the container later:

```bash
# Stop the container
docker stop blog-postgres

# Start again
docker start blog-postgres
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Update .env with your local settings:

```env
# Database (local Docker)
DATABASE_URL="postgresql://blog_user:blog_password@localhost:5432/blog"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-for-local-dev"

# Add other variables as needed (see Environment Variables Reference)
```

Generate a secure NEXTAUTH_SECRET:

```bash
openssl rand -base64 32
```

### 5. Initialize the Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed the database with sample data
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000 to see your application.

### 7. Useful Development Commands

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (drops all data)
npm run db:reset

# Format code
npm run format

# Run linter
npm run lint

# Type check
npm run typecheck

# Check health endpoint
npm run health
```

---

## Render.com Deployment

### Option A: Blueprint Deployment (Recommended)

The easiest way to deploy is using the included render.yaml Blueprint file.

#### Steps:

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Create Blueprint in Render**
   - Log in to Render Dashboard at dashboard.render.com
   - Click New then Blueprint
   - Connect your GitHub repository
   - Select the repository containing render.yaml
   - Click Apply

3. **Configure Secret Environment Variables**

   After the Blueprint creates your services, you need to set secret values:
   - Go to your web service then Environment
   - Set each variable marked sync: false in render.yaml:
     - STRIPE_SECRET_KEY
     - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
     - STRIPE_WEBHOOK_SECRET
     - NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
     - NEXT_PUBLIC_STRIPE_PRICE_YEARLY
     - RESEND_API_KEY
     - EMAIL_FROM
     - CLOUDINARY_CLOUD_NAME
     - CLOUDINARY_API_KEY
     - CLOUDINARY_API_SECRET
     - OAuth credentials (optional)

4. **Deploy**
   - Click Manual Deploy then Deploy latest commit
   - Wait for build to complete (5-10 minutes)

### Option B: Manual Deployment

If you prefer manual setup:

#### 1. Create PostgreSQL Database

1. Go to Render Dashboard then New then PostgreSQL
2. Configure:
   - Name: blog-db
   - Database: blog
   - User: blog_user
   - Region: Choose closest to your users
   - Plan: Free
3. Click Create Database
4. Copy the External Database URL for later

#### 2. Create Web Service

1. Go to Render Dashboard then New then Web Service
2. Connect your GitHub repository
3. Configure:
   - Name: blog-platform
   - Environment: Node
   - Region: Same as database
   - Branch: main
   - Build Command: npm install && npm run build
   - Start Command: npm start
   - Plan: Free

4. Add Environment Variables (see Environment Variables Reference)

5. Click Create Web Service

### Post-Deployment Checklist

After deployment, verify:

- [ ] Health check passes: https://your-app.onrender.com/api/health
- [ ] Homepage loads correctly
- [ ] User registration works
- [ ] Login/logout works
- [ ] Image uploads work (Cloudinary)
- [ ] Email sending works (Resend)
- [ ] Stripe checkout works (test mode)
- [ ] All pages render without errors

---

## Initial Admin Account Setup

Render's free tier does not provide shell access, so you cannot run `npm run db:seed` to create initial users. Instead, use the protected `/api/admin/setup` endpoint to create your first admin account.

### 1. Generate a Secure Setup Key

Use one of these methods to generate a cryptographically secure key (minimum 32 characters):

```bash
# Option 1: Using OpenSSL
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Using Python
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

This will output something like: `K7xZp9qR2vN5mL1wT8yU3oI6aE0dC4fH9jB2kP5sX7n=`

**Important**: Store this key securely in a password manager. You will need it to create admin accounts.

### 2. Add the Key to Render

1. Go to your Render Dashboard
2. Select your web service
3. Navigate to **Environment** tab
4. Add a new environment variable:
   - **Key**: `ADMIN_SETUP_KEY`
   - **Value**: Your generated key from step 1
5. Click **Save Changes**
6. Redeploy the service for changes to take effect

### 3. Create Your Admin Account

After the service redeploys, create your admin account by calling the setup endpoint:

```bash
curl -X POST https://your-app.onrender.com/api/admin/setup \
  -H "Authorization: Bearer YOUR_SETUP_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourSecureP@ssword123",
    "name": "Your Name"
  }'
```

**Password Requirements**:
- Minimum 12 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&* etc.)

### 4. Successful Response

On success, you will receive:

```json
{
  "message": "Admin user created successfully",
  "created": true,
  "user": {
    "id": "clxx...",
    "email": "your-email@example.com",
    "name": "Your Name",
    "role": "ADMIN"
  }
}
```

The admin account is created with:
- **Role**: ADMIN (full platform access)
- **Subscription**: PAID tier
- **Email**: Pre-verified (no verification email needed)

### Security Features

The setup endpoint includes several security measures:

| Feature | Description |
|---------|-------------|
| **Timing-safe comparison** | Prevents timing attacks on the setup key |
| **Idempotent** | Calling with same email won't create duplicates |
| **Strong password validation** | Enforces complexity requirements |
| **Failed attempt logging** | Logs unauthorized access attempts |
| **Minimum key length** | Rejects keys shorter than 32 characters |

### Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| 503 - Setup endpoint not configured | ADMIN_SETUP_KEY not set or too short | Add key to environment variables and redeploy |
| 401 - Unauthorized | Wrong or missing setup key | Check Authorization header format: `Bearer <key>` |
| 400 - Validation error | Password doesn't meet requirements | Use a stronger password |
| 409 - User already exists | Email is taken by non-admin user | Use a different email address |

### Alternative: Local Seeding

If you have access to the production database URL, you can seed from your local machine:

```bash
# Set production DATABASE_URL temporarily
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require" npm run db:seed
```

**Warning**: The seed script deletes existing data in non-production environments. In production (`NODE_ENV=production`), it skips the cleanup step but may still fail if data already exists.

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | PostgreSQL connection string | postgresql://user:pass@host:5432/db?sslmode=require |
| NEXTAUTH_URL | Full URL of your application | https://your-app.onrender.com |
| NEXTAUTH_SECRET | Random secret for session encryption | Generate with openssl rand -base64 32 |
| NEXT_PUBLIC_APP_URL | Public URL (same as NEXTAUTH_URL) | https://your-app.onrender.com |

### Stripe Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| STRIPE_SECRET_KEY | Server-side API key | Stripe Dashboard - Developers - API keys |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | Client-side API key | Stripe Dashboard - Developers - API keys |
| STRIPE_WEBHOOK_SECRET | Webhook signing secret | Stripe Dashboard - Developers - Webhooks |
| NEXT_PUBLIC_STRIPE_PRICE_MONTHLY | Monthly subscription price ID | Stripe Dashboard - Products |
| NEXT_PUBLIC_STRIPE_PRICE_YEARLY | Yearly subscription price ID | Stripe Dashboard - Products |

### Email Variables (Resend)

| Variable | Description | Example |
|----------|-------------|---------|
| RESEND_API_KEY | Resend API key | re_123abc... |
| EMAIL_FROM | Sender email address | noreply@yourdomain.com |

### Image Storage (Cloudinary)

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| CLOUDINARY_CLOUD_NAME | Your cloud name | Cloudinary Dashboard |
| CLOUDINARY_API_KEY | API key | Cloudinary Dashboard - Settings |
| CLOUDINARY_API_SECRET | API secret | Cloudinary Dashboard - Settings |

### OAuth Providers (Optional)

| Variable | Description |
|----------|-------------|
| GOOGLE_CLIENT_ID | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret |
| GITHUB_CLIENT_ID | GitHub OAuth client ID |
| GITHUB_CLIENT_SECRET | GitHub OAuth client secret |

### Admin Setup

| Variable | Description | How to Generate |
|----------|-------------|-----------------|
| ADMIN_SETUP_KEY | Secret key for creating admin users via API (min 32 chars) | `openssl rand -base64 32` |

### Application Settings

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | production |
| NEXT_PUBLIC_APP_NAME | Display name for the app | BlogPlatform |

---

## Stripe Webhook Setup

Webhooks are essential for handling subscription events.

### 1. Create Webhook Endpoint

1. Go to Stripe Dashboard at dashboard.stripe.com then Developers then Webhooks
2. Click Add endpoint
3. Enter endpoint URL: https://your-app.onrender.com/api/subscriptions/webhook
4. Select events to listen for:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Click Add endpoint

### 2. Get Signing Secret

1. Click on your new webhook endpoint
2. Under Signing secret, click Reveal
3. Copy the secret (starts with whsec_)
4. Add to Render environment variables as STRIPE_WEBHOOK_SECRET

### 3. Create Products and Prices

1. Go to Stripe Dashboard then Products
2. Click Add product
3. Create a subscription product:
   - Name: "Premium Subscription"
   - Add two prices:
     - Monthly: $5/month (or your price)
     - Yearly: $50/year (or your price)
4. Copy the price IDs (start with price_)
5. Add to environment variables:
   - NEXT_PUBLIC_STRIPE_PRICE_MONTHLY
   - NEXT_PUBLIC_STRIPE_PRICE_YEARLY

### Testing Webhooks Locally

For local development, use the Stripe CLI:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/subscriptions/webhook

# Copy the webhook signing secret shown and add to .env
```

---

## Custom Domain Configuration

### 1. Add Domain in Render

1. Go to your web service in Render
2. Click Settings then Custom Domains
3. Click Add Custom Domain
4. Enter your domain (e.g., blog.yourdomain.com)

### 2. Configure DNS

For a subdomain (e.g., blog.yourdomain.com):
- Add a CNAME record pointing to your Render URL

For an apex domain (e.g., yourdomain.com):
- Add an A record pointing to 216.24.57.1
- Or use your registrar CNAME flattening if available

### 3. Update Environment Variables

After DNS propagates (can take up to 48 hours):

```env
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Update Stripe Webhook

Create a new webhook endpoint with your custom domain URL.

---

## Database Management

### Viewing Data

Use Prisma Studio locally to view/edit data:

```bash
# Connect to production database
DATABASE_URL="your-production-connection-string" npx prisma studio
```

### Migrations

#### Creating Migrations

```bash
# Create a new migration locally
npx prisma migrate dev --name describe_your_change

# Commit migration files
git add prisma/migrations
git commit -m "Add migration: describe_your_change"
git push
```

Render will automatically run prisma migrate deploy on each deployment.

#### Emergency Migration Rollback

If a migration fails:

1. Fix the issue locally
2. Create a new migration that reverses the changes
3. Push and deploy

### Backup Strategy

Render free tier PostgreSQL expires after 90 days. Plan accordingly:

#### Export Data

```bash
# Get connection string from Render dashboard
pg_dump "postgresql://user:pass@host:5432/db" > backup_$(date +%Y%m%d).sql
```

#### Import Data

```bash
psql "postgresql://user:pass@new-host:5432/db" < backup.sql
```

### Before 90-Day Expiry

Options:
1. **Upgrade to paid tier** ($7/month) - Data persists
2. **Export and recreate** - Export data, create new free database, import
3. **Switch providers** - Consider Supabase or Neon (no time limit on free tier)

---

## Monitoring and Maintenance

### Health Checks

The /api/health endpoint provides system status:

```bash
curl https://your-app.onrender.com/api/health | jq
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "ok",
      "latency": 45
    }
  }
}
```

### Logs

View logs in Render Dashboard:
1. Go to your web service
2. Click Logs tab
3. Filter by time range or search

### Error Tracking (Recommended)

Consider adding error tracking for production:

- Sentry at sentry.io - Free tier available
- LogRocket at logrocket.com - Session replay + errors

### Performance Monitoring

- Use browser DevTools Network tab
- Check Core Web Vitals in Chrome DevTools
- Monitor response times in Render dashboard

---

## Troubleshooting

### Build Failures

**Symptom**: Build fails in Render

**Common causes and solutions**:

1. **Missing environment variables**
   - Check all required variables are set
   - Ensure no typos in variable names

2. **Prisma generation fails**
   - Ensure postinstall script runs prisma generate
   - Check DATABASE_URL is accessible during build

3. **TypeScript errors**
   ```bash
   # Run locally to find errors
   npm run typecheck
   ```

4. **Out of memory**
   - Free tier has 512MB limit
   - Optimize imports, remove unused dependencies

### Database Connection Issues

**Symptom**: Error: Cannot reach database server

**Solutions**:

1. Verify DATABASE_URL is correct
2. Check if ?sslmode=require is appended
3. Ensure database is running (not paused on free tier)
4. Check Render service logs for specific errors

### Cold Start Latency

**Symptom**: First request takes 30+ seconds

**This is expected behavior** on Render free tier. The service spins down after 15 minutes of inactivity.

**Mitigations**:
- Add loading states for better UX (already implemented in app/loading.tsx)
- Consider upgrading to paid tier ($7/month) for always-on
- Use external uptime monitoring to keep service warm

### Authentication Issues

**Symptom**: Login redirects fail or sessions do not persist

**Solutions**:

1. Verify NEXTAUTH_URL matches your actual URL
2. Ensure NEXTAUTH_SECRET is set and consistent
3. Check that cookies are being set (not blocked)
4. Clear browser cookies and try again

### Stripe Webhook Failures

**Symptom**: Subscriptions not updating after payment

**Solutions**:

1. Check webhook endpoint URL is correct
2. Verify STRIPE_WEBHOOK_SECRET is current
3. Check Stripe Dashboard Webhooks for error logs
4. Ensure all required events are selected

### Image Upload Failures

**Symptom**: Images fail to upload

**Solutions**:

1. Verify Cloudinary credentials
2. Check file size limits (free tier: 10MB)
3. Ensure upload preset allows unsigned uploads
4. Check browser console for specific errors

### Email Not Sending

**Symptom**: Password reset emails not received

**Solutions**:

1. Verify RESEND_API_KEY is correct
2. Check sender domain is verified in Resend
3. Check spam folder
4. View Resend dashboard for delivery logs

---

## Cost Breakdown

### Free Tier (Monthly)

| Service | Plan | Cost | Limitations |
|---------|------|------|-------------|
| Render Web Service | Free | $0 | 750 hours, spins down after 15min |
| Render PostgreSQL | Free | $0 | 256MB RAM, 1GB storage, 90 days |
| Cloudinary | Free | $0 | 25GB storage, 25GB bandwidth |
| Resend | Free | $0 | 100 emails/day, 3000/month |
| Stripe | Free | $0 | 2.9% + $0.30 per transaction |

**Total: $0/month** (plus Stripe transaction fees)

### Recommended Production Setup (Monthly)

| Service | Plan | Cost | Benefits |
|---------|------|------|----------|
| Render Web Service | Starter | $7 | Always-on, more resources |
| Render PostgreSQL | Starter | $7 | Persistent, 1GB RAM |
| Cloudinary | Free | $0 | Usually sufficient |
| Resend | Free/Pro | $0-20 | Based on email volume |

**Total: ~$14-34/month**

### Scaling Costs

| When | Upgrade | Cost |
|------|---------|------|
| More than 100 daily active users | Web service to Standard | $25/month |
| Database over 1GB | PostgreSQL Standard | $20/month |
| High traffic | Add CDN (Cloudflare) | Free-$20/month |
| Email over 3000/month | Resend Pro | $20/month |

---

## Scaling and Upgrades

### When to Upgrade

Consider upgrading when:
- Cold starts affect user experience significantly
- Database approaching storage limit
- Hitting rate limits on any service
- Need for custom domains with SSL

### Upgrade Path

1. **Month 1-3**: Stay on free tier, validate product
2. **Month 3+**: Upgrade web service first ($7/month)
3. **Before 90 days**: Upgrade PostgreSQL or migrate data
4. **Growth phase**: Scale based on actual usage

### Alternative Hosting Options

If you outgrow Render or need different features:

| Provider | Pros | Cons |
|----------|------|------|
| Vercel | Great DX, edge functions | Can get expensive |
| Railway | Simple, good free tier | Newer platform |
| Fly.io | Global deployment | More complex setup |
| AWS/GCP | Maximum control | Requires DevOps expertise |

---

## Security Best Practices

### Already Implemented

- Security headers (X-Frame-Options, CSP, etc.)
- CSRF protection via NextAuth
- SQL injection prevention via Prisma
- Input validation with Zod
- Secure session management

### Recommended Additions

1. **Rate limiting** - Consider adding to API routes
2. **Content Security Policy** - Customize for your needs
3. **Regular updates** - Keep dependencies updated
4. **Security audits** - Run npm audit regularly

### Security Checklist

- [ ] All secrets are in environment variables
- [ ] .env is in .gitignore
- [ ] HTTPS is enforced
- [ ] Admin routes are protected
- [ ] File uploads are validated
- [ ] SQL injection is prevented
- [ ] XSS is mitigated

---

## Support and Resources

### Documentation

- Next.js Documentation at nextjs.org/docs
- Prisma Documentation at prisma.io/docs
- NextAuth.js Documentation at next-auth.js.org
- Render Documentation at render.com/docs
- Stripe Documentation at stripe.com/docs

### Community

- Next.js Discord at discord.gg/nextjs
- Prisma Slack at slack.prisma.io
- Render Community at community.render.com

### Getting Help

1. Check this documentation first
2. Search existing GitHub issues
3. Ask in community channels
4. Create a GitHub issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Environment details
   - Relevant logs

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Production build
npm run start           # Start production server

# Database
npm run db:migrate      # Run migrations (dev)
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset database

# Code quality
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run typecheck       # TypeScript check

# Deployment
git push origin main    # Deploy via Render (auto)
```

### Important URLs

- **Local**: http://localhost:3000
- **Health Check**: /api/health
- **Admin**: /admin
- **Dashboard**: /dashboard

### Environment Files

- .env - Local development (never commit)
- .env.example - Template (commit this)
- Render Dashboard - Production variables
