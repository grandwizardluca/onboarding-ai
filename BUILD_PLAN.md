# Build Plan
## AI-Powered SaaS Onboarding Platform - MVP

**Timeline:** 4 weeks  
**Goal:** Functional MVP with 5 free pilots  
**Developer:** Solo founder + Claude Code

---

## OVERVIEW

This plan follows Alex Becker's "Vibe Coding" methodology:
1. **Plan in Claude.ai first** (Artifacts, thinking)
2. **Build in Claude Code** (actual implementation)
3. **Segregate components** (build outside core, low risk)
4. **Iterate quickly** (ship fast, fix later)

**Critical Path:** Week 1 (Foundation) → Week 2 (AI) → Week 3 (Outreach) → Week 4 (Pilots)

---

## PRE-WORK (Before Week 1)

### Setup Checklist

- [ ] Subscribe to Claude Pro ($25/month)
- [ ] Install Claude Code: `curl -fsSL https://claude.ai/install.sh | bash`
- [ ] Create GitHub repo: `onboarding-ai`
- [ ] Sign up for services:
  - [ ] Vercel account (free)
  - [ ] Supabase account (free tier)
  - [ ] Pinecone account (free tier)
  - [ ] Anthropic API key (Claude)
  - [ ] OpenAI API key (embeddings)
- [ ] Install VS Code (optional but recommended)
- [ ] Install Node.js 18+ (if not already)

### Documentation Created

- [x] PRD.md (this doc)
- [x] ARCHITECTURE.md (technical design)
- [ ] BUILD_PLAN.md (this file)
- [ ] CLAUDE.md (AI coding rules)

---

## WEEK 1: FOUNDATION

**Goal:** Working Next.js app with database, basic admin dashboard

### Monday: Project Setup (4-6 hours)

**Morning: Initialize Project**
```bash
# Create Next.js project
npx create-next-app@latest onboarding-ai --typescript --tailwind --app

# Install dependencies
cd onboarding-ai
npm install @prisma/client prisma
npm install @supabase/supabase-js
npm install @pinecone-database/pinecone
npm install @anthropic-ai/sdk
npm install openai
npm install zustand react-query
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# Dev dependencies
npm install -D @types/node tsx
```

**Afternoon: Database Setup**

1. **Supabase Setup:**
   - Create project on Supabase
   - Copy connection string
   - Add to `.env.local`:
     ```
     DATABASE_URL="postgresql://..."
     ```

2. **Prisma Schema:**
   ```bash
   npx prisma init
   ```
   
   Edit `prisma/schema.prisma`:
   ```prisma
   generator client {
     provider = "prisma-client-js"
   }

   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }

   model Client {
     id              String    @id @default(uuid())
     name            String
     slug            String    @unique
     email           String
     plan            String    @default("free_pilot")
     apiKey          String    @unique @map("api_key")
     status          String    @default("active")
     onboardingSteps Json?     @map("onboarding_steps")
     branding        Json?
     createdAt       DateTime  @default(now()) @map("created_at")
     updatedAt       DateTime  @updatedAt @map("updated_at")
     
     documents       Document[]
     sessions        OnboardingSession[]
     
     @@map("clients")
   }

   model Document {
     id          String   @id @default(uuid())
     clientId    String   @map("client_id")
     title       String
     content     String   @db.Text
     contentType String   @map("content_type")
     processed   Boolean  @default(false)
     chunkCount  Int      @default(0) @map("chunk_count")
     createdAt   DateTime @default(now()) @map("created_at")
     
     client      Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
     chunks      DocumentChunk[]
     
     @@map("documents")
   }

   model DocumentChunk {
     id         String   @id @default(uuid())
     documentId String   @map("document_id")
     clientId   String   @map("client_id")
     chunkIndex Int      @map("chunk_index")
     content    String   @db.Text
     vectorId   String?  @map("vector_id")
     createdAt  DateTime @default(now()) @map("created_at")
     
     document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
     
     @@map("document_chunks")
   }

   model OnboardingSession {
     id           String    @id @default(uuid())
     clientId     String    @map("client_id")
     endUserId    String?   @map("end_user_id")
     endUserEmail String?   @map("end_user_email")
     currentStep  Int       @default(1) @map("current_step")
     status       String    @default("in_progress")
     startedAt    DateTime  @default(now()) @map("started_at")
     completedAt  DateTime? @map("completed_at")
     
     client       Client    @relation(fields: [clientId], references: [id], onDelete: Cascade)
     messages     Message[]
     
     @@map("onboarding_sessions")
   }

   model Message {
     id              String   @id @default(uuid())
     sessionId       String   @map("session_id")
     role            String
     content         String   @db.Text
     tokensUsed      Int?     @map("tokens_used")
     confidenceScore Float?   @map("confidence_score")
     createdAt       DateTime @default(now()) @map("created_at")
     
     session         OnboardingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
     
     @@map("messages")
   }
   ```

3. **Run Migration:**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

**Evening: Basic Admin UI (2 hours)**

Create admin dashboard layout:
- `/app/(admin)/layout.tsx` - Sidebar navigation
- `/app/(admin)/page.tsx` - Dashboard home
- `/app/(admin)/clients/page.tsx` - Clients list
- `/components/admin/Sidebar.tsx` - Navigation

**Deliverable:** Can view admin pages (empty data)

---

### Tuesday: Admin Dashboard - Client Management (6-8 hours)

**Morning: Create Client Flow**

Build `/app/(admin)/clients/new/page.tsx`:
- Form: name, email, plan
- Generate slug (URL-safe name)
- Generate API key (`sk_live_${randomString(32)}`)
- Create in database
- Redirect to client detail page

**API Route:**
```typescript
// /app/api/admin/clients/route.ts
import { prisma } from '@/lib/db';
import { generateAPIKey, slugify } from '@/lib/utils';

export async function POST(req: Request) {
  const body = await req.json();
  
  const client = await prisma.client.create({
    data: {
      name: body.name,
      slug: slugify(body.name),
      email: body.email,
      plan: body.plan || 'free_pilot',
      apiKey: generateAPIKey(),
      onboardingSteps: body.steps || []
    }
  });
  
  return Response.json(client);
}

export async function GET() {
  const clients = await prisma.client.findMany({
    include: {
      _count: {
        select: { documents: true, sessions: true }
      }
    }
  });
  
  return Response.json(clients);
}
```

**Afternoon: Client Detail Page**

Build `/app/(admin)/clients/[id]/page.tsx`:
- Show client info (name, email, API key)
- Copy API key button
- Edit config button
- View documents button
- View sessions button
- Delete client button

**Deliverable:** Can create and view clients

---

### Wednesday: Document Upload System (6-8 hours)

**Morning: File Upload UI**

Build `/app/(admin)/clients/[id]/documents/page.tsx`:
- Drag-and-drop file upload
- Support: PDF, TXT, MD files
- Show upload progress
- List uploaded documents

**File Upload API:**
```typescript
// /app/api/admin/documents/upload/route.ts
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  const clientId = formData.get('clientId') as string;
  
  // Save file
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const path = join(process.cwd(), 'uploads', `${Date.now()}_${file.name}`);
  await writeFile(path, buffer);
  
  // Create document record
  const document = await prisma.document.create({
    data: {
      clientId,
      title: file.name,
      contentType: file.type,
      content: '', // Will be extracted later
      filePath: path
    }
  });
  
  // Queue for processing (we'll build this tomorrow)
  // await queueDocumentProcessing(document.id);
  
  return Response.json(document);
}
```

**Afternoon: Basic Document Display**

- List documents for a client
- Show status (uploaded, processing, processed)
- Show chunk count
- Delete document button

**Deliverable:** Can upload files and see them listed

---

### Thursday: Document Processing (RAG Pipeline) (8 hours)

**This is the CORE of the product. Take time to get it right.**

**Morning: PDF Text Extraction**

```typescript
// /lib/services/document-processor.ts
import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';

export class DocumentProcessor {
  async extractText(filePath: string, contentType: string): Promise<string> {
    if (contentType.includes('pdf')) {
      const dataBuffer = await readFile(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } else {
      // Plain text
      return await readFile(filePath, 'utf-8');
    }
  }
  
  chunkText(text: string, wordsPerChunk: number = 500): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    
    for (let i = 0; i < words.length; i += wordsPerChunk) {
      const chunk = words.slice(i, i + wordsPerChunk).join(' ');
      chunks.push(chunk);
    }
    
    return chunks;
  }
  
  async processDocument(documentId: string) {
    const doc = await prisma.document.findUnique({
      where: { id: documentId }
    });
    
    // 1. Extract text
    const text = await this.extractText(doc.filePath, doc.contentType);
    
    // 2. Update content
    await prisma.document.update({
      where: { id: documentId },
      data: { content: text }
    });
    
    // 3. Chunk text
    const chunks = this.chunkText(text);
    
    // 4. Create chunk records
    for (let i = 0; i < chunks.length; i++) {
      await this.createChunk(documentId, doc.clientId, i, chunks[i]);
    }
    
    // 5. Mark as processed
    await prisma.document.update({
      where: { id: documentId },
      data: { 
        processed: true,
        chunkCount: chunks.length
      }
    });
  }
  
  async createChunk(
    documentId: string, 
    clientId: string, 
    index: number, 
    content: string
  ) {
    // Create chunk record
    const chunk = await prisma.documentChunk.create({
      data: {
        documentId,
        clientId,
        chunkIndex: index,
        content
      }
    });
    
    // Generate embedding (we'll do this next)
    await embeddingService.embedChunk(chunk.id, content, clientId);
    
    return chunk;
  }
}
```

**Afternoon: Embeddings & Pinecone**

```typescript
// /lib/services/embedding.ts
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export class EmbeddingService {
  private index = pinecone.index('onboarding-docs');
  
  async embedChunk(chunkId: string, content: string, clientId: string) {
    // Generate embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content
    });
    
    const embedding = response.data[0].embedding;
    
    // Store in Pinecone
    await this.index.upsert([{
      id: chunkId,
      values: embedding,
      metadata: {
        client_id: clientId,
        content: content.substring(0, 1000) // First 1000 chars for preview
      }
    }]);
    
    // Update chunk record
    await prisma.documentChunk.update({
      where: { id: chunkId },
      data: { vectorId: chunkId }
    });
  }
  
  async search(query: string, clientId: string, topK: number = 5) {
    // Generate query embedding
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    
    const queryEmbedding = response.data[0].embedding;
    
    // Search Pinecone (filtered by client)
    const results = await this.index.query({
      vector: queryEmbedding,
      filter: { client_id: clientId },
      topK,
      includeMetadata: true
    });
    
    return results.matches.map(match => ({
      content: match.metadata?.content || '',
      score: match.score || 0
    }));
  }
}
```

**Evening: Test End-to-End**

1. Upload a PDF (sample help doc)
2. Process it
3. See chunks in database
4. Verify in Pinecone dashboard
5. Test search with a query

**Deliverable:** Document processing pipeline works end-to-end

---

### Friday: Testing & Buffer (4-6 hours)

**Morning: Fix Bugs**

- Test upload → process → search flow
- Handle errors gracefully
- Add loading states
- Improve UX

**Afternoon: Prepare for Week 2**

- Review ARCHITECTURE.md
- Plan AI integration
- Set up Anthropic API key
- Test Claude API connection:
  ```bash
  curl https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "content-type: application/json" \
    -d '{
      "model": "claude-sonnet-4-20250514",
      "max_tokens": 100,
      "messages": [{"role": "user", "content": "Hello!"}]
    }'
  ```

**Weekend: Rest or Get Ahead**

Optional: Start building chat widget UI

---

## WEEK 2: AI INTEGRATION

**Goal:** Working AI chat that answers questions using RAG

### Monday: AI Service Layer (6-8 hours)

**Morning: Claude API Integration**

```typescript
// /lib/services/ai.ts
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export class AIService {
  async chat(params: {
    sessionId: string;
    userMessage: string;
    clientId: string;
    clientName: string;
    currentStep: number;
  }) {
    // 1. Search relevant docs (RAG)
    const relevantDocs = await embeddingService.search(
      params.userMessage,
      params.clientId,
      5
    );
    
    // 2. Get chat history
    const history = await this.getChatHistory(params.sessionId);
    
    // 3. Build prompt
    const systemPrompt = this.buildSystemPrompt(
      params.clientName,
      params.currentStep,
      relevantDocs
    );
    
    // 4. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: params.userMessage }
      ]
    });
    
    // 5. Extract response
    const assistantMessage = response.content[0].text;
    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    
    // 6. Estimate confidence
    const confidence = this.estimateConfidence(assistantMessage);
    
    // 7. Save messages
    await this.saveMessages(params.sessionId, [
      { role: 'user', content: params.userMessage },
      { 
        role: 'assistant', 
        content: assistantMessage,
        tokensUsed,
        confidenceScore: confidence
      }
    ]);
    
    return {
      message: assistantMessage,
      confidence,
      shouldEscalate: confidence < 0.7,
      tokensUsed
    };
  }
  
  private buildSystemPrompt(
    clientName: string,
    currentStep: number,
    docs: Array<{ content: string; score: number }>
  ): string {
    return `You are an onboarding assistant for ${clientName}.

The user is currently on Step ${currentStep} of their onboarding.

Here are relevant documentation excerpts that may help:

${docs.map((doc, i) => `
Document ${i + 1} (relevance: ${(doc.score * 100).toFixed(0)}%):
${doc.content}
`).join('\n\n')}

Guidelines:
- Be concise and helpful
- Provide step-by-step instructions when appropriate
- Reference the documentation provided
- If you're not confident about an answer, say so
- If the question is outside the documentation, suggest contacting support
- Format your response in markdown for readability

IMPORTANT: Base your answers primarily on the documentation provided above. Don't make up information that's not in the docs.`;
  }
  
  private estimateConfidence(message: string): number {
    const lower = message.toLowerCase();
    
    // High confidence signals
    if (lower.includes('here are the steps') || 
        lower.includes('to do this') ||
        lower.includes('follow these')) {
      return 0.9;
    }
    
    // Low confidence signals
    if (lower.includes("i'm not sure") || 
        lower.includes("i don't have") ||
        lower.includes("contact support") ||
        lower.includes("i don't see information")) {
      return 0.3;
    }
    
    // Medium confidence
    return 0.75;
  }
  
  private async getChatHistory(sessionId: string) {
    const messages = await prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10 // Last 10 messages for context
    });
    
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    }));
  }
  
  private async saveMessages(sessionId: string, messages: any[]) {
    await prisma.message.createMany({
      data: messages.map(msg => ({
        sessionId,
        role: msg.role,
        content: msg.content,
        tokensUsed: msg.tokensUsed,
        confidenceScore: msg.confidenceScore
      }))
    });
  }
}
```

**Afternoon: Test AI Service**

Create test page: `/app/test-ai/page.tsx`
- Input box for question
- Dropdown to select client
- Show AI response
- Show confidence score
- Show token usage

**Deliverable:** AI responds to questions using client's docs

---

### Tuesday: Chat Widget - Frontend (6-8 hours)

**Morning: Widget HTML/CSS**

Build `/app/chat/page.tsx`:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function ChatWidget() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const userId = searchParams.get('userId');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  
  // Initialize session
  useEffect(() => {
    async function initSession() {
      const res = await fetch('/api/chat/session/start', {
        method: 'POST',
        body: JSON.stringify({ clientId, userId })
      });
      const data = await res.json();
      setSession(data);
    }
    
    if (clientId && userId) {
      initSession();
    }
  }, [clientId, userId]);
  
  async function sendMessage() {
    if (!input.trim() || !session) return;
    
    setLoading(true);
    
    // Add user message immediately
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    
    try {
      const res = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: input
        })
      });
      
      const data = await res.json();
      
      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        confidence: data.confidence
      }]);
      
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <h1 className="font-semibold">Onboarding Assistant</h1>
        <p className="text-sm opacity-90">I'm here to help you get set up</p>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="prose prose-sm">
                {msg.content}
              </div>
              {msg.confidence && msg.confidence < 0.7 && (
                <div className="text-xs mt-2 opacity-75">
                  ⚠️ I'm not very confident about this answer. 
                  Consider contacting support.
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Input */}
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Afternoon: Chat API Routes**

```typescript
// /app/api/chat/session/start/route.ts
export async function POST(req: Request) {
  const { clientId, userId } = await req.json();
  
  // Get client config
  const client = await prisma.client.findUnique({
    where: { id: clientId }
  });
  
  if (!client) {
    return Response.json({ error: 'Client not found' }, { status: 404 });
  }
  
  // Create session
  const session = await prisma.onboardingSession.create({
    data: {
      clientId,
      endUserId: userId,
      currentStep: 1
    }
  });
  
  return Response.json(session);
}

// /app/api/chat/message/route.ts
export async function POST(req: Request) {
  const { sessionId, message } = await req.json();
  
  // Get session
  const session = await prisma.onboardingSession.findUnique({
    where: { id: sessionId },
    include: { client: true }
  });
  
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
  
  // Call AI service
  const response = await aiService.chat({
    sessionId,
    userMessage: message,
    clientId: session.clientId,
    clientName: session.client.name,
    currentStep: session.currentStep
  });
  
  return Response.json(response);
}
```

**Deliverable:** Chat widget works in browser

---

### Wednesday: Widget Embed Code (4-6 hours)

**Morning: Generate Embed Script**

Build page in admin: `/app/(admin)/clients/[id]/embed/page.tsx`

Show client:
```html
<!-- Copy and paste this code on your website -->
<script>
  window.OnboardingAI = {
    clientId: 'abc123',
    apiKey: 'sk_live_xyz...'
  };
</script>
<script src="https://yourdomain.com/widget.js"></script>
```

**Create `/public/widget.js`:**
```javascript
(function() {
  const config = window.OnboardingAI;
  
  if (!config || !config.clientId) {
    console.error('OnboardingAI: Missing configuration');
    return;
  }
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'onboarding-ai-widget';
  iframe.src = `${getBaseURL()}/chat?clientId=${config.clientId}&userId=${getCurrentUserId()}`;
  iframe.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 400px;
    height: 600px;
    border: none;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 999999;
    display: none;
  `;
  
  // Create toggle button
  const button = document.createElement('button');
  button.innerHTML = '💬';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    border-radius: 30px;
    background: #2563eb;
    color: white;
    border: none;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    z-index: 999999;
  `;
  
  button.onclick = () => {
    if (iframe.style.display === 'none') {
      iframe.style.display = 'block';
      button.style.display = 'none';
    }
  };
  
  // Close button in iframe
  window.addEventListener('message', (e) => {
    if (e.data === 'close-widget') {
      iframe.style.display = 'none';
      button.style.display = 'block';
    }
  });
  
  // Insert into page
  document.body.appendChild(iframe);
  document.body.appendChild(button);
  
  function getBaseURL() {
    return 'https://yourdomain.com'; // Replace with your actual domain
  }
  
  function getCurrentUserId() {
    // Try to get user ID from various sources
    return config.userId || 
           window.userId || 
           localStorage.getItem('userId') ||
           `anonymous_${Date.now()}`;
  }
})();
```

**Afternoon: Test Embed**

1. Create test HTML file
2. Include embed code
3. Verify widget loads
4. Test chat functionality

**Deliverable:** Widget can be embedded on external sites

---

### Thursday: Chrome Extension - Basic Shell (6-8 hours)

**Morning: Extension Setup**

Create `/chrome-extension/` folder:

```json
// manifest.json
{
  "manifest_version": 3,
  "name": "SaaS Onboarding Assistant",
  "version": "1.0.0",
  "description": "AI-powered onboarding guidance",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  }
}
```

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 350px;
      padding: 20px;
      font-family: system-ui;
    }
    .step {
      padding: 12px;
      margin: 8px 0;
      border-left: 3px solid #ddd;
      background: #f9f9f9;
    }
    .step.active {
      border-color: #2563eb;
      background: #eff6ff;
    }
    .step.completed {
      border-color: #10b981;
      background: #f0fdf4;
    }
  </style>
</head>
<body>
  <h2>Onboarding Progress</h2>
  <div id="steps"></div>
  
  <script src="popup.js"></script>
</body>
</html>
```

```javascript
// popup.js
chrome.storage.sync.get(['apiKey', 'steps', 'currentStep'], (data) => {
  if (!data.apiKey) {
    showSetup();
  } else {
    showSteps(data.steps, data.currentStep);
  }
});

function showSteps(steps, current) {
  const container = document.getElementById('steps');
  
  steps.forEach((step, i) => {
    const div = document.createElement('div');
    div.className = 'step';
    if (i < current - 1) div.className += ' completed';
    if (i === current - 1) div.className += ' active';
    
    div.innerHTML = `
      <strong>Step ${i + 1}</strong>
      <p>${step.title}</p>
    `;
    
    container.appendChild(div);
  });
}

function showSetup() {
  document.body.innerHTML = `
    <h2>Setup Required</h2>
    <p>Enter your API key to get started:</p>
    <input type="text" id="apiKey" style="width:100%;padding:8px;margin:8px 0;">
    <button id="save" style="padding:8px 16px;">Save</button>
  `;
  
  document.getElementById('save').onclick = () => {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({ apiKey }, () => {
      location.reload();
    });
  };
}
```

**Afternoon: Load Steps from API**

```javascript
// background.js
chrome.runtime.onInstalled.addListener(() => {
  // Fetch onboarding steps from API
  chrome.storage.sync.get(['apiKey'], (data) => {
    if (data.apiKey) {
      fetchSteps(data.apiKey);
    }
  });
});

async function fetchSteps(apiKey) {
  const res = await fetch('https://yourdomain.com/api/extension/steps', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  
  const data = await res.json();
  
  chrome.storage.sync.set({
    steps: data.steps,
    currentStep: data.currentStep || 1
  });
}
```

**Deliverable:** Chrome extension shows onboarding steps

---

### Friday: Testing & Polish (4-6 hours)

**Morning: End-to-End Test**

1. Create test client in admin
2. Upload test documentation
3. Process docs (verify in Pinecone)
4. Embed widget on test page
5. Chat with AI
6. Install extension
7. Verify steps appear

**Afternoon: Bug Fixes & UI Polish**

- Fix any critical bugs
- Improve error handling
- Add loading states
- Better error messages
- Mobile responsiveness

**Weekend: Prepare for Outreach**

Review PRD for outreach strategy

---

## WEEK 3: OUTREACH & PILOTS

**Goal:** Sign 5 free pilot customers

### Monday: Target List (2-4 hours)

**Create spreadsheet** of 50 potential clients:

Criteria:
- Marketing analytics / attribution tools
- $1M-10M ARR (check LinkedIn, Crunchbase)
- Founder-led
- Recently raised funding or hit milestone

**Sources:**
- Product Hunt (new launches)
- LinkedIn search
- Indie Hackers
- SaaStr community
- Direct Google search

**Deliverable:** List of 50 companies with founder LinkedIn URLs

---

### Tuesday-Thursday: Outreach (20+ hours)

**Send 10 LinkedIn DMs per day** (30 total):

**Template:**
```
Hey [Name],

Congrats on [recent milestone/launch]! 

Quick question: How many hours does your CS team 
spend onboarding each new customer?

I'm building an AI onboarding agent (similar to 
what Becker built internally for Hyros). Looking 
for 5 companies to pilot it for free.

Interested in a 15-min demo?
```

**Goal:**
- 30 messages sent
- 10-15 responses
- 5-8 calls booked

**Demo Script (15 mins):**
1. (5 min) Ask about their onboarding:
   - How many new customers/month?
   - How long does onboarding take?
   - What % complete it successfully?
   - What's the biggest pain point?

2. (3 min) Show Hyros reference:
   - "Becker built this for Hyros"
   - Show HSE extension
   - "I'm productizing it for other SaaS"

3. (5 min) Show your MVP:
   - Live demo with test account
   - Show AI answering questions
   - Show admin dashboard

4. (2 min) Close:
   - "Want to pilot for free?"
   - "In exchange for feedback + case study"
   - "I'll set everything up for you"

**Deliverable:** 5 pilots signed

---

### Friday: Onboard First Pilot (6-8 hours)

**Kickoff call with first pilot:**
1. Understand their onboarding flow
2. Get their documentation (help center, PDFs)
3. Define their steps together
4. Set expectations

**After call:**
1. Create their workspace in admin
2. Upload their docs (2-3 hours processing)
3. Configure their steps
4. Generate embed code
5. Send them:
   - Embed code
   - Chrome extension link
   - Admin dashboard access

**Deliverable:** First pilot live!

---

## WEEK 4: PILOT TESTING & ITERATION

**Goal:** Get feedback, iterate, improve

### Monday-Wednesday: Support Pilots (Full time)

**Daily routine:**
- Check admin dashboard for sessions
- Review chat transcripts
- Look for AI failures
- Add missing docs
- Fix bugs
- Respond to pilot questions (Slack/email)

**Key metrics to track:**
- Sessions started
- Completion rate
- Average time
- Escalation rate
- AI confidence scores

---

### Thursday: Collect Feedback (4 hours)

**Schedule calls with all pilots:**
- What's working well?
- What's confusing?
- What features are missing?
- Would you pay for this?
- How much would you pay?

**Deliverable:** Feedback doc with priority fixes

---

### Friday: Plan Next Phase (4 hours)

**Review 4 weeks:**
- What worked?
- What didn't?
- What to build next?
- How to convert pilots to paid?

**Update roadmap:**
- Week 5-8: Build missing features
- Week 9-12: Convert pilots, sign new customers
- Month 4: Hit $3k MRR goal

---

## DELIVERABLES CHECKLIST

### Week 1
- [ ] Next.js project set up
- [ ] Database schema created
- [ ] Admin dashboard (create clients, upload docs)
- [ ] Document processing pipeline (PDF → chunks → Pinecone)
- [ ] RAG search working

### Week 2
- [ ] AI service (Claude API integration)
- [ ] Chat widget frontend
- [ ] Chat API endpoints
- [ ] Widget embed code
- [ ] Chrome extension shell

### Week 3
- [ ] 50 target companies identified
- [ ] 30 outreach messages sent
- [ ] 5 demo calls completed
- [ ] 5 pilots signed
- [ ] First pilot onboarded

### Week 4
- [ ] All pilots using product
- [ ] Feedback collected
- [ ] Critical bugs fixed
- [ ] Roadmap updated
- [ ] Ready to scale

---

## CRITICAL SUCCESS FACTORS

**Don't:**
- ❌ Overengineer (ship fast, iterate)
- ❌ Build features nobody asked for
- ❌ Spend >2 days on any single feature
- ❌ Wait for perfection

**Do:**
- ✅ Talk to customers constantly
- ✅ Ship broken things (for pilots)
- ✅ Fix based on real feedback
- ✅ Focus on core value (AI onboarding)
- ✅ Move fast

---

## TOOLS & RESOURCES

**Development:**
- Claude Code (for building)
- VS Code (for viewing/editing)
- GitHub (version control)
- Vercel (hosting)

**Monitoring:**
- Supabase dashboard (database)
- Pinecone console (vectors)
- Vercel analytics (usage)
- Chrome DevTools (debugging)

**Communication:**
- Slack (pilot support)
- Loom (screen recordings)
- Linear (task tracking)
- Google Sheets (metrics)

---

**LET'S BUILD! 🚀**

Start Monday. Ship Friday. Repeat.
