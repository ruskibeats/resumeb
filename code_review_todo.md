# AI Feature Analysis & Roadmap

## 1) Current AI Capabilities (short summary)

- **Resume Parsing**: Extract structured ResumeData from PDF and DOCX files via AI vision/models
- **AI Chat Assistant**: Interactive chat-to-edit functionality with tool-use (patch_resume) to modify resumes conversationally
- **Resume Tailoring**: Auto-tailor resumes for specific job postings with ATS optimization (summary, experiences, skills)
- **Resume Analysis**: Score-based feedback with scorecard, strengths, and actionable suggestions (with optional job context)
- **Cover Letter Generation**: Generate job-targeted cover letters from resume data with configurable tone
- **Interview Preparation**: Generate interview questions and preparation guides based on resume and job description
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, Ollama, Vercel AI Gateway, OpenRouter
- **Provider Configuration**: User-configurable API keys, models, and base URLs via Zustand store

Constraints:
- Rate limited via `aiRequestRateLimit` middleware
- Requires valid API credentials (no built-in quota)
- JSON output parsing with fallback to jsonrepair for malformed responses
- All AI calls go through oRPC with authentication requirement

---

## 2) Technical Improvements

| Severity | Area | Files | Change | Why it helps |
|----------|------|-------|--------|--------------|
| High | Error Handling | `src/integrations/orpc/services/ai.ts` | Add structured AI response validation with retry logic for JSON parsing failures | Reduces "invalid format" errors when AI returns malformed JSON |
| Medium | Prompt Versioning | `src/integrations/ai/prompts/*.md` | Add version comments/hashes to prompt templates | Enables A/B testing and rollback capability |
| Medium | Caching | `src/integrations/orpc/services/ai.ts`, `src/integrations/ai/store.ts` | Cache analysis results keyed by resume_hash + job_hash | Avoids redundant API calls for same resume/job combinations |
| High | Cost Control | `src/integrations/ai/store.ts` | Add token budget tracking and estimated costs in AI store | Users can monitor their API usage and expenses |
| Medium | Streaming UX | `src/routes/builder/*/resume-analysis.tsx` | Replace `isPending` modal with progress streaming | Better user feedback during long AI operations |
| Low | Prompt Debugging | `src/utils/ai-logger.ts` | Add prompt + response dump toggle for debugging | Easier troubleshooting when AI returns unexpected outputs |
| High | Input Sanitization | `src/integrations/orpc/services/ai.ts` | Strip PII (email, phone) from prompts sent to AI | Privacy protection for resume data |
| Medium | Model Fallback | `src/integrations/orpc/services/ai.ts` | Try secondary model if primary fails or rate-limited | Improved reliability for critical operations |
| Low | Response Validation | All AI service functions | Add schema validation before JSON parse attempt | Catches format issues earlier in the pipeline |
| Medium | Batch Operations | `src/integrations/orpc/services/ai.ts` | Combine multiple analysis tasks in single API call | Reduces API calls and latency |

---

## 3) New Feature Ideas

| Idea | Description | Impact | Complexity | Key touchpoints |
|------|-------------|--------|------------|-----------------|
| AI First Draft Resume | Generate initial resume from pasted job descriptions, LinkedIn profile URL, or bullet points | High | Medium | `src/integrations/ai/`, `src/routes/builder/`, new "Create from Job Description" route |
| AI Bullet Point Improver | Interactive bullet rewriting with style presets (quantify, action verbs, concise) and before/after preview | High | Low | `src/routes/builder/right/sections/`, new component in sidebar |
| AI Skills Gap Detector | Compare resume skills vs job requirements, suggest additions with learning resources | Medium | Medium | `src/routes/dashboard/job-search/`, `src/integrations/orpc/services/ai.ts`, new schema |
| AI Resume Scoring History | Store and graph analysis scores over time, show improvement after suggestions | Medium | Low | `src/routes/dashboard/`, `src/integrations/orpc/services/resume.ts`, new table |
| AI Interview Mock Sessions | Simulated interview with speech-to-text and AI feedback on answers | High | High | New route, WebRTC integration, audio handling, new AI service endpoints |
| AI Keyword Optimizer | One-click ATS keyword insertion based on target job, shows match percentage | High | Low | `src/routes/builder/`, hook into tailorResume flow |
| AI Template Suggestion | Recommend resume templates based on industry/seniority from resume content | Low | Low | `src/routes/builder/`, template selection UI |

---

## 4) AI Roadmap

### Now (1–3 low-risk changes that deliver quick value)
- **Improve AI error handling with retry logic** - Add JSON parsing retry with clearer error messages when AI returns malformed output
- **Add AI cost tracking to the store** - Track estimated token usage and costs per operation in `useAIStore`
- **Implement input sanitization** - Strip PII from data before sending to AI providers

### Next (2–5 medium-scope improvements/features)
- **AI First Draft Resume** - Generate resume from job description with new route at `/builder/new/from-job`
- **AI Bullet Point Improver** - Sidebar component with style presets (concise, quantified, action verbs)
- **AI Resume Scoring History** - Store analysis results and render interactive chart in dashboard
- **Model fallback strategy** - Auto-retry with backup model on rate limit or failure
- **Prompt versioning** - Add version metadata to prompt templates for A/B testing

### Later (higher-risk or higher-complexity ideas)
- **AI Mock Interview Sessions** - Full voice-enabled interview practice with speech recognition and feedback
- **AI Skills Gap Learning Paths** - Integration with learning platforms (Coursera, Udemy) for skill gaps
- **Bulk resume optimization** - Process multiple resume versions against same job description
- **AI Resume A/B Testing** - Generate multiple versions and track application success rates