# Analyse Resume — Validation Plan & Rollout Strategy

## Manual Test Matrix

### 1. Basic Analysis (no job context)

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Fresh resume, no prior analysis | Click "Analyze Resume" | Score, scorecard, strengths, suggestions all populated. "Run your first analysis" message gone. |
| Re-analyze same resume | Click "Analyze Resume" again | Previous analysis replaced. Timestamp updates. |
| Rapid double-click | Click button rapidly | Button disabled after first click (isPending). Only one request fires. |

### 2. Analysis with Job Context

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Tailored analysis | First search/select a job, then analyze | Job context card shown with title, employer, URL, description. "Analyzed for: [title] at [employer]" label near timestamp. |
| Analysis without job | Analyze without selecting a job | Generic scoring dimensions used (Clarity, Impact, ATS, Structure, Language). Job context card hidden. |
| Change job after analysis | Select different job, re-analyze | New analysis with JD-specific dimensions. Job context card updates. |

### 3. Edge Cases — Resume Structure

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Very short resume (name + contact only) | Analyze a minimal resume | Score likely low but no crash. Scorecard shows "General Assessment" fallback if dimensions can't be scored. Degraded banner if partial. |
| Very long resume (20+ years of experience) | Analyze a dense resume | Score produced. Suggestion count capped at 10. |
| Resume with missing sections (no skills, no education) | Analyze | No crash. Scorecard reflects missing sections in rationale. |
| Resume with unusual characters (emoji, Unicode) | Analyze | Text rendered safely. No XSS or rendering issues. |

### 4. Error Scenarios

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Invalid API key | Set wrong API key, analyze | Error toast + inline error alert (when no prior analysis). BAD_GATEWAY error. |
| Model timeout | Use a slow/unreachable model | Error after timeout (2 min default). Retry logic fires up to 3 times. |
| AI returns malformed JSON | Simulate bad AI output | Graceful degradation: fallback scorecard, degraded banner shown. Analysis still persisted. |
| AI returns empty response | Simulate empty text | Error with "Empty AI response" log. |
| Network disconnected | Disable network, analyze | Network error toast + inline error. |

### 5. UI Verification

| Scenario | Steps | Expected Result |
|----------|-------|----------------|
| Loading state | Click Analyze, watch during request | Score section shows pulsing skeleton placeholder. Button shows "Analyzing...". |
| Error state (no prior analysis) | Trigger error on fresh resume | Inline error alert shown. "Run your first analysis" message hidden. |
| Error state (has prior analysis) | Trigger error on re-analysis | Prior analysis remains visible. Error shown only as toast. |
| Degraded notice | Trigger partial AI output | Amber banner: "Analysis incomplete. Some sections could not be scored." |
| Debug toggle | After analysis, click "Show raw data" | Raw JSON shown with version, degraded flag, counts. Click "Hide raw data" to collapse. |
| "Analyzed for" label | Analyze with job context | Label appears below timestamp showing job title and employer. |
| Suggestion preview | Click "Preview Changes" on a suggestion | PatchPreviewDialog opens showing before/after diff. |
| Suggestion application | Confirm preview | Resume data updated. "Suggestion applied" toast. |

## Rollout Strategy

### Phased Rollout

| Phase | Scope | Duration | Success Criteria |
|-------|-------|----------|------------------|
| **1. Development** | All changes in this branch | — | All 59 new tests pass. TypeScript compiles clean. |
| **2. Self-hosted / Staging** | Deploy to a staging or self-hosted instance | 2-3 days | Manual test matrix passes. No unexpected errors in /tmp/rr-ai-debug.log. |
| **3. Production — 10% canary** | Gradual rollout with feature flag | 1-2 days | Zod/contract error rate < 0.1% of analyzeResume calls. Degraded rate < 1%. |
| **4. Production — 100%** | Full rollout | — | Monitor logs for 1 week. |

### Rollback

If contract error rates exceed 0.5% or degraded rates exceed 5%:
- **Immediate rollback**: Revert the `analysis.ts`, `router/ai.ts`, and `services/ai.ts` changes
- The `safeParseAnalysisResult` function in services/ai.ts was designed to prevent total failures, so degraded mode is much better than hard errors

### Monitoring

| What to monitor | Where | Alert threshold |
|-----------------|-------|-----------------|
| Zod/contract errors | `/tmp/rr-ai-debug.log`, grep for `zod failure` | Any occurrence → investigate |
| Degraded analyses | `/tmp/rr-ai-debug.log`, grep for `degraded` | >5% of total analyzeResume calls |
| Model API errors | `/tmp/rr-ai-debug.log`, grep for `MODEL_API_ERROR` | Track by provider; alert on spikes |
| Analysis persistence | `/tmp/rr-ai-debug.log`, grep for `ai_response` with `operation:analyzeResume` | Success rate < 95% |
| Inline error rate | Frontend toast/alert tracking | >1% of analyze clicks |

### Log Query Examples

```bash
# Count degraded analyses in the last hour
grep "degraded" /tmp/rr-ai-debug.log | grep "$(date -u +%Y-%m-%dT%H)" | wc -l

# Find all Zod contract errors
grep "zod failure" /tmp/rr-ai-debug.log

# Find recent analyzeResume responses with timing
grep "ai_response.*analyzeResume" /tmp/rr-ai-debug.log | tail -20

# Correlation: find a specific requestId
grep "<requestId>" /tmp/rr-ai-debug.log
```
