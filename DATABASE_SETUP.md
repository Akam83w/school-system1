# 📊 Drizzle ORM Database Migration Guide

## ✅ Quick Answer

**Yes, you need database migrations.** Your project uses Drizzle ORM with automatic schema creation. Here's the exact setup:

---

## 1️⃣ **Environment Variables Required**

Add to Render dashboard (Settings → Environment Variables):

```
DATABASE_URL=postgresql://school_db_4mpz_user:xO9dWBIs6an5y6ePE8Zlj7SUJi7rGnqM@dpg-d86ucb67r5hc73cjuh6g-a.virginia-postgres.render.com/school_db_4mpz
```

⚠️ **CRITICAL**: This must be added as a **service variable** (not a secret), with scope set to **"run"** so it's available during both build and runtime.

---

## 2️⃣ **How Database Tables Are Created**

Your project has **2 mechanisms** for schema creation:

### **Mechanism 1: Drizzle Kit Push (Manual - Recommended for first-time setup)**

This creates/updates tables based on schema definitions in `lib/db/src/schema/`:

```bash
# Run ONCE to push schema to database
pnpm --filter @workspace/db run push
```

**Tables created automatically:**
- `admins` - Admin users with JWT auth
- `students` - Student records
- `teachers` - Teacher profiles
- `classes` - Class definitions
- `subjects` - Subject/course data
- `grades` - Student grades & exams
- `attendance` - Attendance records
- `announcements` - School announcements
- `audit_logs` - Action audit trail
- `academic_years` - Academic year management

### **Mechanism 2: Auto-Seeding on Server Startup (Automatic - Always runs)**

File: `artifacts/api-server/src/seed.ts`

**Automatically on every server start:**
1. ✅ Creates `academic_years` table if missing (idempotent)
2. ✅ Seeds default admin user (`admin` / `admin123`)
3. ✅ Seeds 12 Iraqi school classes with teachers
4. ✅ Safe to run multiple times (checks if data exists first)

---

## 3️⃣ **Setup for Render.com Deployment**

### **Step 1: Set Environment Variable**

Go to Render dashboard → Your Web Service → Environment

```
DATABASE_URL = postgresql://school_db_4mpz_user:xO9dWBIs6an5y6ePE8Zlj7SUJi7rGnqM@dpg-d86ucb67r5hc73cjuh6g-a.virginia-postgres.render.com/school_db_4mpz
```

**Check the box:** "Run service variable" (not just during build)

### **Step 2: Update render.yaml**

```yaml
services:
  - type: web
    name: school-system-api
    runtime: node
    region: oregon
    plan: starter
    buildCommand: pnpm install && pnpm run generate && pnpm run build && pnpm --filter @workspace/db run push
    startCommand: cd artifacts/api-server && pnpm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: BASE_PATH
        value: /
      - key: DATABASE_URL
        scope: run
        sync: false
```

**KEY CHANGE:** Added to buildCommand:
```
&& pnpm --filter @workspace/db run push
```

### **Step 3: Deploy**

```bash
git add render.yaml
git commit -m "fix: Add database migration to build command"
git push origin main
```

Render will automatically:
1. ✅ Install dependencies
2. ✅ Generate API client
3. ✅ Build TypeScript
4. ✅ **Push schema to database** ← Creates all tables
5. ✅ Start API server ← Seeding runs on startup

---

## 4️⃣ **Local Development Setup**

### **First Time:**

```bash
# 1. Create .env with your Render database
cat > .env << 'EOF'
PORT=8080
BASE_PATH=/
NODE_ENV=development
DATABASE_URL=postgresql://school_db_4mpz_user:xO9dWBIs6an5y6ePE8Zlj7SUJi7rGnqM@dpg-d86ucb67r5hc73cjuh6g-a.virginia-postgres.render.com/school_db_4mpz
EOF

# 2. Install dependencies
pnpm install

# 3. Push schema to database (ONE TIME ONLY)
pnpm --filter @workspace/db run push

# 4. Start API server (will seed data on first run)
pnpm --filter @workspace/api-server run dev

# 5. Start frontend (in another terminal)
pnpm --filter @workspace/school run dev
```

### **Subsequent Runs:**

```bash
# Just start both servers (no migration needed)
# Terminal 1:
pnpm --filter @workspace/api-server run dev

# Terminal 2:
pnpm --filter @workspace/school run dev
```

---

## 5️⃣ **Drizzle Kit Commands**

```bash
# Push schema changes to database (idempotent - safe to run multiple times)
pnpm --filter @workspace/db run push

# Force push (dangerous - use only if corrupted)
pnpm --filter @workspace/db run push-force

# View schema definition
cat lib/db/src/schema/index.ts
```

---

## 6️⃣ **Complete render.yaml (Ready to Use)**

```yaml
services:
  - type: web
    name: school-system-api
    runtime: node
    region: oregon
    plan: starter
    buildCommand: pnpm install && pnpm run generate && pnpm run build && pnpm --filter @workspace/db run push
    startCommand: cd artifacts/api-server && pnpm run start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: BASE_PATH
        value: /
      - key: DATABASE_URL
        scope: run
        sync: false
```

---

## 7️⃣ **Verification Checklist**

After deployment, verify:

```bash
# 1. Check if tables exist (psql from your local machine)
psql "postgresql://school_db_4mpz_user:xO9dWBIs6an5y6ePE8Zlj7SUJi7rGnqM@dpg-d86ucb67r5hc73cjuh6g-a.virginia-postgres.render.com/school_db_4mpz"

# 2. List all tables
\dt

# 3. Check admin user exists
SELECT * FROM admins;

# 4. Check classes seeded
SELECT * FROM classes LIMIT 5;

# 5. Check academic years
SELECT * FROM academic_years LIMIT 5;
```

---

## 8️⃣ **Your Database Schema (Auto-Created)**

All these tables will be created automatically:

| Table | Purpose | Auto-Seeded? |
|-------|---------|---|
| `admins` | Admin users (username: `admin`, password: `admin123`) | ✅ Yes |
| `academic_years` | Academic years (2020-2099) | ✅ Yes |
| `teachers` | Teacher profiles | ⚠️ Manual insert needed |
| `classes` | 12 Iraqi school classes | ✅ Yes (if teachers exist) |
| `students` | Student records | ⚠️ Manual insert needed |
| `subjects` | Subject/course list | ⚠️ Manual insert needed |
| `grades` | Student grades & exam scores | ⚠️ Manual insert needed |
| `attendance` | Daily attendance records | ⚠️ Manual insert needed |
| `announcements` | School announcements | ⚠️ Manual insert needed |
| `audit_logs` | Audit trail of all changes | ⚠️ Auto-populated on writes |

---

## ⚠️ **Important Notes**

1. **First Run Only**: After deployment, check Render logs to confirm:
   ```
   "Seeded default admin (bcrypt)"
   "Seeded academic years"
   "Seeded Iraqi school classes"
   ```

2. **Default Credentials**:
   - Username: `admin`
   - Password: `admin123`
   - ⚠️ Change immediately in production!

3. **Do NOT run `push` in production frequently** (only once during setup)

4. **If schema changes**: Update files in `lib/db/src/schema/`, then run `pnpm --filter @workspace/db run push`

5. **DATABASE_URL scope**: Must be set to **"run"** (not just "build") so seeding can access database on startup

---

## ❓ **Troubleshooting**

### Error: "DATABASE_URL must be set"

**Fix:** Ensure DATABASE_URL is in Render environment with scope **"run"**

### Error: "connect ECONNREFUSED"

**Fix:** Database URL is incorrect. Test locally:
```bash
psql "your-database-url-here"
```

### Tables not created

**Fix:** Run manually:
```bash
export DATABASE_URL="your-url-here"
pnpm --filter @workspace/db run push
```

### Need to reset database

```bash
# WARNING: This deletes ALL data
psql "your-url" -c "DROP TABLE IF EXISTS audit_logs CASCADE;"
psql "your-url" -c "DROP TABLE IF EXISTS attendance CASCADE;"
psql "your-url" -c "DROP TABLE IF EXISTS grades CASCADE;"
# ... repeat for all tables

# Then redeploy to recreate
```

---

✅ **Summary: You need to update render.yaml with the migration command and set DATABASE_URL in Render environment.**

The tables will be created automatically. No additional manual migration files needed!
