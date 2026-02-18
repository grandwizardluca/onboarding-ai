# Build Plan — Socratic.sg
**Checklist for Claude Code. Complete phases in order. Do not skip ahead.**

---

## Phase 0: Project Initialisation
- [x] Initialise Next.js 14 project with TypeScript and Tailwind CSS
  - Command: `npx create-next-app@latest . --typescript --tailwind --app` (used `.` for current dir, created in temp subdir and moved due to npm naming restriction)
- [x] Install dependencies:
  - `@supabase/supabase-js @supabase/ssr`
  - `@anthropic-ai/sdk`
  - `openai`
  - `pdf-parse`
  - `react-markdown`
  - `@types/pdf-parse`
- [x] Create `.env.local` with all required environment variable keys (empty values, ready for admin to fill)
- [x] Create `.gitignore` — ensure `.env.local` is listed
- [x] Confirm app runs locally with `npm run dev` and shows default Next.js page

**Stop. Confirm with founder before Phase 1.**

---

## Phase 1: Supabase Setup
- [x] Create Supabase utility files: `lib/supabase/client.ts` and `lib/supabase/server.ts`
- [x] Create database migration SQL (to be run manually in Supabase SQL editor):
  - Enable pgvector extension
  - Create all tables: profiles, system_prompts, documents, document_chunks, conversations, messages
  - Create `match_chunks` vector search function
  - Create trigger: auto-insert into profiles when new auth user signs up
- [x] Output the complete SQL as a single file: `supabase/schema.sql`
- [x] Create `middleware.ts` for route protection:
  - Unauthenticated users → redirect to /login
  - Non-admin users accessing /admin → redirect to /chat
- [x] Seed the system_prompts table with the default system prompt from `SYSTEM_PROMPT.md`

**Stop. Founder runs the SQL in Supabase dashboard. Confirm before Phase 2.**

---

## Phase 2: Authentication
- [x] Build `/login` page — email/password form, calls Supabase signInWithPassword
- [x] Build `/signup` page — email/password form, calls Supabase signUp
- [x] Handle auth redirects (successful login → /chat, successful signup → /chat)
- [x] Show appropriate error messages for wrong password, unconfirmed email, etc.
- [x] Test: sign up creates a user in Supabase Auth AND a row in profiles table
- [x] Test: login works and redirects to /chat
- [x] Test: visiting /admin when logged in as student redirects to /chat

**Stop. Test auth flow manually. Confirm before Phase 3.**

---

## Phase 3: Core Chat Interface (Frontend Only — No AI Yet)
- [x] Build chat layout: sidebar (left, 260px) + main area (right, fills remaining width)
- [x] Sidebar: "New Conversation" button at top, list of conversations below
- [x] Main area: message list (scrollable), chat input fixed at bottom
- [x] MessageBubble component: user messages right-aligned (muted navy), assistant messages left-aligned with gold left border
- [x] Install and configure react-markdown for assistant message rendering
- [x] Wire up: clicking a conversation in sidebar loads its messages from Supabase
- [x] Wire up: "New Conversation" creates a new row in conversations table
- [x] Mobile responsive: sidebar collapses on screens below 768px, accessible via toggle button
- [x] Apply full design system: dark navy background, gold accents, Playfair Display headings, JetBrains Mono for AI responses, DM Sans for UI

**Stop. Confirm UI looks correct before Phase 4.**

---

## Phase 4: RAG Pipeline
- [x] Create `lib/chunker.ts`:
  - Function: takes a string of text, returns array of ~500-word chunks with 50-word overlap
  - Split strategy: split by double newlines (paragraphs), group until ~500 words, carry last paragraph into next chunk
- [x] Create `lib/openai.ts`: initialise OpenAI client, export `generateEmbedding(text: string)` function
- [x] Create `lib/rag.ts`:
  - Export `retrieveContext(query: string)`: generates embedding for query, calls Supabase match_chunks RPC, returns top 5 chunks formatted as a context block
- [x] Create `/api/documents/route.ts`:
  - POST: accept file upload, extract text (pdf-parse for PDFs, direct read for .txt), chunk it, embed each chunk, store in document_chunks
  - GET: return list of all documents with chunk counts
  - DELETE: remove document and all its chunks
- [x] Test: upload a short test text file, verify chunks appear in document_chunks table in Supabase (tested via Phase 6 admin UI)

**Stop. Verify RAG pipeline works end-to-end before Phase 5.**

---

## Phase 5: AI Chat (The Core Feature)
- [x] Create `lib/anthropic.ts`: initialise Anthropic client
- [x] Create `/api/chat/route.ts`:
  - Verify user is authenticated
  - Load active system prompt from system_prompts table
  - Call `retrieveContext(userMessage)` from lib/rag.ts
  - Load last 20 messages from this conversation
  - Assemble and send streaming request to Claude
  - Stream response back to client via ReadableStream
  - After stream completes: save assistant message to messages table
- [x] Create `/api/conversations/route.ts`:
  - POST: create new conversation, return ID
  - GET: list all conversations for current user
- [x] Wire up frontend: ChatInput sends message to /api/chat, streams response into MessageList token by token
- [x] Auto-generate conversation title: after first message, call Claude with a simple prompt asking for a 5-word title, save to conversations table
- [x] Test: send a question about H2 Economics, verify Claude responds using content from uploaded documents

**Stop. This is the most important test. Verify the AI is actually using the uploaded notes. Confirm before Phase 6.**

---

## Phase 6: Admin Panel
- [x] Build `/admin` layout with top navigation: Dashboard / Edit Prompt / Documents / Conversations
- [x] Build `/admin/prompt` page:
  - Load current system prompt from DB
  - Large textarea (min 400px tall), full-width
  - "Save Changes" button → PUT /api/admin/prompt
  - Show last updated timestamp
- [x] Build `/admin/documents` page:
  - File upload dropzone (accept .pdf and .txt)
  - Progress indicator during processing
  - List of uploaded documents with: title, chunk count, upload date, delete button
  - Wire to /api/documents routes
- [x] Build `/admin/conversations` page:
  - Table: student email | conversation title | message count | last active
  - Click row to view full read-only conversation thread
- [x] Create `/api/admin/prompt/route.ts`:
  - GET: return current system prompt
  - PUT: update system prompt (admin only)
- [x] Apply visual distinction for admin: slightly lighter background (#0d1428), thin gold top bar

**Stop. Test all admin functions. Confirm before Phase 7.**

---

## Phase 7: Polish + Deploy
- [x] Add toast notification system (success/error feedback for save, upload, delete actions)
- [x] Add loading states to all buttons and async actions
- [x] Add error boundaries to chat and admin pages
- [x] Verify responsive layout on mobile (iPhone SE viewport)
- [ ] Set all environment variables in Vercel dashboard
- [ ] Deploy to Vercel: `vercel --prod`
- [ ] Test the deployed URL end-to-end: login → chat → ask a question → verify AI responds
- [ ] Test admin panel on deployed URL: upload a document, edit system prompt

**Done. Share URL with founder.**

---

## Documentation Updates (After Every Phase)
After completing each phase, Claude Code must:
1. Check off completed items in this file
2. Update architecture.md if any structural decisions changed
3. Add any new rules to CLAUDE.md if bugs were encountered and fixed
4. Note any deferred items or known issues at the bottom of this file

---

## Known Issues / Deferred Items
*(Claude Code updates this section during the build)*
