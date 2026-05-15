#!/usr/bin/env python3
"""Add seen toggle to job cards + manual job injection."""
import re

# The Tailwind colors I'll use: 
# - JobServe: lime green (#84cc16)
# - LinkedIn: sky/blue (#0ea5e9)
# - Seen eye icon: amber/eye-slash

# ============================================================
# 1. USE-JOB-SEARCH.TS - add seen state + manual jobs
# ============================================================
path1 = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/use-job-search.ts"

with open(path1) as f:
    c = f.read()

# Add seenJobs to the return
old_return = """  return {
    activeFilterChips,
    currentPage,
    error,
    executeSearch,
    filters,
    handleJobClick,
    handlePageChange,
    handleSearch,
    hasMore,
    hasSearched,
    isConfigured,
    isPending,
    jobs,
    query,
    quota,
    removeFilter,
    scrollRef,
    selectedJob,
    setFilters,
    setQuery,
    setSheetOpen,
    sheetOpen,
  };"""

new_return = """  // --- Seen jobs state (localStorage) ---
  const [seenIds, setSeenIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("job-seen") || "[]"); }
    catch { return []; }
  });

  const toggleSeen = (jobId: string) => {
    setSeenIds((prev: string[]) => {
      const next = prev.includes(jobId) ? prev.filter((id: string) => id !== jobId) : [...prev, jobId];
      localStorage.setItem("job-seen", JSON.stringify(next));
      return next;
    });
  };

  // --- Manual jobs ---
  const [manualJobs, setManualJobs] = useState<JobResult[]>(() => {
    try { return JSON.parse(localStorage.getItem("job-manual") || "[]"); }
    catch { return []; }
  });

  const addManualJob = (job: JobResult) => {
    setManualJobs((prev: JobResult[]) => {
      const next = [job, ...prev];
      localStorage.setItem("job-manual", JSON.stringify(next));
      return next;
    });
  };

  const removeManualJob = (jobId: string) => {
    setManualJobs((prev: JobResult[]) => {
      const next = prev.filter((j: JobResult) => j.job_id !== jobId);
      localStorage.setItem("job-manual", JSON.stringify(next));
      return next;
    });
  };

  // Merge and sort: seen jobs go to bottom
  const mergedJobs = useMemo(() => {
    const all = [...manualJobs, ...jobs];
    return all.sort((a: JobResult, b: JobResult) => {
      const aSeen = seenIds.includes(a.job_id);
      const bSeen = seenIds.includes(b.job_id);
      if (aSeen && !bSeen) return 1;
      if (!aSeen && bSeen) return -1;
      return 0;
    });
  }, [jobs, manualJobs, seenIds]);

  return {
    activeFilterChips,
    currentPage,
    error,
    executeSearch,
    filters,
    handleJobClick,
    handlePageChange,
    handleSearch,
    hasMore,
    hasSearched,
    isConfigured,
    isPending,
    jobs: mergedJobs,
    query,
    quota,
    removeFilter,
    scrollRef,
    selectedJob,
    setFilters,
    setQuery,
    setSheetOpen,
    sheetOpen,
    seenIds,
    toggleSeen,
    addManualJob,
    removeManualJob,
    manualJobs,
  };"""

c = c.replace(old_return, new_return)

# Add imports needed
c = c.replace(
    'import { useMutation } from "@tanstack/react-query";',
    'import { useMutation } from "@tanstack/react-query";\nimport { useMemo } from "react";'
)
# Check if useMemo is already imported
if "useMemo" not in c[:c.find("import { useMutation")]:
    # Already added
    pass

with open(path1, "w") as f:
    f.write(c)
print("1. use-job-search.ts: seen tracking + manual jobs")

# ============================================================
# 2. JOB-CARD.TSX - add eye icon for seen toggle
# ============================================================
path2 = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx"

with open(path2) as f:
    c = f.read()

# Add EyeIcon import
c = c.replace(
    'import { BriefcaseIcon, BuildingsIcon, ClockIcon, GlobeIcon, MapPinIcon, MoneyIcon } from "@phosphor-icons/react";',
    'import { BriefcaseIcon, BuildingsIcon, ClockIcon, EyeIcon, EyeSlashIcon, GlobeIcon, MapPinIcon, MoneyIcon } from "@phosphor-icons/react";'
)

# Add seen toggle to the card - add before the closing </motion.button>
# Find the closing of the div and button
old_close = """      </div>
    </motion.button>"""

new_close = """      </div>

      <div className="absolute right-2 top-2 flex gap-1">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full transition-colors hover:bg-muted"
          onClick={(e) => { e.stopPropagation(); job.onToggleSeen?.(job.job_id); }}
          title={job.seen ? "Mark as unseen" : "Mark as seen"}
        >
          {job.seen ? (
            <EyeSlashIcon className="size-4 text-muted-foreground" />
          ) : (
            <EyeIcon className="size-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </motion.button>"""

c = c.replace(old_close, new_close)

# Update the Props type to include onToggleSeen and seen
old_type = """type Props = {
  job: JobResult;
  onClick: () => void;
};"""

new_type = """type Props = {
  job: JobResult & { seen?: boolean; onToggleSeen?: (id: string) => void };
  onClick: () => void;
};"""

c = c.replace(old_type, new_type)

with open(path2, "w") as f:
    f.write(c)
print("2. job-card.tsx: eye icon added")

# ============================================================
# 3. INDEX.TSX - pass seen/toggle to cards + manual add button
# ============================================================
path3 = "/opt/reactive-resume/src/routes/dashboard/job-search/index.tsx"

with open(path3) as f:
    c = f.read()

# Add imports for manual job dialog
c = c.replace(
    'import { BriefcaseIcon,',
    'import { BriefcaseIcon, PlusIcon,'
)

# Update destructuring to include new props
old_dest = """  const {
    activeFilterChips,
    currentPage,
    error,
    executeSearch,
    filters,
    handleJobClick,
    handlePageChange,
    handleSearch,
    hasMore,
    hasSearched,
    isConfigured,
    isPending,
    jobs,
    query,
    quota,
    removeFilter,
    scrollRef,
    selectedJob,
    setFilters,
    setQuery,
    setSheetOpen,
    sheetOpen,
  } = useJobSearch();"""

new_dest = """  const {
    activeFilterChips,
    currentPage,
    error,
    executeSearch,
    filters,
    handleJobClick,
    handlePageChange,
    handleSearch,
    hasMore,
    hasSearched,
    isConfigured,
    isPending,
    jobs,
    query,
    quota,
    removeFilter,
    scrollRef,
    selectedJob,
    setFilters,
    setQuery,
    setSheetOpen,
    sheetOpen,
    seenIds,
    toggleSeen,
    addManualJob,
  } = useJobSearch();

  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualDesc, setManualDesc] = useState("");

  const handleAddManual = () => {
    if (!manualTitle.trim()) return;
    addManualJob({
      job_id: "manual-" + Date.now(),
      job_title: manualTitle.trim(),
      employer_name: manualCompany.trim() || "Manual Entry",
      employer_logo: null,
      employer_website: null,
      employer_company_type: null,
      employer_linkedin: null,
      job_publisher: "Manual Entry",
      job_employment_type: null,
      job_apply_link: manualUrl.trim() || null,
      job_apply_is_direct: false,
      job_apply_quality_score: null,
      job_description: manualDesc.trim() || null,
      job_is_remote: false,
      job_city: null,
      job_state: null,
      job_country: null,
      job_latitude: null,
      job_longitude: null,
      job_posted_at_timestamp: Math.floor(Date.now() / 1000),
      job_posted_at_datetime_utc: new Date().toISOString(),
      job_offer_expiration_datetime_utc: null,
      job_offer_expiration_timestamp: null,
      job_min_salary: null,
      job_max_salary: null,
      job_salary_currency: null,
      job_salary_period: null,
      job_benefits: null,
      job_google_link: null,
      job_required_experience: {
        no_experience_required: false,
        required_experience_in_months: null,
        experience_mentioned: false,
        experience_preferred: false,
      },
      job_required_skills: null,
      job_required_education: {
        postgraduate_degree: false,
        professional_certification: false,
        high_school: false,
        associates_degree: false,
        bachelors_degree: false,
        degree_mentioned: false,
        degree_preferred: false,
        professional_certification_mentioned: false,
      },
      job_experience_in_place_of_education: null,
      job_highlights: null,
      job_posting_language: null,
      job_onet_soc: null,
      job_onet_job_zone: null,
      job_occupational_categories: null,
      job_naics_code: null,
      job_naics_name: null,
      apply_options: manualUrl.trim()
        ? [{ publisher: "Manual", apply_link: manualUrl.trim(), is_direct: true }]
        : [],
    });
    setManualTitle("");
    setManualCompany("");
    setManualUrl("");
    setManualDesc("");
    setManualDialogOpen(false);
  };"""

c = c.replace(old_dest, new_dest)

# Add useState import if not already
if "useState" not in c[:c.find("function RouteComponent")]:
    c = c.replace(
        "import { useMemo } from \"react\";" if "useMemo" in c else "import {",
        "import { useMemo, useState } from \"react\";"
    )

# Update JobCard to pass seen/toggle props
old_card = """                  <JobCard key={job.job_id} job={job} onClick={() => handleJobClick(job)} />"""

new_card = """                  <JobCard key={job.job_id} job={{ ...job, seen: seenIds.includes(job.job_id), onToggleSeen: toggleSeen }} onClick={() => handleJobClick(job)} />"""

c = c.replace(old_card, new_card)

# Add manual add button near the search form
old_form = """          <form onSubmit={handleSearch} className="flex items-end gap-x-3\">"""

new_form = """          <div className="flex items-end gap-x-2\">
          <form onSubmit={handleSearch} className="flex flex-1 items-end gap-x-3\">"""

c = c.replace(old_form, new_form)

# Add the manual add button after the search form
old_form_end = """            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner /> : <MagnifyingGlassIcon />}
              <Trans>Search</Trans>
            </Button>
          </form>"""

new_form_end = """            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner /> : <MagnifyingGlassIcon />}
              <Trans>Search</Trans>
            </Button>
          </form>

            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setManualDialogOpen(true)} title="Add job manually">
              <PlusIcon className="size-4" />
            </Button>
          </div>"""  # note: closes the outer div

c = c.replace(old_form_end, new_form_end)

# Add the manual job dialog before the closing </div> of the main content
old_closing = """      <JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>"""

manual_dialog = """      <JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />

      {/* Manual Job Dialog */}
      {manualDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setManualDialogOpen(false)}>
          <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">Add Job Manually</h3>
            <div className="grid gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Job Title *</Label>
                <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="e.g. IT Operations Manager" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Company</Label>
                <Input value={manualCompany} onChange={(e) => setManualCompany(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">URL</Label>
                <Input value={manualUrl} onChange={(e) => setManualUrl(e.target.value)} placeholder="https://linkedin.com/jobs/..." />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <textarea
                  className="h-24 w-full rounded-md border bg-transparent p-2 text-sm"
                  value={manualDesc}
                  onChange={(e) => setManualDesc(e.target.value)}
                  placeholder="Paste job description here..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddManual}>Add Job</Button>
            </div>
          </div>
        </div>
      )}

      <JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>"""

c = c.replace(old_closing, manual_dialog.replace("      <JobDetailSheet", ""))

# Fix duplicate closing - remove the extra one that was duplicated
# Actually, looking at my replacement more carefully, the old_closing is:
# "      <JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />
#     </div>"
# And my manual_dialog adds ANOTHER JobDetailSheet. So let me fix that.

# Let me just remove the duplicate
c = c.replace(
    "      <JobDetailSheet job={selectedJob} open={sheetOpen} onOpenChange={setSheetOpen} />\n\n      {/* Manual Job Dialog */}",
    "      {/* Manual Job Dialog */}"
)

with open(path3, "w") as f:
    f.write(c)
print("3. index.tsx: seen passed to cards + manual dialog")

print("\nAll patches applied!")
