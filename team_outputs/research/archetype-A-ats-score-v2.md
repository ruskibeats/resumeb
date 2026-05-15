# ATS Compatibility Score: Archetype A v2 — Infrastructure Programme Director
**Date:** 2026-05-07  
**Resume UUID:** `019e020e-5cde-77eb-8a95-b3d06c78f57d`  
**Structure:** Hybrid Umbrella Nesting (verified)

---

## ✅ Verified Architecture

| Check | Status | Detail |
|-------|--------|--------|
| Umbrella Nesting | ✅ **PASS** | Hiloka Limited has 7 nested child roles in `roles[]` array |
| Standalone Entity | ✅ **PASS** | London Borough of Lambeth as separate top-level item |
| Top-level items | ✅ **2** | Hiloka (parent) + Lambeth (standalone) |
| Concurrent roles nested | ✅ **7** | All child roles inside Hiloka parent |

## Remaining Issues

| Issue | Severity | Fix |
|-------|----------|-----|
| No `(Concurrent)` tags in period fields | Medium | Add to Independent Consultant, Atos, Collective IP periods |
| Nested roles missing `company` field | Low | Add company name to each nested role |
| Education section hidden | Low | Add one-line education for ATS completeness |
| `picture.hidden` is `false` | Low | Set to `true` |
| `sidebarWidth` is 31.17 with no sidebar content | Low | Set to 0 |

## Estimated Score

**Estimated: 85–90/100** (corrected from 78/100 — nesting was already implemented)

The previous analysis scored against the pre-fix UUID. With nesting now verified, the structural penalties are removed and the score should be comparable to the v1 baseline of 89/100.
