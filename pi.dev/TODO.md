# Reactive Resume CV System — TODO

## Server Status
- **Primary**: 192.168.0.178:3000 (old server, systemd, Node.js)
- **Docker**: 192.168.0.248:3000 (new server, Docker Compose)
- **RSS Server**: 192.168.0.178:9099 (LinkedIn + JobServe feeds)

## Completed
- [x] AI connection test works (structured outputs removed from OpenRouter calls)
- [x] AI tailor works (customPrompt from localStorage, JSON.parse from text)
- [x] Job card source badges (lime green = JobServe, sky blue = LinkedIn)
- [x] Manual job injection API (pink badge, `🩷` prefix)
- [x] LinkedIn scraper + RSS feed (every 6h)
- [x] JobServe RSS proxy
- [x] Dual RSS inputs in integrations (JobServe URL + LinkedIn URL)

## To Do

### RSS Feed Integration (UI)
- [ ] Separate "Test Connection" buttons for JobServe RSS and LinkedIn RSS (current shared button fails because it sends both URLs together)
- [ ] Test buttons should show individual success/failure per feed
- [ ] Source filter dropdown (Both Feeds / JobServe / LinkedIn) in search filters UI
- [ ] GB default country in filter-helpers.ts

### Resume Analysis (Docker only)
- [ ] Apply structured outputs fix to Docker build (same as old server's ai.ts patches)
- [ ] Wire up `customPrompt` from localStorage → tailor dialog → AI service
- [ ] Rebuild Docker image with all patches in one shot

### Career Evidence Cards
- [ ] Restore job-detail resource cards (Prompt + Career Data editing per job)
- [ ] Career evidence matching (experience cards with keyword match against job description)
- [ ] Match score calculation

### Docker Stabilization
- [ ] Figure out why Docker build takes >120s (VPN? RAM? Network?)
- [ ] Create a fast deploy script that applies patches sans full rebuild
- [ ] Consider running RR directly on host instead of Docker if builds are too slow

### Next Steps
1. Add per-feed test buttons to integrations page
2. Rebuild old server .output with RSS source patches
3. Get Docker stable for production use
