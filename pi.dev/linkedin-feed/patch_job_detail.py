#!/usr/bin/env python3
"""Add career evidence cards to job-detail.tsx."""
import re

path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-detail.tsx"

with open(path) as f:
    c = f.read()

# Add evidence imports after existing imports
old_imports = 'import { ArrowSquareOutIcon, BriefcaseIcon, BuildingsIcon, ClockIcon, GlobeIcon, MapPinIcon, MoneyIcon, StarIcon } from "@phosphor-icons/react";'
new_imports = 'import { ArrowSquareOutIcon, BriefcaseIcon, BuildingsIcon, ClockIcon, GlobeIcon, MapPinIcon, MoneyIcon, StarIcon, TrophyIcon } from "@phosphor-icons/react";\nimport { useEffect, useState } from "react";\ntype CareerEvidence = { id: string; category: string; title: string; source: string; period: string; metric: string; scale: string; keywords: string[] };'
c = c.replace(old_imports, new_imports)

# Add evidence fetch + cards after the badges section and before the action buttons
old_section = """              <div className="flex gap-x-2">
                {hasApplyLink ? (
                  <Button
                    className="flex-1"
                    nativeButton={false}
                    render={
                      <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer">
                        <span className="sr-only">
                          <Trans>Apply for this job</Trans>
                        </span>
                      </a>
                    }
                  >
                    <ArrowSquareOutIcon />
                    <Trans>Apply</Trans>
                  </Button>
                ) : (
                  <Button className="flex-1" disabled>
                    <ArrowSquareOutIcon />
                    <Trans>Apply</Trans>
                  </Button>
                )}

                <Button variant="outline" className="flex-1" onClick={() => setTailorOpen(true)}>
                  <StarIcon />
                  <Trans>Tailor Resume</Trans>
                </Button>
              </div>"""

new_section = """              {/* Career Evidence Cards */}
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-1.5">
                    <TrophyIcon className="size-4" />
                    <Trans>Career Evidence</Trans>
                  </h4>
                  {evidenceLoading && <span className="text-xs text-muted-foreground">Loading...</span>}
                </div>
                <div className="flex flex-col gap-2">
                  {evidenceCards.length === 0 && !evidenceLoading && (
                    <p className="text-xs text-muted-foreground">No matching career evidence found.</p>
                  )}
                  {evidenceCards.slice(0, 3).map((card) => (
                    <div key={card.id} className="rounded-md border bg-card p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight">{card.title}</p>
                          <p className="text-[10px] text-muted-foreground">{card.source}</p>
                        </div>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {card.category}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{card.metric}</p>
                      <p className="text-[9px] leading-tight text-muted-foreground/70">{card.scale}</p>
                    </div>
                  ))}
                  {evidenceCards.length > 3 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setShowAllEvidence(!showAllEvidence)}
                    >
                      {showAllEvidence ? "Show less" : `Show all ${evidenceCards.length} matches`}
                    </button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex gap-x-2">
                {hasApplyLink ? (
                  <Button
                    className="flex-1"
                    nativeButton={false}
                    render={
                      <a href={job.job_apply_link} target="_blank" rel="noopener noreferrer">
                        <span className="sr-only">
                          <Trans>Apply for this job</Trans>
                        </span>
                      </a>
                    }
                  >
                    <ArrowSquareOutIcon />
                    <Trans>Apply</Trans>
                  </Button>
                ) : (
                  <Button className="flex-1" disabled>
                    <ArrowSquareOutIcon />
                    <Trans>Apply</Trans>
                  </Button>
                )}

                <Button variant="outline" className="flex-1" onClick={() => setTailorOpen(true)}>
                  <StarIcon />
                  <Trans>Tailor Resume</Trans>
                </Button>
              </div>"""

c = c.replace(old_section, new_section)

# Add state and fetch logic inside the component
old_state = """  const [tailorOpen, setTailorOpen] = useState(false);"""
new_state = """  const [tailorOpen, setTailorOpen] = useState(false);
  const [evidenceCards, setEvidenceCards] = useState<CareerEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [showAllEvidence, setShowAllEvidence] = useState(false);

  useEffect(() => {
    if (!open || !job) return;
    setEvidenceCards([]);
    setEvidenceLoading(true);
    const query = (job.job_title + " " + (job.job_description || "")).slice(0, 500);
    fetch("http://192.168.0.178:9099/api/career-evidence?q=" + encodeURIComponent(query))
      .then((r) => r.json())
      .then((data) => setEvidenceCards(data.cards || []))
      .catch(() => setEvidenceCards([]))
      .finally(() => setEvidenceLoading(false));
  }, [open, job]);"""

c = c.replace(old_state, new_state)

with open(path, "w") as f:
    f.write(c)

print("OK: career evidence cards added to job-detail.tsx")
