# ⚡ Quick Start Guide – 5 Minutes

## For Experienced Developers

### Prerequisites
```bash
node --version          # v18+
pnpm install -g pnpm   # If not installed
```

### Run (3 Steps)

**Step 1: Setup**
```bash
git clone https://github.com/ahshwi1/school-system1.git
cd school-system1
cp .env.example .env
sed -i "s/change_me_in_production/$(openssl rand -base64 32)/" .env
pnpm install && pnpm run generate && pnpm run db:push
```

**Step 2: Start Backend** (Terminal 1)
```bash
pnpm start
# http://localhost:5173/api running
```

**Step 3: Start Frontend** (Terminal 2)
```bash
cd artifacts/school && pnpm run dev
# http://localhost:5173 running
```

### Login
```
Username: admin
Password: admin123
Role: Admin
```

✅ **Done!** System running

---

## Important Files

- `.env` – Configuration (copy from `.env.example`)
- `artifacts/api-server/src/routes/auth.ts` – Authentication
- `artifacts/school/src/lib/api-client.ts` – API client setup
- `artifacts/api-server/src/middlewares/auth.ts` – Auth middleware

---

## Common Issues

| Issue | Solution |
|-------|----------|
| `SESSION_SECRET required` | Generate: `openssl rand -base64 32` and add to .env |
| Port 5173 in use | `lsof -ti:5173 \| xargs kill -9` |
| Module not found | `pnpm install && pnpm run generate` |
| 401 Unauthorized | Clear localStorage: `localStorage.clear()` and login again |
| Database error | `rm dev.db && pnpm run db:push` |

---

## Architecture

```
http://localhost:5173 (Unified Server)
├── Frontend (React/Vite)
│  └── Configured to use /api
└── Backend (Express + Drizzle)
   ├── /api/auth (Login/Register - no auth required)
   ├── /api/healthz (Health check)
   └── /api/* (Protected routes - require Bearer token)
```

---

## API Authentication Flow

1. **Login:** `POST /api/auth/login` → Get token
2. **Store:** Save token in localStorage
3. **Request:** All requests → `Authorization: Bearer <token>`
4. **Validate:** Middleware checks token signature
5. **Access:** Route handler executes with user context

---

## Environment Variables

```dotenv
PORT=5173                                    # Server port
NODE_ENV=development                         # Environment
DATABASE_URL="file:./dev.db"                # Database (SQLite for dev)
SESSION_SECRET="generated-by-openssl"       # Token signing (REQUIRED)
API_BASE_URL="http://localhost:5173/api"    # API endpoint
```

---

## Next Steps

- [ ] Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed setup
- [ ] Explore dashboard at http://localhost:5173
- [ ] Check API docs in code
- [ ] Create users in Admin → Users
- [ ] Add students/teachers/classes

---

**Status:** ✅ Ready to Deploy
