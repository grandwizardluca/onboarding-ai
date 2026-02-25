# System Architecture
## AI-Powered SaaS Onboarding Platform

**Version:** 2.0  
**Last Updated:** February 24, 2026  
**Status:** Multi-Tenant Architecture (Forked from Socratic.sg)

---

## SYSTEM OVERVIEW

This is a multi-tenant SaaS platform forked from Socratic.sg with three main interfaces:

1. **Platform Admin Dashboard** - You manage all client organizations
2. **Client Dashboard** - SaaS companies view their onboarding analytics
3. **End-User Interface** - Chat widget + Chrome extension for customers being onboarded

**Tech Stack:**
- Next.js 16 (App Router)
- Supabase (PostgreSQL + pgvector + Auth + Storage)
- No Prisma - Direct Supabase client
- Claude Sonnet 4.5 (Anthropic)
- OpenAI (embeddings only)

---

## HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Admin Dashboard          Client Dashboard      Chat Widget  │
│  (admin.app.com)         (app.app.com)         (embedded)    │
│  ┌──────────────┐        ┌──────────────┐     ┌──────────┐  │
│  │ Create       │        │ View         │     │ AI Chat  │  │
│  │ Clients      │        │ Analytics    │     │ Messages │  │
│  │              │        │              │     │          │  │
│  │ Upload       │        │ Manage       │     │ Step     │  │
│  │ Docs         │        │ Escalations  │     │ Guide    │  │
│  │              │        │              │     │          │  │
│  │ Configure    │        │ API Keys     │     │ Progress │  │
│  │ Steps        │        │              │     │ Tracker  │  │
│  └──────────────┘        └──────────────┘     └──────────┘  │
│         │                        │                   │       │
└─────────┼────────────────────────┼───────────────────┼───────┘
          │                        │                   │
          └────────────────────────┴───────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  API Routes                                                   │
│  ├─ /api/admin/*        (Admin operations)                   │
│  ├─ /api/client/*       (Client dashboard)                   │
│  ├─ /api/chat/*         (Chat widget API)                    │
│  └─ /api/webhooks/*     (External integrations)              │
│                                                               │
│  Services                                                     │
│  ├─ DocumentProcessor   (Parse PDFs, chunk text)             │
│  ├─ EmbeddingService    (Generate vectors)                   │
│  ├─ RAGService          (Search documents)                   │
│  ├─ AIService           (Claude API integration)             │
│  └─ AnalyticsService    (Track metrics)                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
          │                        │                   │
          ▼                        ▼                   ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐
│   PostgreSQL    │    │    Pinecone     │    │   Claude    │
│   (Supabase)    │    │  Vector Store   │    │     API     │
├─────────────────┤    ├─────────────────┤    ├─────────────┤
│ • clients       │    │ • Document      │    │ • Sonnet    │
│ • documents     │    │   embeddings    │    │   4.5       │
│ • sessions      │    │ • Semantic      │    │             │
│ • messages      │    │   search        │    │ • Context   │
│ • users         │    │                 │    │   window    │
│ • analytics     │    │ • Filtered by   │    │             │
│                 │    │   client_id     │    │ • Streaming │
└─────────────────┘    └─────────────────┘    └─────────────┘
```

---

## DATABASE SCHEMA

### Core Tables

```sql
-- Clients table (SaaS companies who are our customers)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-safe: "marketing-tool"
  email VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL, -- 'free_pilot', 'starter', 'growth', 'enterprise'
  api_key VARCHAR(100) UNIQUE NOT NULL, -- For widget authentication
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'churned'
  onboarding_steps JSONB, -- Array of steps they defined
  branding JSONB, -- Colors, logo, company name
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (people who access dashboards)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'admin', 'client'
  client_id UUID REFERENCES clients(id), -- NULL for admins
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents table (help articles, PDFs, guides)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  source_url VARCHAR(500), -- Original URL if scraped
  content TEXT NOT NULL, -- Full text content
  content_type VARCHAR(50), -- 'pdf', 'markdown', 'html', 'text'
  file_path VARCHAR(500), -- If uploaded file
  processed BOOLEAN DEFAULT FALSE,
  chunk_count INTEGER DEFAULT 0, -- Number of chunks created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks (for RAG retrieval)
CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, -- Position in document
  content TEXT NOT NULL, -- ~500 words
  vector_id VARCHAR(100), -- Pinecone vector ID
  embedding_model VARCHAR(100), -- 'text-embedding-3-small', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding sessions (end users being onboarded)
CREATE TABLE onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  end_user_id VARCHAR(255), -- Email or ID from client's system
  end_user_email VARCHAR(255),
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER,
  status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned', 'escalated'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB -- Custom data from client
);

-- Chat messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  tokens_used INTEGER, -- For cost tracking
  response_time_ms INTEGER, -- For performance monitoring
  confidence_score FLOAT, -- AI confidence (0-1)
  escalated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics events
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'step_started', 'step_completed', 'escalation', 'error'
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_documents_client_id ON documents(client_id);
CREATE INDEX idx_chunks_client_id ON document_chunks(client_id);
CREATE INDEX idx_sessions_client_id ON onboarding_sessions(client_id);
CREATE INDEX idx_sessions_status ON onboarding_sessions(status);
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_analytics_client_id ON analytics_events(client_id);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);
```

---

## DATA FLOW

### Flow 1: Uploading Documents (Admin → RAG)

```
1. Admin uploads PDF in dashboard
   ↓
2. Next.js API receives file
   POST /api/admin/documents/upload
   ↓
3. Save file to storage (Supabase Storage or Vercel Blob)
   ↓
4. Create document record in PostgreSQL
   INSERT INTO documents (client_id, title, file_path, ...)
   ↓
5. Background job: Process document
   - Extract text from PDF (pdf-parse library)
   - Split into chunks (~500 words each)
   - For each chunk:
     a. Create chunk record in PostgreSQL
     b. Generate embedding (OpenAI or Claude API)
     c. Store vector in Pinecone with metadata:
        {
          id: chunk_id,
          values: [0.123, 0.456, ...], // 1536-dim vector
          metadata: {
            client_id: 'abc123',
            document_id: 'doc456',
            chunk_index: 0,
            content: 'This is the chunk text...'
          }
        }
   ↓
6. Update document.processed = true
   ↓
7. Admin sees "✓ Processed 25 chunks"
```

### Flow 2: End User Asks Question (Chat → AI)

```
1. User types in chat widget: "How do I connect Facebook Ads?"
   ↓
2. Widget sends to API
   POST /api/chat/message
   Body: {
     session_id: 'session123',
     client_id: 'client456',
     message: 'How do I connect Facebook Ads?'
   }
   ↓
3. Backend processes:
   a. Validate API key (check client exists)
   b. Get session context (current step, history)
   c. RAG retrieval:
      - Generate query embedding
      - Search Pinecone:
        query: {
          vector: [0.123, 0.456, ...],
          filter: { client_id: 'client456' }, // Only this client's docs!
          topK: 5
        }
      - Get top 5 relevant chunks
   d. Build prompt for Claude:
      System: "You are an onboarding assistant for [ClientName].
               User is on Step 3: Connect Facebook Ads.
               Here are relevant docs: [chunks]
               Answer their question."
      User: "How do I connect Facebook Ads?"
   e. Call Claude API
   f. Get response + confidence score
   g. If confidence < 0.8 → Flag for escalation
   ↓
4. Save message to database
   INSERT INTO messages (session_id, role, content, confidence_score, ...)
   ↓
5. Return response to widget
   Response: {
     message: "To connect Facebook Ads, go to Settings > Integrations...",
     confidence: 0.92,
     should_escalate: false
   }
   ↓
6. Widget displays AI response
```

### Flow 3: Analytics Tracking

```
1. User completes Step 3
   ↓
2. Widget fires event
   POST /api/analytics/event
   Body: {
     client_id: 'client456',
     session_id: 'session123',
     event_type: 'step_completed',
     event_data: { step: 3, duration_seconds: 182 }
   }
   ↓
3. Backend saves to analytics_events table
   ↓
4. Real-time aggregation (for dashboard):
   - Update onboarding_sessions.current_step = 4
   - Update onboarding_sessions.last_activity_at = NOW()
   ↓
5. Client dashboard shows:
   "User xyz@email.com completed Step 3 (3 mins ago)"
```

---

## API ENDPOINTS

### Admin API (We use these)

```typescript
// Client management
POST   /api/admin/clients              // Create new client workspace
GET    /api/admin/clients              // List all clients
GET    /api/admin/clients/:id          // Get client details
PATCH  /api/admin/clients/:id          // Update client config
DELETE /api/admin/clients/:id          // Delete client

// Document management
POST   /api/admin/documents/upload     // Upload PDF/file
POST   /api/admin/documents/url        // Process URL
GET    /api/admin/documents/:clientId  // List client's docs
DELETE /api/admin/documents/:id        // Delete doc
POST   /api/admin/documents/:id/process // Re-process doc

// Analytics
GET    /api/admin/analytics/overview   // All clients overview
GET    /api/admin/analytics/:clientId  // Specific client stats
```

### Client API (SaaS companies use these)

```typescript
// Dashboard access
GET    /api/client/dashboard           // Their analytics
GET    /api/client/sessions            // Active onboarding sessions
GET    /api/client/sessions/:id        // Session details + chat transcript

// Configuration
GET    /api/client/config              // Get current config
PATCH  /api/client/config              // Update branding, steps

// Escalations
GET    /api/client/escalations         // Sessions needing help
POST   /api/client/escalations/:id/resolve // Mark as resolved
```

### Chat API (End users use these)

```typescript
// Session management
POST   /api/chat/session/start         // Create new session
GET    /api/chat/session/:id           // Get session state

// Messaging
POST   /api/chat/message               // Send user message
GET    /api/chat/messages/:sessionId   // Get chat history

// Progress tracking
POST   /api/chat/step/complete         // Mark step as done
POST   /api/chat/escalate              // Request human help
```

### Webhook API (External integrations)

```typescript
POST   /api/webhooks/stripe            // Billing events
POST   /api/webhooks/slack             // Send escalations to Slack
```

---

## CORE SERVICES

### 1. DocumentProcessor Service

```typescript
// /lib/services/document-processor.ts

class DocumentProcessor {
  async processDocument(documentId: string): Promise<void> {
    const doc = await db.documents.findUnique({ where: { id: documentId } });
    
    // Extract text based on type
    let text: string;
    if (doc.content_type === 'pdf') {
      text = await this.extractPDF(doc.file_path);
    } else if (doc.content_type === 'url') {
      text = await this.scrapeURL(doc.source_url);
    } else {
      text = doc.content;
    }
    
    // Chunk the text
    const chunks = this.chunkText(text, 500); // 500 words per chunk
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      await this.processChunk(documentId, i, chunks[i]);
    }
    
    // Mark as processed
    await db.documents.update({
      where: { id: documentId },
      data: { processed: true, chunk_count: chunks.length }
    });
  }
  
  private chunkText(text: string, wordsPerChunk: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
    }
    
    return chunks;
  }
  
  private async processChunk(docId: string, index: number, text: string) {
    // Create chunk record
    const chunk = await db.documentChunks.create({
      data: {
        document_id: docId,
        client_id: doc.client_id,
        chunk_index: index,
        content: text
      }
    });
    
    // Generate embedding
    const embedding = await embeddingService.embed(text);
    
    // Store in Pinecone
    await pinecone.index('onboarding-docs').upsert([{
      id: chunk.id,
      values: embedding,
      metadata: {
        client_id: doc.client_id,
        document_id: docId,
        chunk_index: index,
        content: text
      }
    }]);
    
    // Update chunk with vector ID
    await db.documentChunks.update({
      where: { id: chunk.id },
      data: { vector_id: chunk.id }
    });
  }
}
```

### 2. RAG Service

```typescript
// /lib/services/rag.ts

class RAGService {
  async search(query: string, clientId: string, topK: number = 5) {
    // Generate query embedding
    const queryEmbedding = await embeddingService.embed(query);
    
    // Search Pinecone (filtered by client_id)
    const results = await pinecone.index('onboarding-docs').query({
      vector: queryEmbedding,
      filter: { client_id: clientId },
      topK: topK,
      includeMetadata: true
    });
    
    // Return chunks with scores
    return results.matches.map(match => ({
      content: match.metadata.content,
      score: match.score,
      document_id: match.metadata.document_id,
      chunk_index: match.metadata.chunk_index
    }));
  }
}
```

### 3. AI Service

```typescript
// /lib/services/ai.ts

class AIService {
  async chat(
    sessionId: string,
    userMessage: string,
    context: {
      clientName: string;
      currentStep: number;
      relevantDocs: string[];
    }
  ) {
    // Build prompt
    const systemPrompt = `You are an onboarding assistant for ${context.clientName}.
The user is currently on Step ${context.currentStep}.

Here are relevant documentation chunks:
${context.relevantDocs.join('\n\n')}

Guidelines:
- Be concise and helpful
- Provide step-by-step instructions
- If you don't know, say so (don't make up answers)
- Include confidence score in your thinking`;

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    });
    
    // Extract confidence (simple heuristic for MVP)
    const confidence = this.estimateConfidence(response);
    
    return {
      message: response.content[0].text,
      confidence: confidence,
      should_escalate: confidence < 0.8,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    };
  }
  
  private estimateConfidence(response: any): number {
    const text = response.content[0].text.toLowerCase();
    
    // High confidence indicators
    if (text.includes('here are the steps') || 
        text.includes('to do this')) {
      return 0.9;
    }
    
    // Low confidence indicators
    if (text.includes("i'm not sure") || 
        text.includes("i don't have information") ||
        text.includes("you should contact support")) {
      return 0.3;
    }
    
    // Default
    return 0.75;
  }
}
```

---

## CHROME EXTENSION ARCHITECTURE

### Manifest V3 Structure

```
chrome-extension/
├── manifest.json
├── background/
│   └── service-worker.ts       // Background tasks, API calls
├── content/
│   └── content-script.ts       // Injected into client's pages
├── popup/
│   ├── popup.html
│   ├── popup.tsx               // Extension popup UI
│   └── components/
│       ├── StepChecklist.tsx
│       └── ErrorDisplay.tsx
└── options/
    ├── options.html
    └── options.tsx             // Settings page
```

### manifest.json

```json
{
  "manifest_version": 3,
  "name": "SaaS Onboarding Assistant",
  "version": "1.0.0",
  "description": "AI-powered onboarding guidance",
  "permissions": [
    "storage",
    "activeTab",
    "tabs"
  ],
  "host_permissions": [
    "https://*/",
    "http://*/"
  ],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "options_page": "options/options.html"
}
```

### Communication Flow

```
User clicks extension icon
    ↓
popup.tsx renders
    ↓
Checks chrome.storage for API key
    ↓
If no API key → Show setup screen
If API key exists → Show checklist
    ↓
User completes step
    ↓
content-script.ts detects completion (DOM changes, URL changes)
    ↓
Sends message to service-worker.ts
    ↓
service-worker.ts calls our API
    POST /api/chat/step/complete
    ↓
Updates chrome.storage (step progress)
    ↓
Popup updates UI
```

---

## CHAT WIDGET ARCHITECTURE

### Embed Code (What clients paste)

```html
<!-- Client pastes this on their site -->
<script>
  window.OnboardingAI = {
    clientId: 'marketing_tool_123',
    userId: 'user_456', // From their system
    apiKey: 'sk_live_abc123'
  };
</script>
<script src="https://widget.yourdomain.com/v1/widget.js"></script>
```

### Widget Implementation

```typescript
// widget.js (loaded on client's site)

(function() {
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = `https://widget.yourdomain.com/chat?clientId=${config.clientId}&userId=${config.userId}`;
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 999999;
  `;
  
  // Insert into page
  document.body.appendChild(iframe);
  
  // Listen for messages from iframe
  window.addEventListener('message', (event) => {
    if (event.data.type === 'resize') {
      iframe.style.height = event.data.height + 'px';
    }
  });
})();
```

### Chat UI (Inside iframe)

```typescript
// /app/chat/page.tsx (Next.js page rendered in iframe)

export default function ChatWidget() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const { clientId, userId } = useSearchParams();
  
  async function sendMessage() {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        user_id: userId,
        message: input
      })
    });
    
    const data = await response.json();
    setMessages([...messages, 
      { role: 'user', content: input },
      { role: 'assistant', content: data.message }
    ]);
  }
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <Message key={i} role={msg.role} content={msg.content} />
        ))}
      </div>
      <div className="p-4 border-t">
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
      </div>
    </div>
  );
}
```

---

## DEPLOYMENT ARCHITECTURE

### Vercel Setup

```
Next.js App → Vercel
├── Edge Functions (API routes)
├── Static Assets (CDN)
└── Serverless Functions (heavy processing)

Environment Variables:
- DATABASE_URL (Supabase)
- PINECONE_API_KEY
- PINECONE_ENVIRONMENT
- ANTHROPIC_API_KEY
- OPENAI_API_KEY (for embeddings)
- STRIPE_SECRET_KEY (billing)
```

### Database (Supabase)

```
PostgreSQL Database
├── Row Level Security (RLS) enabled
├── Real-time subscriptions (for live analytics)
└── Storage (for uploaded files)
```

### Vector Store (Pinecone)

```
Index: 'onboarding-docs'
├── Dimension: 1536 (text-embedding-3-small)
├── Metric: cosine
├── Pod Type: p1.x1 (Starter: free)
└── Namespaces: One per client (optional, or use metadata filter)
```

---

## MONITORING & OBSERVABILITY

### Logging

```typescript
// Structured logging with Pino
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
});

// Usage
logger.info({ 
  event: 'document_processed', 
  client_id: 'abc123', 
  document_id: 'doc456', 
  chunks: 25 
});
```

### Error Tracking

```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Catch errors
try {
  await processDocument(id);
} catch (error) {
  Sentry.captureException(error, {
    tags: { service: 'document-processor' },
    extra: { document_id: id }
  });
}
```

### Performance Monitoring

```typescript
// Simple timing wrapper
async function withTiming<T>(
  name: string, 
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    const duration = Date.now() - start;
    logger.info({ metric: name, duration_ms: duration });
  }
}

// Usage
const response = await withTiming('ai_response', async () => {
  return await aiService.chat(sessionId, message, context);
});
```

---

## SECURITY CONSIDERATIONS

### Authentication Flow

```
Client Dashboard Login:
1. Email + password → Next Auth
2. Check users table, verify password hash
3. Generate JWT session token
4. Store in secure httpOnly cookie

Chat Widget Authentication:
1. Widget includes clientId + apiKey
2. API validates: SELECT * FROM clients WHERE api_key = ?
3. If valid → Allow access to client's data
4. All queries filtered by client_id (prevent data leakage)
```

### Data Isolation

```sql
-- CRITICAL: Every query MUST include client_id filter
-- Good ✓
SELECT * FROM documents WHERE client_id = 'abc123';

-- Bad ✗ (could leak data)
SELECT * FROM documents WHERE title LIKE '%setup%';

-- Use RLS policies (Supabase)
CREATE POLICY client_isolation ON documents
  USING (client_id = current_setting('app.current_client_id'));
```

### API Key Rotation

```typescript
// Allow clients to rotate API keys
async function rotateAPIKey(clientId: string) {
  const newKey = `sk_live_${generateRandomString(32)}`;
  
  await db.clients.update({
    where: { id: clientId },
    data: { 
      api_key: newKey,
      api_key_rotated_at: new Date()
    }
  });
  
  // Notify client (email)
  await sendEmail({
    to: client.email,
    subject: 'API Key Rotated',
    body: `Your new API key is: ${newKey}`
  });
  
  return newKey;
}
```

---

## SCALABILITY NOTES

### Current Limits (MVP)

- 100 concurrent sessions ✓
- 10,000 total documents ✓
- 100 client workspaces ✓

### When to Scale (Future)

**Database:**
- >100k documents → Consider sharding by client_id
- >1M messages/day → Add read replicas

**Vector Store:**
- >100 clients → Use Pinecone namespaces
- >1M vectors → Upgrade to p2 pods

**API:**
- >1000 req/min → Add rate limiting
- >100k active users → Consider CDN for widget

---

## FOLDER STRUCTURE

```
onboarding-ai/
├── app/                        # Next.js 14 App Router
│   ├── (admin)/               # Admin routes
│   │   ├── dashboard/
│   │   ├── clients/
│   │   └── analytics/
│   ├── (client)/              # Client routes
│   │   └── dashboard/
│   ├── chat/                  # Chat widget (iframe)
│   │   └── page.tsx
│   └── api/                   # API routes
│       ├── admin/
│       ├── client/
│       └── chat/
├── lib/                       # Shared code
│   ├── services/             # Business logic
│   │   ├── document-processor.ts
│   │   ├── embedding.ts
│   │   ├── rag.ts
│   │   └── ai.ts
│   ├── db/                   # Database
│   │   ├── prisma/
│   │   └── migrations/
│   └── utils/                # Helpers
├── components/               # React components
│   ├── admin/
│   ├── client/
│   └── chat/
├── chrome-extension/         # Extension code
│   ├── manifest.json
│   ├── background/
│   ├── content/
│   └── popup/
├── public/                   # Static assets
├── docs/                     # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md      # This file
│   ├── BUILD_PLAN.md
│   └── CLAUDE.md
└── tests/                    # Tests (Phase 2)
```

---

## NEXT STEPS

1. Set up Next.js project
2. Configure Supabase database
3. Create Pinecone index
4. Build admin dashboard (create clients)
5. Build document processor
6. Build chat widget
7. Build Chrome extension
8. Deploy to Vercel
9. Test end-to-end

See BUILD_PLAN.md for detailed week-by-week tasks.
