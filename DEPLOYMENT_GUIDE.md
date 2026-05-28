# 🚀 School Management System – Complete Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Database Setup](#database-setup)
5. [Running the System](#running-the-system)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software
- **Node.js** (v18 or higher)
- **pnpm** (package manager) - `npm install -g pnpm`
- **Git** (for cloning/version control)
- **PostgreSQL** or **SQLite** (database)
- **Kali Linux** (or any Linux distribution)

### Verify Installation
```bash
node --version      # Should be v18+
npm --version       # Any version is fine
pnpm --version      # Should be installed
git --version       # Should be installed
```

---

## Environment Setup

### Step 1: Create `.env` File

In the root directory of the project, create a `.env` file:

```bash
cd /path/to/school-system1
cp .env.example .env
```

### Step 2: Configure `.env` for Local Development

Edit `.env` with your settings:

```dotenv
# Server Configuration
PORT=5173
BASE_PATH="/"
NODE_ENV=development

# Database (SQLite for local development)
DATABASE_URL="file:./dev.db"

# Security - REQUIRED (generate with: openssl rand -base64 32)
SESSION_SECRET="your-generated-secret-key-here"

# API Configuration (for unified deployment)
API_BASE_URL="http://localhost:5173/api"

# Logging
LOG_LEVEL="info"
```

### Step 3: Generate SESSION_SECRET

```bash
# Generate a strong random secret
openssl rand -base64 32

# Example output:
# aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890+/=ABC

# Copy this value and paste it in .env as:
# SESSION_SECRET="<your-generated-value>"
```

### Step 4: Verify .env File

```bash
cat .env

# Should show:
# PORT=5173
# DATABASE_URL="file:./dev.db"
# SESSION_SECRET="<your-secret>"
# NODE_ENV=development
```

✅ **Environment Setup Complete**

---

## Installation

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd /path/to/school-system1

# Install all dependencies (pnpm for monorepo)
pnpm install

# This will:
# - Install root dependencies
# - Install workspace dependencies (api-server, school, db, etc.)
# - Link all internal packages
# - Run postinstall scripts
```

⏱️ **Expected Time:** 2-5 minutes (first run, internet dependent)

### Step 2: Verify Installation

```bash
# Check that pnpm workspace is set up
pnpm list

# Should show:
# workspace
# ├── @workspace/api-server
# ├── @workspace/school (frontend)
# ├── @workspace/db
# ├── @workspace/api-zod
# ├── @workspace/api-client-react
# └── scripts
```

### Step 3: Build Workspace Packages

```bash
# Generate API client types and build packages
pnpm run generate

# Type check everything
pnpm run typecheck

# Expected output:
# - API spec generated
# - API client generated
# - Type check passes
```

✅ **Installation Complete**

---

## Database Setup

### Option A: SQLite (Local Development - Recommended)

#### Step 1: Initialize Database Schema

```bash
# Run Drizzle migrations to create schema
pnpm run db:push

# This will:
# - Create dev.db file
# - Create all tables (admins, teachers, students, classes, etc.)
# - Set up indexes and relations

# Expected output:
# [migration] Creating schema...
# [migration] Created tables...
# ✓ Database initialized
```

#### Step 2: Verify Database Creation

```bash
# Check that dev.db was created
ls -lh dev.db

# Should show: dev.db exists and has size > 0
```

### Option B: PostgreSQL (Production)

#### Step 1: Create PostgreSQL Database

```bash
# Log into PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE school_system;
CREATE USER school_admin WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE school_system TO school_admin;
\q
```

#### Step 2: Update .env

```dotenv
DATABASE_URL="postgresql://school_admin:strong_password_here@localhost:5432/school_system"
```

#### Step 3: Initialize Schema

```bash
pnpm run db:push
```

### Step 3: Verify Seed Data

```bash
# The server startup automatically seeds default data:
# - Default admin user (username: admin, password: admin123)
# - Academic years (2020-2099)
# - Iraqi class hierarchy

# After starting the server (next section), you can verify with:
curl http://localhost:5173/api/healthz
# Response: { "status": "ok" }
```

✅ **Database Setup Complete**

---

## Running the System

### Full Stack (Backend + Frontend + Database)

#### Option 1: Development Mode (Separate Terminals)

**Terminal 1 - Backend Server:**

```bash
cd /path/to/school-system1

# Start backend API server
pnpm start

# Expected output:
# ┌─────────────────────────────────────────────────┐
# │ ✓ Environment validation passed                 │
# │ ✓ Database initialization complete              │
# │ ✓ Seeded default admin (admin/admin123)         │
# │ ✓ Seeded academic years (2020-2099)             │
# │ ✓ School System API Server listening on 5173    │
# └─────────────────────────────────────────────────┘

# Server now running at: http://localhost:5173
# API base: http://localhost:5173/api
```

**Terminal 2 - Frontend (in same directory):**

```bash
cd /path/to/school-system1/artifacts/school

# Start frontend dev server
pnpm run dev

# Expected output:
# ✓ [API Client] Initialized with base URL: /api
# ✓ Frontend running at http://localhost:5173
```

#### Option 2: Unified Deployment (Single Process)

```bash
# Build frontend
cd artifacts/school && pnpm run build

# Copy built frontend to backend static files
cp -r dist/public/* ../api-server/public/

# Start backend (serves frontend automatically)
cd ../.. && pnpm start

# Access at: http://localhost:5173
# API at: http://localhost:5173/api
# Frontend served from backend
```

### Testing the System

#### Test 1: Check Backend Health

```bash
curl -s http://localhost:5173/api/healthz | jq

# Response:
# { "status": "ok" }
```

#### Test 2: Login

```bash
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin",
    "password": "admin123",
    "role": "admin"
  }'

# Response:
# {
#   "token": "eyJhZG1pbklkIjoxLCJ0cyI6...",
#   "admin": {
#     "id": 1,
#     "username": "admin",
#     "name": "مدير المدرسة",
#     "role": "admin",
#     "linkedId": null
#   }
# }
```

#### Test 3: Use Token for Protected Request

```bash
# Save token from login response
TOKEN="<token-from-login-response>"

# Access protected route
curl http://localhost:5173/api/users \
  -H "Authorization: Bearer $TOKEN"

# Response:
# [
#   {
#     "id": 1,
#     "username": "admin",
#     "name": "مدير المدرسة",
#     "role": "admin",
#     ...
#   }
# ]
```

#### Test 4: Login via Frontend

1. Open browser: `http://localhost:5173`
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
   - **Role:** `Admin`
3. Should redirect to dashboard
4. Frontend should automatically:
   - Store token in localStorage
   - Configure API client to use `/api`
   - Attach token to all requests

✅ **System Running Successfully**

---

## Complete Run Order (From Scratch)

### For Kali Linux (Fresh Install)

#### Step 1: Install System Dependencies

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Verify
node --version
pnpm --version
```

#### Step 2: Clone Repository

```bash
# Clone project
git clone https://github.com/ahshwi1/school-system1.git
cd school-system1

# Checkout feature branch (if not on main)
git checkout feat/unified-deployment-refactor
```

#### Step 3: Create Environment File

```bash
# Copy template
cp .env.example .env

# Generate SESSION_SECRET
SECRET=$(openssl rand -base64 32)
echo "Generated SECRET: $SECRET"

# Update .env with generated secret
sed -i "s/school_secret_change_me_in_production/$SECRET/g" .env

# Verify
cat .env
```

#### Step 4: Install Dependencies

```bash
# Install all dependencies
pnpm install

# Generate API code
pnpm run generate

# Type check
pnpm run typecheck
```

#### Step 5: Initialize Database

```bash
# Create schema and seed default data
pnpm run db:push

# Verify database created
ls -lh dev.db
```

#### Step 6: Start Backend

```bash
# Terminal 1: Start API server
pnpm start

# Should output:
# ✓ Environment validation passed
# ✓ Database initialization complete
# ✓ Seeded default admin
# ✓ School System API Server listening on port 5173
```

#### Step 7: Start Frontend (New Terminal)

```bash
# Terminal 2: Start frontend dev server
cd artifacts/school
pnpm run dev

# Should output:
# ✓ API Client Initialized
# Frontend running at http://localhost:5173
```

#### Step 8: Access System

```bash
# Open browser
firefox http://localhost:5173

# Login:
# Username: admin
# Password: admin123
# Role: Admin

# After login:
# - Redirected to dashboard
# - Token stored in localStorage
# - API client configured for /api
# - Ready to use
```

---

## Troubleshooting

### Issue: "SESSION_SECRET environment variable is required"

**Problem:** `.env` missing or SESSION_SECRET not set

**Solution:**
```bash
cp .env.example .env
openssl rand -base64 32  # Generate secret
# Edit .env and paste the generated secret
```

### Issue: "EADDRINUSE: address already in use :::5173"

**Problem:** Port 5173 already in use

**Solution:**
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
PORT=3000 pnpm start
```

### Issue: "Cannot find module '@workspace/db'"

**Problem:** Packages not linked properly

**Solution:**
```bash
# Reinstall with clean cache
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run generate
```

### Issue: "401 Unauthorized" on protected routes

**Problem:** Token not being sent

**Solution:**
1. Clear localStorage: `localStorage.clear()`
2. Login again
3. Check browser console for errors
4. Verify `Authorization` header is present:
   ```javascript
   // In browser console
   console.log(localStorage.getItem('school_token'))
   ```

### Issue: "Database connection failed"

**Problem:** DATABASE_URL incorrect or database not running

**Solution:**
```bash
# For SQLite:
rm -f dev.db  # Remove corrupted database
pnpm run db:push  # Recreate

# For PostgreSQL:
# Verify PostgreSQL is running:
sudo systemctl status postgresql
# Verify connection string in .env
```

### Issue: "Frontend API calls return 404"

**Problem:** API base URL not configured

**Solution:**
1. Check `api-client.ts` is setting base URL to `/api`
2. Check backend is running on correct port
3. Check both frontend and backend are on same port
4. Browser console should show: `[API Client] Initialized with base URL: /api`

---

## Production Deployment

### Environment Setup

```dotenv
# .env (Production)
PORT=80
NODE_ENV=production
DATABASE_URL="postgresql://school_admin:strong_password@db-server:5432/school_prod"
SESSION_SECRET="<very-strong-random-secret-from-openssl>"
API_BASE_URL="https://your-school-domain.com/api"
LOG_LEVEL="warn"
```

### Build for Production

```bash
# Build everything
pnpm run build

# Build optimized frontend
cd artifacts/school && pnpm run build

# Copy to backend
cp -r dist/public/* ../api-server/public/
```

### Start Production Server

```bash
# Using process manager (PM2)
npm install -g pm2
pm2 start pnpm --name "school-api" -- start
pm2 save

# Or using systemd service (see below)
```

### Systemd Service (Optional)

Create `/etc/systemd/system/school-api.service`:

```ini
[Unit]
Description=School Management System API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/school-system1
EnvironmentFile=/opt/school-system1/.env
ExecStart=/usr/bin/pnpm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable school-api
sudo systemctl start school-api
sudo systemctl status school-api
```

---

## Quick Reference

### Common Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm run generate     # Generate API client
pnpm run typecheck    # Type check
pnpm run db:push      # Initialize database
pnpm start            # Start backend
pnpm run dev          # Development mode (in artifacts/school)

# Production
pnpm run build        # Build everything
pnpm start            # Start production

# Database
rm dev.db && pnpm run db:push  # Reset database

# Cleanup
rm -rf node_modules pnpm-lock.yaml  # Clean install
pnpm install
```

### Ports

- **Frontend:** 5173 (development)
- **Backend:** 5173 (unified deployment)
- **API:** `/api` (relative to server)

### Default Credentials

- **Username:** `admin`
- **Password:** `admin123`
- **Role:** `Admin`

---

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review error logs: Check terminal output and logs
3. Verify environment: Check `.env` file
4. Test API: Use `curl` commands from Testing section
5. Check browser console: Browser DevTools > Console tab

---

**Last Updated:** May 28, 2026
**Version:** 1.0.0
**Status:** Production Ready ✅
