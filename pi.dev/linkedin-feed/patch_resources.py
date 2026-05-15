#!/usr/bin/env python3
"""Replace Career Evidence section by line numbers."""
p = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-detail.tsx"

with open(p) as f:
    lines = f.readlines()

# Find the Career Evidence section by searching for the comment marker
start = None
end = None
for i, line in enumerate(lines):
    if "Career Evidence Cards" in line and "/*" in line:
        start = i
    if start is not None and i > start and "</div>" in line and i > start + 25:
        end = i + 1  # include this closing div
        break

if start is None or end is None:
    print("ERROR: could not find Career Evidence section")
    exit(1)

print(f"Found section at lines {start+1}-{end}")

new_lines = [
    '              {/* Resource Cards */}\n',
    '              <div className="flex flex-col gap-y-2">\n',
    '                <h4 className="font-medium flex items-center gap-1.5">\n',
    '                  <MedalIcon className="size-4" />\n',
    '                  <Trans>Resources</Trans>\n',
    '                </h4>\n',
    '                <div className="grid grid-cols-3 gap-2">\n',
    '                  <div className="rounded-md border bg-card p-2 text-center cursor-pointer hover:bg-accent/50" onClick={() => window.open("/builder/019de315-ba6f-73fa-926b-9c7c13e8847b", "_blank")}>\n',
    '                    <p className="text-[10px] font-medium">Donor CV</p>\n',
    '                    <p className="text-[8px] text-muted-foreground mt-0.5">Source data</p>\n',
    '                  </div>\n',
    '                  <div className="rounded-md border bg-card p-2 text-center cursor-pointer hover:bg-accent/50" onClick={() => navigator.clipboard.writeText("MASTER_CAREER_DATA.md available at /opt/pi.dev/cvs/MASTER_CAREER_DATA.md")}>\n',
    '                    <p className="text-[10px] font-medium">Career Data</p>\n',
    '                    <p className="text-[8px] text-muted-foreground mt-0.5">Full records</p>\n',
    '                  </div>\n',
    '                  <div className="rounded-md border bg-card p-2 text-center cursor-pointer hover:bg-accent/50" onClick={() => navigator.clipboard.writeText("Elite CV Tailor Prompt - see /opt/pi.dev/skills/elite-tailor-prompt.md")}>\n',
    '                    <p className="text-[10px] font-medium">Prompt</p>\n',
    '                    <p className="text-[8px] text-muted-foreground mt-0.5">Tailor rules</p>\n',
    '                  </div>\n',
    '                </div>\n',
    '              </div>\n',
    '\n',
    '              {/* Matching Experience Cards */}\n',
    '              <div className="flex flex-col gap-y-2">\n',
    '                <div className="flex items-center justify-between">\n',
    '                  <h4 className="font-medium flex items-center gap-1.5">\n',
    '                    <MedalIcon className="size-4" />\n',
    '                    <Trans>Matching Experience</Trans>\n',
    '                  </h4>\n',
    '                  {evidenceLoading && <span className="text-xs text-muted-foreground">Scanning...</span>}\n',
    '                </div>\n',
    '                <div className="flex flex-col gap-2">\n',
    '                  {evidenceCards.length === 0 && !evidenceLoading && (\n',
    '                    <p className="text-xs text-muted-foreground">No matching career evidence found for this job.</p>\n',
    '                  )}\n',
    '                  {evidenceCards.slice(0, 3).map((card) => (\n',
    '                    <div key={card.id} className="rounded-md border bg-card p-2.5">\n',
    '                      <div className="flex items-start justify-between gap-2">\n',
    '                        <div className="min-w-0">\n',
    '                          <p className="text-xs font-medium leading-tight">{card.title}</p>\n',
    '                          <p className="text-[10px] text-muted-foreground">{card.source}</p>\n',
    '                        </div>\n',
    '                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">\n',
    '                          {card.category}\n',
    '                        </span>\n',
    '                      </div>\n',
    '                      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{card.metric}</p>\n',
    '                    </div>\n',
    '                  ))}\n',
    '                </div>\n',
    '              </div>\n',
    '\n',
    '              <Separator />\n',
]

lines[start:end] = new_lines

with open(p, "w") as f:
    f.writelines(lines)

print(f"OK: replaced {end-start} lines with resource + matching experience cards")
