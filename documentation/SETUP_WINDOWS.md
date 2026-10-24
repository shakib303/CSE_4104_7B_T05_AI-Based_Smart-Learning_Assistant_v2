# Windows / Git Bash setup

## 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set a real Gemini key and long random JWT secrets.

```bash
npm run db:seed
npm run dev
```

Expected backend URL:

`http://localhost:4001`

Health check:

`http://localhost:4001/health`

## 2. Frontend

Open another Git Bash terminal:

```bash
cd smartlearn-frontend
npm install
npm run build
npm run dev
```

Expected frontend URL:

`http://localhost:5173`

## 3. GitHub safety

Never commit `.env` or `database/dev.db`.
`.env.example` is safe to commit.
