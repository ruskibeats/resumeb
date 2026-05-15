#!/usr/bin/env python3
"""Create JobResourceCards.tsx component with editable Prompt + Master Data dialogs."""
import os

# The React component file content
component = """import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FileTextIcon, MedalIcon, NotePencilIcon, PencilSimpleLineIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// ─── Default Master Prompt ───

const DEFAULT_PROMPT = `You are an Elite Executive CV Writer, ATS Optimization Specialist, and Technical Search Consultant.

Your goal is to forensicly map the candidate's highest-scale achievements to the target Job Description (JD) while strictly adhering to 2026 ATS parsing rules.

## Critical Rules

**Source of Truth:** Treat MASTER_CAREER_DATA as the absolute source for dates, metrics and titles.
**Concurrent Contracts:** Label overlapping engagements with "(Concurrent)".
**Ruthless Filtering:** Select the highest-scale proof per JD requirement. Use metrics over adjectives.
**ATS Design:** No tables, no columns, no emdashes, no smart quotes. Standard bullet points only.
**Voice:** Active, implied first-person. "Led...", "Directed...", "Governed..."
**Date Format:** Strict Month YYYY - Month YYYY. Current roles end with "Present".`;

// ─── Helpers ───

function getPromptKey(jobId: string) {
  return `cv-prompt-${jobId}`;
}

function getMasterKey(jobId: string) {
  return `cv-master-${jobId}`;
}

function loadPrompt(jobId: string): string {
  try {
    return localStorage.getItem(getPromptKey(jobId)) || DEFAULT_PROMPT;
  } catch {
    return DEFAULT_PROMPT;
  }
}

function savePrompt(jobId: string, value: string) {
  try {
    localStorage.setItem(getPromptKey(jobId), value);
  } catch { /* storage full */ }
}

function loadMasterData(jobId: string): string {
  try {
    const stored = localStorage.getItem(getMasterKey(jobId));
    if (stored) return stored;
  } catch { /* ignore */ }
  return "MASTER_CAREER_DATA.md loaded from /opt/pi.dev/cvs/MASTER_CAREER_DATA.md\\n\\nLoad the file to see full career data.";
}

function saveMasterData(jobId: string, value: string) {
  try {
    localStorage.setItem(getMasterKey(jobId), value);
  } catch { /* storage full */ }
}

// ─── Components ───

type Props = {
  jobId: string;
};

export function JobResourceCards({ jobId }: Props) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const [promptText, setPromptText] = useState("");

  // Load prompt when dialog opens
  const handleOpenPrompt = useCallback(() => {
    setPromptText(loadPrompt(jobId));
    setPromptOpen(true);
  }, [jobId]);

  const handleSavePrompt = () => {
    savePrompt(jobId, promptText);
    setPromptOpen(false);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {/* Prompt Card */}
        <button
          type="button"
          className="group relative rounded-md border bg-card p-2 text-center transition-colors hover:bg-accent/50"
          onClick={handleOpenPrompt}
          title="Edit the tailoring prompt for this job"
        >
          <NotePencilIcon className="mx-auto size-4 text-muted-foreground group-hover:text-foreground" />
          <p className="mt-1 text-[10px] font-medium leading-tight">Prompt</p>
          <p className="text-[8px] text-muted-foreground">Tailor rules</p>
        </button>

        {/* Master Data Card */}
        <button
          type="button"
          className="group relative rounded-md border bg-card p-2 text-center transition-colors hover:bg-accent/50"
          onClick={() => setMasterOpen(true)}
          title="Edit career data used for matching"
        >
          <PencilSimpleLineIcon className="mx-auto size-4 text-muted-foreground group-hover:text-foreground" />
          <p className="mt-1 text-[10px] font-medium leading-tight">Career Data</p>
          <p className="text-[8px] text-muted-foreground">Full records</p>
        </button>

        {/* Donor CV Card */}
        <button
          type="button"
          className="group relative rounded-md border bg-card p-2 text-center transition-colors hover:bg-accent/50"
          onClick={() => window.open("/builder/019de315-ba6f-73fa-926b-9c7c13e8847b", "_blank")}
          title="Open your donor CV in the builder"
        >
          <FileTextIcon className="mx-auto size-4 text-muted-foreground group-hover:text-foreground" />
          <p className="mt-1 text-[10px] font-medium leading-tight">Donor CV</p>
          <p className="text-[8px] text-muted-foreground">Source data</p>
        </button>
      </div>

      {/* Prompt Edit Dialog */}
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Edit Tailor Prompt</Trans>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label className="text-xs text-muted-foreground">
              <Trans>Changes saved per job. Default prompt restored if cleared.</Trans>
            </Label>
            <textarea
              className="h-[400px] w-full rounded-md border bg-transparent p-3 font-mono text-xs leading-relaxed"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPromptOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button
              variant="outline"
              onClick={() => setPromptText(DEFAULT_PROMPT)}
            >
              <Trans>Reset to Default</Trans>
            </Button>
            <Button onClick={handleSavePrompt}>
              <Trans>Save Changes</Trans>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Master Data Edit Dialog */}
      <Dialog open={masterOpen} onOpenChange={setMasterOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <Trans>Edit Career Data</Trans>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label className="text-xs text-muted-foreground">
              <Trans>Edit the career data used for evidence matching against this job. Changes saved per role.</Trans>
            </Label>
            <textarea
              className="h-[400px] w-full rounded-md border bg-transparent p-3 font-mono text-xs leading-relaxed"
              value={loadMasterData(jobId)}
              onChange={(e) => saveMasterData(jobId, e.target.value)}
              placeholder="Paste your MASTER_CAREER_DATA content here..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMasterOpen(false)}>
              <Trans>Close</Trans>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                try { localStorage.removeItem(getMasterKey(jobId)); } catch { /* */ }
                setMasterOpen(false);
              }}
            >
              <Trans>Reset to Default</Trans>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
"""

# Write to pi.dev
path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-resource-cards.tsx"

# Use a temp file approach
import subprocess
proc = subprocess.run(
    ["ssh", "root@192.168.0.178", f"cat > {path} << 'COMPEOF'\n{component}\nCOMPEOF"],
    capture_output=True, text=True, timeout=10
)
print(proc.stdout or proc.stderr)

# Quick test - list the new file
proc = subprocess.run(
    ["ssh", "root@192.168.0.178", f"wc -l {path}"],
    capture_output=True, text=True, timeout=5
)
print(proc.stdout or proc.stderr)
