# Architecture — Socratic.sg

---

## Overview

Socratic.sg is a Next.js 14 application using the App Router. It has two user-facing panels (student chat, admin) and a set of API routes that handle AI interactions, document processing, and data retrieval. All data lives in Supabase. The app deploys to Vercel.

---

## Component Map

```
socratic-sg/
├── CLAUDE.md                  # Claude Code working rules (read first, always)
├── PRD.md                     # Product requirements (the why)
├── architecture.md            # This file
├── buildplan.md               # Step-by-step build checklist
├── .env.local                 # API keys (never commit this)
├── .gitignore                 # Must include .env.local
│
├── app/
│   ├── layout.tsx             # Root layout, fonts, global styles
│   ├── page.tsx               # Root redirect → /chat if logged in, /login if not
│   │
│   ├── login/
│   │   └── page.tsx           # Login form (email + password)
│   │
│   ├── signup/
│   │   └── page.tsx           # Signup form (email + password)
│   │
│   ├── chat/
│   │   ├── layout.tsx         # Chat layout: sidebar + main area
│   │   ├── page.tsx           # Default chat view (no conversation selected)
│   │   └── [id]/
│   │       └── page.tsx       # Active conversation view
│   │
│   ├── admin/
│   │   ├── layout.tsx         # Admin layout with nav
│   │   ├── page.tsx           # Admin dashboard
│   │   ├── prompt/
│   │   │   └── page.tsx       # System prompt editor
│   │   ├── documents/
│   │   │   └── page.tsx       # Document upload + management
│   │   └── conversations/
│   │       └── page.tsx       # View all student conversations
│   │
│   └── api/
│       ├── chat/
│       │   └── route.ts       # CORE: handles all student messages
│       ├── conversations/
│       │   └── route.ts       # Create / list conversations
│       ├── documents/
│       │   └── route.ts       # Upload, process, list, delete documents
│       └── admin/
│           └── prompt/
│               └── route.ts   # Get / update system prompt
│
├── components/
│   ├── ui/                    # Reusable UI primitives (buttons, inputs, toasts)
│   ├── chat/
│   │   ├── Sidebar.tsx        # Conversation list + new conversation button
│   │   ├── MessageList.tsx    # Renders conversation messages
│   │   ├── MessageBubble.tsx  # Single message with markdown rendering
│   │   └── ChatInput.tsx      # Text input + send button (fixed bottom)
│   └── admin/
│       ├── PromptEditor.tsx   # Textarea + save for system prompt
│       ├── DocumentUpload.tsx # File upload with progress
│       └── DocumentList.tsx   # Table of uploaded documents
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser-side Supabase client
│   │   └── server.ts          # Server-side Supabase client (for API routes)
│   ├── anthropic.ts           # Anthropic client initialisation
│   ├── openai.ts              # OpenAI client (embeddings only)
│   ├── rag.ts                 # RAG pipeline: embed query → search chunks → return context
│   └── chunker.ts             # Text chunking logic for document processing
│
└── middleware.ts              # Route protection: auth check, admin role check
```

---

## Data Flow: Student Sends a Message

```
Student types message
        ↓
ChatInput.tsx calls POST /api/chat
        ↓
/api/chat route:
  1. Verify user is authenticated (Supabase session)
  2. Load active system prompt from DB (system_prompts table)
  3. Generate embedding for user's message (OpenAI API)
  4. Search document_chunks by vector similarity (Supabase pgvector)
  5. Retrieve top 5 most relevant chunks
  6. Load last 20 messages from this conversation (messages table)
  7. Assemble Claude request:
       system = [system prompt] + [retrieved chunks as context]
       messages = [conversation history] + [new user message]
  8. Call Anthropic API with stream: true
  9. Stream response back to browser (ReadableStream)
  10. After stream completes: save assistant message to DB
        ↓
MessageList.tsx receives stream, renders token by token
        ↓
Final message saved to Supabase messages table
```

---

## Data Flow: Admin Uploads a Document

```
Admin selects PDF file in DocumentUpload.tsx
        ↓
POST /api/documents
        ↓
/api/documents route:
  1. Verify user is admin (check profiles.role)
  2. Store raw file in Supabase Storage
  3. Extract text from PDF (pdf-parse library)
  4. Chunk text into ~500-word segments with 50-word overlap
  5. For each chunk:
     a. Call OpenAI text-embedding-3-small to get 1536-dimension vector
     b. Insert into document_chunks table with embedding
  6. Return chunk count and document ID
        ↓
DocumentList.tsx shows new document with chunk count
```

---

## Database Schema

### Table: profiles
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | references auth.users |
| role | text | 'student' or 'admin' |
| created_at | timestamp | |

### Table: system_prompts
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| content | text | the full system prompt text |
| updated_at | timestamp | |
| updated_by | uuid | references auth.users |

### Table: documents
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| title | text | e.g. "SEAB Syllabus 9570" |
| source | text | filename |
| chunk_count | int | populated after processing |
| created_at | timestamp | |

### Table: document_chunks
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| document_id | uuid | references documents |
| content | text | the chunk text (~500 words) |
| embedding | vector(1536) | pgvector — requires extension |
| chunk_index | int | order within document |
| created_at | timestamp | |

### Table: conversations
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| user_id | uuid | references auth.users |
| title | text | auto-generated from first message |
| created_at | timestamp | |
| updated_at | timestamp | updated on each new message |

### Table: messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| conversation_id | uuid | references conversations |
| role | text | 'user' or 'assistant' |
| content | text | message text |
| created_at | timestamp | |

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI APIs
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Key Architectural Decisions

**Why Supabase for everything?**
One service handles auth, database, vector search, and file storage. For an MVP, this eliminates complexity. The free tier is sufficient for single-user scale.

**Why separate the RAG pipeline into lib/rag.ts?**
The retrieval logic (embed → search → format) is used by the chat API route only. Keeping it isolated means we can improve it without touching the API route. Following Becker's principle: segment concerns so Claude Code can work on one floor without touching the others.

**Why OpenAI for embeddings and Claude for chat?**
Claude does not offer an embeddings endpoint. OpenAI's text-embedding-3-small is the cheapest, most accurate option for this use case. Total cost to embed all of Fok's notes: under $0.20.

**Why stream the chat response?**
A 300-word response from Claude takes 4-6 seconds to generate. Streaming means the user sees words appearing immediately rather than staring at a blank screen. This is essential for the tutoring UX.

**Why store the system prompt in the database?**
Allows admin to change AI behaviour through the UI without a code deploy. The system prompt is the product's most important lever — it must be editable at runtime.

---

## Segments (Becker Isolation Principle)

These parts of the codebase are intentionally isolated from each other:

1. **RAG pipeline** (lib/rag.ts + lib/chunker.ts) — changes here don't touch the UI
2. **Admin panel** — completely separate routes, layout, and components from student panel
3. **Auth middleware** — route protection logic lives only in middleware.ts
4. **Document processing** — /api/documents handles everything; no document logic bleeds into /api/chat

When Claude Code works on one segment, it should not need to read files from another segment unless explicitly told to.
