# SmartLearn final check

This version fixes the Admin/Teacher API mismatch, adds Admin and Teacher student analysis, upgrades Profile, and replaces the Tasks stub with a functional task + AI planning page.

Backend default port: 4001
Frontend: 5173

Set GEMINI_API_KEY in backend/.env to enable Gemini features. The backend now starts even when the key is empty; only AI operations require the key.

Demo accounts from the seed script:
- Admin: admin@smartlearning.app / Admin@1234
- Teacher: teacher@smartlearning.app / Teacher@1234
- Student: demo@smartlearning.app / Demo@1234

Run backend:
  cd backend
  npm install
  npm run db:seed
  npm run dev

Run frontend:
  cd smartlearn-frontend
  npm install
  npm run dev
