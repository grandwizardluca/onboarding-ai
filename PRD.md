# PRD — Socratic.sg
**Product Requirements Document**
Version 1.0 | H2 Economics MVP

---

## Why This Exists

Existing AI tutoring products for Singapore A-Levels (Tutorly, generic ChatGPT wrappers) fail because they:
- Use outdated or incorrect SEAB syllabus data
- Apply generic macroeconomics frameworks instead of Singapore-specific ones (e.g. teaching interest rate policy instead of MAS NEER exchange rate policy)
- Have no memory of the student across sessions
- Do not teach — they just answer, producing dependent students who can't perform in exams

Socratic.sg exists to fill this gap. It is a 1-on-1 AI tutor that knows the SEAB syllabuses deeply, uses the Socratic method to develop genuine understanding, thinks like a Cambridge A-level marker, and remembers every session the student has had.

The primary user is the builder himself — a private A-level candidate retaking the 2026 GCE A-Levels. Secondary users are other private candidates and school students who want better than what Tutorly offers.

---

## What We Are Building (MVP Scope)

We begin the MVP with just one subject - H2 Economics
A web application with two panels:

### 1. Student Panel (/chat)
A chat interface where a student can have a tutoring conversation about H2 Economics. The AI tutor:
- Draws on the SEAB 9570 syllabus and Anthony Fok's notes to answer accurately
- Uses the Socratic method — guides students to answers through questions rather than just delivering content
- Evaluates student answers like a Cambridge marker (KU / App / Ana / Eval framework)
- Remembers past conversations and references them when relevant
- Streams responses in real time (token by token)

### 2. Admin Panel (/admin)
A private panel for the founder to:
- Edit the AI's system prompt without touching code
- Upload new documents (syllabus PDFs, notes) which get processed into the knowledge base
- View all student conversations

---

## What We Are NOT Building (MVP)

- No payment/subscription system
- No email notifications
- No multiple subjects (H2 Economics only)
- No mobile app
- No analytics dashboard
- No social or collaborative features
- No public signup (students are invited manually for now)

---

## Core Features in Detail

### Feature 1: RAG Knowledge Base
Anthony Fok's notes and the SEAB 9570 syllabus are chunked into ~500-word segments. Each chunk is converted into a mathematical embedding (a fingerprint of meaning) and stored in Supabase with pgvector. When a student asks a question, the system finds the 5 most semantically relevant chunks and feeds them to Claude as context before answering.

**Why this matters:** Without this, the AI gives generic economics answers. With this, it answers specifically in the SEAB framework using the exact content the student is being examined on.

### Feature 2: Persistent Conversation Memory
Every message is saved to Supabase. When a student opens the app, their full conversation history loads. The last 20 messages are passed to Claude with every new question so it has context of the ongoing tutoring relationship.

**Why this matters:** A tutor who forgets every session is useless. Memory allows the AI to say "you got this wrong last week, let's revisit it."

### Feature 3: System Prompt Editor (Admin)
The system prompt — the instruction sheet that defines how Claude behaves — is stored in the database, not hardcoded. The admin can edit it through the UI and changes take effect immediately for all future conversations.

**Why this matters:** Tuning the AI's behaviour is an ongoing process. The admin needs to adjust tone, add rules, fix bad patterns — without a developer.

### Feature 4: Document Upload + Processing (Admin)
Admin uploads a PDF or text file. The system extracts the text, chunks it, generates embeddings via OpenAI, and stores everything in Supabase. From that point, all student conversations draw on this material.

**Why this matters:** When the syllabus updates or new notes become available, the knowledge base must be updatable without touching code.

### Feature 5: Authentication
Two user types: admin and student. Supabase Auth handles login. Admin routes are protected. Students only see the chat panel.

---

## The User Experience (Student Flow)

1. Student lands on socratic.sg, logs in
2. Sees a clean, dark-mode chat interface with their conversation history in a sidebar
3. Starts a new conversation or continues an existing one
4. Types a question or pastes in an essay/answer they want feedback on
5. The AI responds in a Socratic style — probing, questioning, guiding
6. Responses stream in real time, rendered in markdown
7. Conversation is saved automatically

---

## The User Experience (Admin Flow)

1. Admin logs in, lands on /admin dashboard
2. Can navigate to: Edit System Prompt / Manage Documents / View Conversations
3. System Prompt page: large textarea with current prompt, save button, last-updated timestamp
4. Documents page: upload area, processing progress bar, list of uploaded docs with chunk counts
5. Conversations page: table of all student sessions, clickable to read full thread

---

## Success Criteria for MVP

- Admin can upload the SEAB 9570 syllabus PDF and Anthony Fok's notes, and the system correctly retrieves relevant content when a student asks a question
- The AI demonstrably gives Singapore-specific economics answers (references MAS NEER, not interest rates, for monetary policy questions)
- The AI uses the Socratic method — asks questions back rather than immediately delivering answers
- Conversations persist across sessions
- Admin can edit the system prompt and see changed behaviour immediately
- The app is live on a Vercel URL and accessible from a phone

---

## Technical Constraints

- Must be buildable in under one week by a non-technical founder using Claude Code
- Must use Supabase free tier (no cost beyond API usage)
- Must use Vercel free tier
- API costs must be negligible at single-user scale
- No Docker, no complex local setup — must run with `npm run dev`
