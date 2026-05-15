# CV Interview Tailor Skill

Interview the user through their donor CV experience, 
then tailor and inject a CV for a target job.

## Workflow

### Step 1: Read Inputs
- Read the donor CV JSON from `/opt/pi.dev/cvs/CV_Russell_Batchelor_IT_Ops_Manager_FINAL_v2.json`
- Get the job description from the user

### Step 2: Interview — For Each Experience Block
Use the `interview` tool to present each experience block to the user.
Do NOT show hidden experiences (Collective IP is hidden).

For each visible experience entry, present a question:

**Question format (single choice):**
- "Include in tailored CV?" → Yes / No / Partial
- If Yes or Partial, show: "Key bullet points to use (select or describe):"
  Present the existing bullets as checkboxes, plus a free text field for additions
- "Any edits or additional context?"

### Step 3: Interview — Skills & Certifications
- "Which skills to highlight for this role?" — multi-select from existing skills
- "Rate alignment — any flexibility needed?"
- "Certifications to feature?"

### Step 4: Tailor the CV
Using the interview responses, build a tailored CV JSON:

1. **Headline**: Match target role seniority. Format: `[Role Title] | [Key Skill 1] | [Key Skill 2] | [Sectors] | [Clearances]`
2. **Summary**: Hands-on operator framing, mention sectors, clearance, availability
3. **Experience bullets**: Only include selected/relevant blocks. Keep quantified metrics. No `<p>` inside `<li>`.
4. **Skills**: Reorder to put JD-relevant skills first
5. **Rate**: Adjust for target range
6. **Career Outcomes**: Reorder by relevance

### Step 5: Validate
Run: `bash /opt/pi.dev/scripts/validate.sh <file>`

### Step 6: Inject
Run: `bash /opt/pi.dev/scripts/inject.sh <file>`

### Step 7: Export Markdown
Run: `python3 /opt/pi.dev/linkedin-feed/json2md.py <file> -o <output>.md`

## Critical Rules
- NO `<p>` inside `<li>` elements (breaks DOCX rendering)
- All skills must have `hidden: false` for ATS
- Section `columns` must be correct: skills=2, certifications=3
- Rate must be flexible/aligned with JD range
- Recent roles need strongest quantified metrics
- Use flat HTML: `<li>text</li>` never `<li><p>text</p></li>`
- Collective IP is hidden — its content is merged into Hiloka

## Donor CV Key Stats
- Name: Russell Batchelor
- Clearance: SC (Active), NPPV3 (Active)
- Vehicle: Hiloka Limited (sole director)
- Range: £550-650/day (flexible)
- 25+ years IT operations, JML at scale, service delivery

## Available Experience Blocks
1. Atos — NHS Windows 11 rollout, 5K staff, ServiceNow
2. Hiloka Limited — Advisory + PE £20M + Ops lead
3. Gaming/HFT Group — 24 engineers, 1,200 endpoints, country ops director
4. CentricsIT/PPT — EMEA ops director, 15+ programmes, 7K endpoints
5. Sitehands — 3.5K JML payments, 25K global Anon, Wi-Fi 25K endpoints
6. Rainmaker — Home Office 42K, MHCLG 4K, Ofsted 1K, FSA 2K, PINS 1K, Direct Line 5K
7. Lambeth — 2K users O365, 60% WAN saving, £12M re-tender
