# Product Requirements Document (PRD)
## AI-Powered SaaS Onboarding Platform

**Version:** 1.0  
**Last Updated:** February 24, 2026  
**Author:** Founder  
**Status:** Pre-MVP Development

---

## EXECUTIVE SUMMARY

We are building a white-label AI onboarding platform that helps B2B SaaS companies automate customer onboarding through intelligent, context-aware guidance. The AI views customer documentation, guides users step-by-step, and escalates to human support when needed.

**The Problem:** SaaS companies spend 10-20 CSM hours per customer onboarding, resulting in 40% churn in the first 90 days due to setup complexity.

**The Solution:** Multi-tenant AI platform where each SaaS company gets their own configured workspace with AI trained on their specific documentation.

**Business Model:** White-glove setup ($0 for pilots, $299-599/month post-pilot) with 70-80% gross margins.

---

## PRODUCT VISION

### What We're Building

A multi-tenant SaaS platform with three core components:

1. **Admin Dashboard** (We use this)
   - Create client workspaces
   - Upload and process documentation
   - Configure onboarding flows
   - Monitor usage and analytics
   
2. **Client Dashboard** (SaaS companies use this)
   - View their customers' onboarding progress
   - See analytics and completion rates
   - Manage escalations
   - Access API keys and embed codes

3. **End-User Experience** (Their customers use this)
   - Chrome extension for guided setup
   - Chat widget embedded on client's site
   - Step-by-step onboarding guidance
   - Real-time Q&A with AI

### Why This Exists

**Validated by Alex Becker ($40M/year Hyros):**
- Built this internally for Hyros onboarding
- Reduced onboarding time by 75%
- Explicitly said "take this idea and productize it"

**Market Validation:**
- 5,000-10,000 target companies ($1M-50M ARR SaaS)
- Clear ROI: Save $500k-2M/year in churn + CSM costs
- No dominant player in this specific niche

---

## TARGET CUSTOMER

### Primary Customer (Who Pays Us)

**Profile:**
- B2B SaaS companies
- $1M-50M ARR (growth stage)
- 10-200 employees
- Complex product requiring onboarding
- Onboarding 20+ new customers/month
- 2-5 person CS team (capacity constrained)

**Ideal First Vertical:**
- Marketing analytics tools
- Attribution platforms
- Conversion tracking SaaS
- Similar to Hyros (validated use case)

**Decision Maker:**
- VP Customer Success
- Head of Onboarding
- Founder/CEO (at smaller companies)

**Buying Triggers:**
- High early churn (>30% in first 90 days)
- CSM team at capacity
- Complex setup process (pixels, integrations)
- Recent funding (budget for tools)

### Secondary Customer (End Users)

**Profile:**
- Marketing managers/directors
- Growth teams
- Technical but not developers
- Time-constrained, need fast setup

**Their Pain:**
- Confused by complex setup
- Stuck waiting for support responses
- Risk of setup errors
- Pressure to show ROI quickly

---

## CORE FEATURES (MVP)

### Phase 1: MVP (Weeks 1-4)

**Admin Dashboard (Our Backend)**
- ✅ Create new client workspaces
- ✅ Upload PDF/text documentation
- ✅ Process docs into vector embeddings
- ✅ View all client analytics
- ✅ Monitor active onboarding sessions

**Client Configuration**
- ✅ Define onboarding steps (1-10 steps)
- ✅ Set difficulty levels per step
- ✅ Configure escalation triggers
- ✅ Generate unique embed codes

**Documentation System**
- ✅ Upload PDFs, URLs, text files
- ✅ Parse into chunks (~500 words each)
- ✅ Generate embeddings (OpenAI/Anthropic)
- ✅ Store in Pinecone with client tags
- ✅ RAG retrieval (search only client's docs)

**AI Guidance Engine**
- ✅ Claude Sonnet 4.5 integration
- ✅ Context-aware responses
- ✅ Step-by-step guidance
- ✅ Error detection and troubleshooting
- ✅ Confidence scoring (escalate if <80%)

**Chat Widget (Embeddable)**
- ✅ JavaScript embed code
- ✅ iframe-based (secure, isolated)
- ✅ Branded for each client
- ✅ Mobile responsive
- ✅ Chat history persistence

**Chrome Extension**
- ✅ Basic shell (install/setup)
- ✅ API key authentication
- ✅ Step-by-step checklist UI
- ✅ Error detection
- ✅ Link to fix articles

**Analytics**
- ✅ Sessions started/completed
- ✅ Average time per step
- ✅ Drop-off points
- ✅ Escalation rate

### Phase 2: Post-MVP (Months 2-3)

**NOT building for MVP:**
- ❌ Screen sharing (use Zoom manually for pilots)
- ❌ Video processing (accept transcripts only)
- ❌ Advanced integrations (Stripe, Salesforce)
- ❌ SSO authentication
- ❌ White-labeling (basic branding only)

---

## USER FLOWS

### Flow 1: We Onboard a New Client (White-Glove Setup)

```
1. Client signs up (free pilot or paid)
2. We schedule kickoff call (1 hour)
3. During call:
   - We create their workspace in admin panel
   - We ask for their documentation (PDFs, help center)
   - We define their onboarding steps together
4. After call:
   - We upload their docs (takes 1-2 hours)
   - We configure their steps
   - We generate embed code + Chrome extension
5. Week 2:
   - We send them embed code
   - They install on their site
   - We test with 1-2 test users
6. Week 3:
   - Go live with real customers
   - Weekly check-ins
```

### Flow 2: Their Customer Gets Onboarded

```
1. User signs up for ClientSaaS.com
2. Sees welcome page with chat widget
3. Widget: "Hi! I'm here to help you set up. Ready to start?"
4. User: "Yes"
5. Widget: "Great! First, install our Chrome extension [link]"
6. User installs extension
7. Widget guides through Step 1: "Install tracking pixel"
   - Shows step-by-step instructions
   - User follows along
   - Extension detects if completed correctly
8. User gets stuck: "I'm seeing an error XYZ"
9. AI searches client's docs, finds solution
10. If AI can't solve → Escalates to human support
11. User completes all steps → Success!
12. Client's CS team sees: "User completed onboarding in 23 mins"
```

### Flow 3: We Monitor & Improve

```
1. Daily: Check admin dashboard
2. See metrics:
   - 15 sessions started today
   - 12 completed (80% completion rate)
   - 3 escalated to human
   - Average time: 28 minutes
3. Click into failed session
4. See where user got stuck: Step 3 (Facebook connection)
5. Read chat transcript
6. Realize: AI didn't have answer in docs
7. Add new article to client's docs about this error
8. Re-process documentation
9. Next user with same error → AI solves it
```

---

## TECHNICAL REQUIREMENTS

### Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI components
- React Query (data fetching)

**Backend:**
- Next.js API Routes
- PostgreSQL (Supabase)
- Prisma ORM
- Pinecone (vector database)
- Claude Sonnet 4.5 API (Anthropic)

**Chrome Extension:**
- Manifest V3
- React (for popup/options)
- Chrome Storage API
- Message passing

**Infrastructure:**
- Vercel (hosting)
- Supabase (database + auth)
- Pinecone (vector storage)
- Cloudflare (CDN for widget)

**Third-Party APIs:**
- Anthropic Claude API
- OpenAI Embeddings (or Claude embeddings)
- Daily.co (Phase 2, screen sharing)

### Performance Requirements

**Response Time:**
- Chat widget loads: <2 seconds
- AI response time: <3 seconds (p95)
- Document search: <1 second

**Scalability:**
- Support 100 concurrent chat sessions
- 10,000 documents across all clients
- 100 client workspaces

**Reliability:**
- 99.5% uptime
- Graceful degradation (if AI fails, show docs link)
- Error recovery (retry failed AI requests)

### Security Requirements

**Data Isolation:**
- Each client's data completely separate
- Vector search filtered by client_id
- No cross-client data leakage

**Authentication:**
- API key authentication for widget
- Admin panel: Email/password + 2FA
- Client dashboard: Email/password

**Data Privacy:**
- GDPR compliant (data deletion on request)
- SOC 2 Type II (future, post-MVP)
- Encrypted at rest and in transit

---

## SUCCESS METRICS

### Business Metrics (4-Month Goal)

- **Revenue:** $3,000 MRR (5 paying customers @ $600/mo)
- **Pilots:** 5 free pilots completed
- **Conversion:** 60% pilot → paid conversion
- **Churn:** <10% monthly churn

### Product Metrics (Per Client)

- **Onboarding Completion Rate:** >70% (vs. 60% baseline)
- **Time to Complete:** <30 minutes (vs. 60 minutes)
- **Escalation Rate:** <20% (AI handles 80%)
- **User Satisfaction:** NPS >50

### Technical Metrics

- **AI Accuracy:** >90% correct responses
- **Response Time:** <3 seconds (p95)
- **Uptime:** >99.5%
- **Error Rate:** <1% failed requests

---

## COMPETITIVE LANDSCAPE

### Direct Competitors (Partial Overlap)

**1. Intercom Product Tours**
- Pre-programmed flows
- No AI, no adaptability
- 3-6 month setup
- $$$$ expensive

**2. Appcues/WalkMe**
- JavaScript overlays
- No Q&A capability
- High setup cost

**3. AI Chatbots (Intercom AI, Zendesk)**
- Q&A only
- Don't guide step-by-step
- Not onboarding-specific

### Our Competitive Advantages

1. **AI-First:** Adaptive, not pre-programmed
2. **White-Glove Setup:** We do the work (2 weeks vs 3 months)
3. **Multi-Tenant:** One platform, many clients (cost efficient)
4. **Vertical Focus:** Start with analytics tools (deep expertise)
5. **Speed:** Ship in 4 weeks, not 4 months

---

## RISKS & MITIGATION

### Technical Risks

**1. AI Accuracy Too Low**
- Mitigation: Human escalation, confidence scoring
- Acceptance: 80% AI success rate is still good

**2. Documentation Quality Poor**
- Mitigation: We help clients improve docs
- Acceptance: Part of white-glove service

**3. Integration Complexity**
- Mitigation: Start simple (embed code only)
- Future: Build deeper integrations

### Business Risks

**1. Can't Sign Pilots**
- Mitigation: Becker validation strong
- Pivot: Try different vertical

**2. Pilots Don't Convert**
- Mitigation: Provide real value
- Learn: Why didn't they convert?

**3. Too Manual (Doesn't Scale)**
- Acceptance: First 100 customers = white-glove
- Future: Automate setup with templates

---

## GO-TO-MARKET

### Phase 1: Free Pilots (Month 1-2)

**Target:** 5 free pilots
**Vertical:** Marketing analytics tools
**Outreach:** LinkedIn DMs to founders
**Offer:** Free setup + 3 months free usage
**Ask:** Feedback + case study + reference

### Phase 2: Paid Launch (Month 3-4)

**Target:** 5-10 paying customers
**Pricing:** $299-599/month
**Channel:** Pilot referrals + direct outreach
**Goal:** $3,000 MRR by Month 4

### Phase 3: Scale (Month 5-12)

**Target:** 30-50 customers
**Pricing:** $299 (starter) to $1,499 (enterprise)
**Channels:** Content, SEO, partnerships
**Goal:** $20,000 MRR by Month 12

---

## PRODUCT ROADMAP

### Month 1 (Weeks 1-4): MVP Build
- ✅ Admin dashboard
- ✅ Documentation system
- ✅ Chat widget
- ✅ Chrome extension
- ✅ Basic analytics

### Month 2 (Weeks 5-8): Pilot Testing
- ✅ 5 free pilots onboarded
- ✅ Weekly feedback calls
- ✅ Iterate on AI accuracy
- ✅ Fix critical bugs

### Month 3 (Weeks 9-12): Paid Conversion
- ✅ Add billing (Stripe)
- ✅ Convert 3+ pilots to paid
- ✅ Case studies published
- ✅ Start outbound sales

### Month 4 (Weeks 13-16): Growth
- ✅ 5-10 paying customers
- ✅ $3,000 MRR achieved
- ✅ Hire first sales help (commission-only)
- ✅ Plan Phase 2 features

---

## OPEN QUESTIONS

**Technical:**
- Which embedding model? (OpenAI vs Claude vs open source)
- How to handle multi-language docs? (Start English only)
- Screen sharing: Daily.co or build custom? (Use Daily.co)

**Business:**
- Pricing tiers? (Start single tier, add later)
- Contract length? (Monthly, annual discount)
- Free trial? (No, free pilots instead)

**Product:**
- Voice input/output? (Phase 2)
- Mobile app? (Phase 2, web-first)
- Integrations priority? (Stripe, then Salesforce)

---

## APPENDIX

### Key Assumptions

1. Claude Sonnet 4.5 accuracy sufficient for onboarding
2. SaaS companies willing to share documentation
3. End users trust AI for setup guidance
4. 80% AI success rate acceptable
5. $500/month price point reasonable

### Success Criteria for MVP

- ✅ 5 free pilots signed
- ✅ 70%+ onboarding completion rate
- ✅ <3 second AI response time
- ✅ No critical bugs
- ✅ Positive pilot feedback (NPS >30)

### Definition of Done (MVP)

- [ ] Admin can create client workspace in <5 minutes
- [ ] Upload and process 100 docs in <10 minutes
- [ ] Chat widget embeds in <5 lines of code
- [ ] AI answers 80%+ of questions correctly
- [ ] End user completes onboarding in <30 mins
- [ ] Analytics show all key metrics
- [ ] No security vulnerabilities
- [ ] Documentation complete (for clients)

---

**Next Steps:**
1. Create ARCHITECTURE.md (technical design)
2. Create BUILD_PLAN.md (week-by-week tasks)
3. Create CLAUDE.md (AI coding rules)
4. Subscribe to Claude Pro
5. Start building Week 1
