# Smart AI Learnet — Proposal Implementation Guide

## Proposal coverage

The project proposal defines seven intelligent modules:

1. AI Learning Tutor
2. Personalized Recommendation System
3. Smart Quiz Generator
4. Progress Tracking System
5. Weakness Detection Module
6. PDF & Document Explainer
7. Voice Learning Assistant

The current project now contains a working MVP path for all seven modules. The Task Management module remains an additional productivity feature and is connected to the AI planner.

## Module mapping

### 1. AI Learning Tutor
- Existing `/chat` page and chat API.
- Gemini-backed academic explanations.
- English, Bangla and Banglish support in the system prompt.
- Conversation history stored in SQLite.

### 2. Personalized Recommendations
- `/recommendations` page.
- Backend reads tasks, subjects, study logs and quiz history.
- Gemini creates evidence-based recommendations.
- Recommendations are saved to the database.

### 3. Smart Quiz Generator
- `/quiz` page.
- Generate 3–10 questions from a topic.
- Easy/Medium/Hard difficulty.
- Four-option MCQs.
- Instant score and explanations.
- Attempts saved for progress analytics.

### 4. Progress Tracking
- Existing dashboard tracks study time, tasks and subject activity.
- `/analytics` combines study minutes, quiz scores, tasks and subject data.
- Task completion and study logs are persistent.

### 5. Weakness Detection
- `/analytics` shows subjects with lower recorded proficiency.
- Quiz history and subject study activity are available to the analytics backend.
- The system explicitly labels proficiency as an activity-based indicator rather than a formal grade.

### 6. PDF & Document Explainer
- `/documents` page.
- Upload PDF, PNG, JPG, WEBP or TXT files up to 6 MB.
- Gemini receives the document/image and generates an explanation.
- Analysis history is stored for the authenticated student.

### 7. Voice Learning Assistant
- `/voice` page.
- Uses browser SpeechRecognition/Web Speech APIs for speech input.
- Sends the recognized question through the existing AI tutor backend.
- Uses SpeechSynthesis for spoken answers.
- No additional paid voice API is required.

## Task Management integration

The Tasks page adds the productivity layer:
- manual task creation
- AI task planning
- task statistics
- priorities, difficulty and deadlines
- progress tracking
- focus timer
- AI next-task recommendation
- AI daily plan

## Setup

### Backend

```bash
cd backend
npm install
```

Create `.env` from `.env.example` and provide:

```env
PORT=4001
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_real_key
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

Start:

```bash
npm run dev
```

### Frontend

```bash
cd smartlearn-frontend
npm install
npm run dev
```

The Vite proxy already targets `http://localhost:4001`.

## What remains before final university submission

The proposal is broad, so the remaining work is mostly quality and evidence rather than basic module creation:

- Add more realistic seeded subjects and sample learning activity.
- Improve quiz question validation and optionally add true/false or short-answer questions.
- Add richer weakness scoring based on quiz topic-to-subject mapping.
- Add persistent document storage if the final report requires students to reopen original files.
- Add scheduled notifications/reminders if real-time reminder delivery is required.
- Add automated tests for every API module.
- Add screenshots of each proposal module for the report.
- Update the architecture/use-case/ER diagrams if the current diagrams do not show quiz, document, recommendation and analytics entities.
- Perform a complete Windows test with the project's actual `.env` and Gemini key.
