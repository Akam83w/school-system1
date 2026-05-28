# 📖 Complete Run Guide – School Management System

## 🎯 Target: Fresh Kali Linux Installation

This guide gets the entire system running from zero on a fresh Kali Linux machine.

---

## Part 1: System Dependencies (First Time Only)

### Step 1.1: Update System

```bash
# Update package lists
sudo apt update

# Upgrade packages
sudo apt upgrade -y

# Expected time: 2-5 minutes
```

### Step 1.2: Install Node.js

```bash
# Download Node.js repository setup
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version    # Should show v18.x.x or higher
npm --version     # Should show version
```

### Step 1.3: Install pnpm (Package Manager)

```bash
# Install pnpm globally
npm install -g pnpm

# Verify
pnpm --version    # Should show version
```

### Step 1.4: Install OpenSSL (for secret generation)

```bash
# Usually pre-installed on Kali, but verify
openssl version

# If not installed:
sudo apt install -y openssl
```

✅ **All system dependencies installed**

---

## Part 2: Project Setup (One Time)

### Step 2.1: Clone Repository

```bash
# Choose a directory (example: home directory)
cd ~

# Clone the project
git clone https://github.com/ahshwi1/school-system1.git

# Navigate into project
cd school-system1

# Verify you're in the right place
pwd  # Should end with: .../school-system1
ls   # Should show: package.json, .env.example, artifacts, etc.
```

### Step 2.2: Create Environment File

```bash
# Copy example to create actual .env
cp .env.example .env

# Verify .env was created
cat .env  # Should show configuration
```

### Step 2.3: Generate SESSION_SECRET

```bash
# Generate a cryptographically secure random secret
openssl rand -base64 32

# Example output:
# mK9pL2nO5qR8sT1uV4wX7yZ0aB3cD6eF9gH2iJ5kL8mN
# (your output will be different)

# Copy this output and use it below
```

### Step 2.4: Update .env with Your Values

```bash
# Edit .env file with your favorite editor
nano .env
# Or: vim .env
# Or: code .env (if VS Code installed)

# Make these changes:
# 1. Replace SESSION_SECRET value with the generated secret from Step 2.3
# 2. Keep DATABASE_URL as: file:./dev.db (for local development)
# 3. Keep PORT as: 5173
# 4. Keep NODE_ENV as: development

# Save and exit (Ctrl+X for nano, :wq for vim)
```

### Step 2.5: Verify .env Configuration

```bash
# Check that .env has the correct values
grep -E "SESSION_SECRET|DATABASE_URL|PORT|NODE_ENV" .env

# Should output something like:
# SESSION_SECRET="mK9pL2nO5qR8sT1uV4wX7yZ0aB3cD6eF9gH2iJ5kL8mN"
# DATABASE_URL="file:./dev.db"
# PORT=5173
# NODE_ENV=development

# If SESSION_SECRET is still the default, update it!
```

### Step 2.6: Install Project Dependencies

```bash
# Install all dependencies (this is a monorepo with multiple packages)
pnpm install

# Expected output:
#   Lockfile is up to date
#   Installing dependencies...
#   └─ (lots of packages being installed)
#   ✓ Packages installed

# Expected time: 3-10 minutes (depends on internet speed)
# This will install:
# - Backend dependencies (Express, Drizzle, bcryptjs, etc.)
# - Frontend dependencies (React, Vite, Tailwind, etc.)
# - Shared utilities
```

### Step 2.7: Generate API Client Code

```bash
# Generate TypeScript API client from schema
pnpm run generate

# Expected output:
#   ✓ API spec generated
#   ✓ API client generated
#   ✓ Type definitions created
```

### Step 2.8: Type Check

```bash
# Verify all TypeScript compiles without errors
pnpm run typecheck

# Expected output:
#   ✓ Type check passed
#   ✓ All files compile successfully
```

### Step 2.9: Initialize Database

```bash
# Create database schema and seed default data
pnpm run db:push

# Expected output:
#   ✓ Database migration completed
#   ✓ Schema created
#   ✓ dev.db created (in project root)

# Verify database file was created
ls -lh dev.db  # Should show file with size > 0
```

✅ **Project setup complete. Database initialized with default data.**

---

## Part 3: Running the System (Every Time)

### Step 3.1: Start Backend Server (Terminal 1)

```bash
# Make sure you're in the project root
cd ~/school-system1

# Start the backend API server
pnpm start

# Expected output:
# ┌──────────────────────────────────────────────────┐
# │ ✓ Environment validation passed                  │
# │ ✓ Database initialization complete               │
# │ ✓ Seeded default admin (username: admin)         │
# │ ✓ Seeded academic years (2020-2099)              │
# │ ✓ School System API Server listening on port 5173│
# └──────────────────────────────────────────────────┘

# DO NOT CLOSE THIS TERMINAL - server must keep running
# Server is now listening at:
# - http://localhost:5173 (unified server)
# - http://localhost:5173/api (API endpoint)
```

### Step 3.2: Start Frontend Server (Terminal 2 - NEW TERMINAL)

```bash
# Open a NEW terminal window/tab
# Do NOT close Terminal 1 from Step 3.1

# Navigate to frontend directory
cd ~/school-system1/artifacts/school

# Start frontend development server
pnpm run dev

# Expected output:
# ✓ API Client Initialized with base URL: /api
# ✓ Frontend running at http://localhost:5173
# ✓ Ready for development

# DO NOT CLOSE THIS TERMINAL - server must keep running
```

### Step 3.3: Open Browser and Login

```bash
# Open web browser and navigate to:
# http://localhost:5173

# You should see:
# - Login page (in Arabic)
# - School Management System title
# - Username, Password, and Role fields

# Login with default credentials:
# Username: admin
# Password: admin123
# Role: Admin (dropdown)

# Click Login button

# Expected behavior:
# 1. Loading spinner appears
# 2. Frontend sends POST to /api/auth/login
# 3. Backend validates credentials
# 4. Backend returns JWT token
# 5. Token stored in localStorage
# 6. Frontend configured to use /api as base URL
# 7. Redirect to dashboard
# 8. See admin dashboard with menu options
```

✅ **System is now running and authenticated!**

---

## Part 4: Verify Everything Works

### Test 4.1: API Health Check

```bash
# Open new terminal (Terminal 3)

# Check backend is responding
curl -s http://localhost:5173/api/healthz

# Expected response:
# {"status":"ok"}
```

### Test 4.2: Login API

```bash
# Test login endpoint
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin",
    "password": "admin123"
  }'

# Expected response:
# {
#   "token": "eyJhZG1pbklkIjoxLCJ0cyI6...",
#   "admin": {
#     "id": 1,
#     "username": "admin",
#     "name": "مدير المدرسة",
#     "role": "admin"
#   }
# }

# Copy the token value for next test
```

### Test 4.3: Protected Route

```bash
# Replace TOKEN with actual token from Test 4.2
TOKEN="<paste-token-here>"

# Access protected endpoint
curl http://localhost:5173/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -s | head -20

# Expected response:
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

### Test 4.4: Browser Console

```javascript
// Open browser Developer Tools (F12 or Ctrl+Shift+I)
// Go to Console tab
// Type:

localStorage.getItem('school_token')
// Should return: token string (something like eyJhZG1pbklkIjox...)

// Type:
console.log('[API Client] Initialized')
// Should show in console
```

✅ **All tests passed! System is working correctly.**

---

## Part 5: Stopping the System

### To Stop

```bash
# Terminal 1 (Backend) - Press Ctrl+C
# Terminal 2 (Frontend) - Press Ctrl+C

# Both servers will shut down gracefully
```

### To Restart

```bash
# Just repeat Part 3 (Steps 3.1-3.3)
# No need to reinstall or reconfigure
```

---

## Part 6: Troubleshooting

### Problem: "SESSION_SECRET environment variable is required"

**Cause:** .env file not configured properly

**Solution:**
```bash
# Check .env file
cat .env | grep SESSION_SECRET

# If it says "change_me_in_production", regenerate:
openssl rand -base64 32
# Then edit .env and update the value

# Restart backend (Terminal 1: Ctrl+C, then pnpm start)
```

### Problem: "EADDRINUSE: address already in use :::5173"

**Cause:** Another process is using port 5173

**Solution:**
```bash
# Find and kill the process
lsof -ti:5173 | xargs kill -9

# Or use a different port:
PORT=3000 pnpm start
# Then access at http://localhost:3000
```

### Problem: "Cannot find module '@workspace/db'"

**Cause:** Dependencies not installed or generated

**Solution:**
```bash
# Reinstall everything
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run generate
pnpm run db:push

# Then restart
```

### Problem: "401 Unauthorized" when accessing protected routes

**Cause:** Token not being sent or invalid

**Solution:**
```javascript
// In browser console:
localStorage.clear()  // Clear all data
// Refresh page, login again
```

### Problem: "Database connection failed"

**Cause:** Database file corrupted or missing

**Solution:**
```bash
# Reset database
rm -f dev.db
pnpm run db:push

# Restart backend
```

### Problem: Frontend not showing, blank page

**Cause:** Frontend server not running or network issue

**Solution:**
```bash
# Check Terminal 2 is running (Step 3.2)
# Open browser console (F12)
# Check for errors

# Make sure both terminals are running:
# Terminal 1: Backend (pnpm start)
# Terminal 2: Frontend (pnpm run dev in artifacts/school)
```

---

## Summary: Quick Reference

### One-Time Setup (on fresh Kali)
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g pnpm
cd ~
git clone https://github.com/ahshwi1/school-system1.git
cd school-system1
cp .env.example .env
openssl rand -base64 32  # Generate secret and update .env
pnpm install
pnpm run generate
pnpm run db:push
```

### Every Time You Want to Run
```bash
# Terminal 1:
cd ~/school-system1
pnpm start

# Terminal 2 (new terminal):
cd ~/school-system1/artifacts/school
pnpm run dev

# Browser:
http://localhost:5173
Login: admin / admin123 / Admin
```

---

## Default Credentials

| Field | Value |
|-------|-------|
| **Username** | `admin` |
| **Password** | `admin123` |
| **Role** | `Admin` |
| **Access** | http://localhost:5173 |

---

## System URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Frontend** | http://localhost:5173 | Main web interface |
| **API** | http://localhost:5173/api | Backend REST API |
| **Health Check** | http://localhost:5173/api/healthz | System status |
| **Login** | http://localhost:5173/api/auth/login | Authentication endpoint |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│           Unified Deployment (localhost:5173)           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────┐                         │
│  │    Frontend (React)       │                         │
│  │  - Dashboard              │                         │
│  │  - Students               │                         │
│  │  - Teachers               │                         │
│  │  - Classes                │                         │
│  │  - Grades/Attendance      │                         │
│  │                           │                         │
│  │ Uses API base: /api       │                         │
│  └───────────────┬───────────┘                         │
│                  │                                      │
│         Requests with Bearer Token                      │
│                  │                                      │
│  ┌───────────────▼───────────────────────────────────┐ │
│  │     Backend API (Express + Drizzle)             │ │
│  │                                                 │ │
│  │  Routes:                                        │ │
│  │  ├─ /auth/login (public)                       │ │
│  │  ├─ /auth/register (public)                    │ │
│  │  ├─ /healthz (public)                          │ │
│  │  ├─ /users/* (protected)                       │ │
│  │  ├─ /students/* (protected)                    │ │
│  │  ├─ /teachers/* (protected)                    │ │
│  │  ├─ /classes/* (protected)                     │ │
│  │  ├─ /grades/* (protected)                      │ │
│  │  ├─ /attendance/* (protected)                  │ │
│  │  └─ ...                                        │ │
│  │                                                 │ │
│  │  Global Middleware:                             │ │
│  │  ├─ Validate JWT token                          │ │
│  │  ├─ Load user from database                     │ │
│  │  ├─ Attach user to request                      │ │
│  │  └─ Return 401 if invalid                       │ │
│  │                                                 │ │
│  └───────────────┬───────────────────────────────┘ │
│                  │                                  │
│      Database Operations                            │
│                  │                                  │
│  ┌───────────────▼─────────────┐                   │
│  │    Database (dev.db)        │                   │
│  │  - Admins                   │                   │
│  │  - Users                    │                   │
│  │  - Students                 │                   │
│  │  - Teachers                 │                   │
│  │  - Classes                  │                   │
│  │  - Academic Years           │                   │
│  │  - Grades                   │                   │
│  │  - Attendance               │                   │
│  │  - Audit Logs               │                   │
│  │  - Announcements            │                   │
│  └─────────────────────────────┘                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ System is running
2. 📚 Read the [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed documentation
3. 👥 Create users through Admin → Users
4. 👨‍🎓 Add students and teachers
5. 📚 Create classes
6. 📊 Manage grades and attendance

---

**Status:** ✅ Ready for Production
**Created:** May 28, 2026
**Version:** 1.0.0
