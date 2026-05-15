#!/usr/bin/env python3
"""Re-apply verified working patches to Reactive Resume source."""

# 1. FILTER-HELPERS.TS - GB default + jobSource
with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/filter-helpers.ts") as f:
    c = f.read()

c = c.replace('countryCode: "US"', 'countryCode: "GB"')

old = "  directApplyOnly: boolean;\n};"
new = "  directApplyOnly: boolean;\n  jobSource: string;\n};"
c = c.replace(old, new)

c = c.replace("  directApplyOnly: false,\n};", '  directApplyOnly: false,\n  jobSource: "all",\n};')

old2 = "    filters.directApplyOnly\n  );"
new2 = "    filters.directApplyOnly ||\n    filters.jobSource !== \"all\"\n  );"
c = c.replace(old2, new2)

with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/filter-helpers.ts", "w") as f:
    f.write(c)
print("1. filter-helpers.ts: OK")

# 2. SEARCH-FILTERS.TSX - source dropdown
with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/search-filters.tsx") as f:
    c = f.read()

# Add source options after experience options
c = c.replace(
    "const experienceOptions = [",
    'const jobSourceOptions = [\n  { value: "all", label: msg`Both Feeds` },\n  { value: "jobserve", label: msg`JobServe` },\n  { value: "linkedin", label: msg`LinkedIn` },\n] as const;\n\nconst experienceOptions = ['
)

# Add useMemo for source
c = c.replace(
    "  const _experienceOptions = useMemo(() => {",
    '  const _jobSourceOptions = useMemo(() => {\n    return jobSourceOptions.map((option) => ({\n      value: option.value,\n      label: i18n.t(option.label),\n    }));\n  }, [i18n.locale]);\n\n  const _experienceOptions = useMemo(() => {'
)

# Add source dropdown in JSX after Experience
c = c.replace(
    '        <div className="grid gap-1.5">\n          <Label className="text-xs text-muted-foreground">\n            <Trans>Country</Trans>\n          </Label>',
    '        <div className="grid gap-1.5">\n          <Label className="text-xs text-muted-foreground">\n            <Trans>Source</Trans>\n          </Label>\n          <Combobox\n            options={_jobSourceOptions}\n            value={filters.jobSource}\n            onValueChange={(v) => updateFilter("jobSource", v ?? "all")}\n            placeholder={t`Both Feeds`}\n            className="h-9 w-[140px] text-sm"\n          />\n        </div>\n\n        <div className="grid gap-1.5">\n          <Label className="text-xs text-muted-foreground">\n            <Trans>Country</Trans>\n          </Label>'
)

with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/search-filters.tsx", "w") as f:
    f.write(c)
print("2. search-filters.tsx: OK")

# 3. USE-JOB-SEARCH.TS - filter URLs by source
with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/use-job-search.ts") as f:
    c = f.read()

c = c.replace(
    '      const rssUrl = jobServeRssUrl.trim() || undefined;\n      const linkedInUrl = linkedInRssUrl.trim() || undefined;',
    '      const source = filters.jobSource || "all";\n      const rssUrl = source !== "linkedin" ? (jobServeRssUrl.trim() || undefined) : undefined;\n      const linkedInUrl = source !== "jobserve" ? (linkedInRssUrl.trim() || undefined) : undefined;'
)

with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/use-job-search.ts", "w") as f:
    f.write(c)
print("3. use-job-search.ts: OK")

# 4. JOB-CARD.TSX - colored source badge
with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx") as f:
    c = f.read()

c = c.replace(
    '          <p className="truncate text-sm text-muted-foreground">{job.employer_name}</p>',
    '          <p className="truncate text-sm text-muted-foreground">{job.employer_name}</p>\n          {job.job_publisher && (\n            <span\n              className={`mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${\n                job.job_publisher === "JobServe RSS"\n                  ? "bg-lime-50 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400"\n                  : "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400"\n              }`}\n            >\n              {job.job_publisher === "JobServe RSS" ? "JobServe" : "LinkedIn"}\n            </span>\n          )}'
)

with open("/opt/reactive-resume/src/routes/dashboard/job-search/-components/job-card.tsx", "w") as f:
    f.write(c)
print("4. job-card.tsx: OK")

print("\nAll done!")
