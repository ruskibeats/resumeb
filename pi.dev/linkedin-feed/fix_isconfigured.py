#!/usr/bin/env python3
"""Fix use-job-search.ts to use RSS feeds instead of JSearch API key."""
path = "/opt/reactive-resume/src/routes/dashboard/job-search/-components/use-job-search.ts"

with open(path) as f:
    c = f.read()

old = """export function useJobSearch() {
  const rapidApiKey = useJobsStore((state) => state.rapidApiKey);
  const testStatus = useJobsStore((state) => state.testStatus);
  const setJobsStore = useJobsStore((state) => state.set);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [quota, setQuota] = useState<RapidApiQuota | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const { mutate: searchJobs, isPending } = useMutation(orpc.jobs.search.mutationOptions());

  const isConfigured = Boolean(rapidApiKey && testStatus === "success");

  const executeSearch = useCallback(
    (page: number) => {
      if (!rapidApiKey) return;

      const requestId = ++requestIdRef.current;
      const effectiveQuery = query.trim() || "jobs";
      const params = buildSearchParams(effectiveQuery, filters, page);
      const postFilters = buildPostFilters(filters);
      setError(null);

      searchJobs(
        { apiKey: rapidApiKey, params, filters: postFilters },
        {
          onSuccess: (data) => {
            if (requestId !== requestIdRef.current) return;

            setHasMore(data.data.length >= RESULTS_PER_PAGE);
            setJobs(data.data.slice(0, RESULTS_PER_PAGE));
            setQuota(data.rapidApiQuota ?? null);

            const rapidApiQuota = data.rapidApiQuota;
            if (rapidApiQuota) {
              setJobsStore((draft) => {
                draft.rapidApiQuota = rapidApiQuota;
              });
            }

            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
          },
          onError: (error) => {
            if (requestId !== requestIdRef.current) return;
            const message = getOrpcErrorMessage(error, {
              byCode: {
                BAD_GATEWAY: t({
                  comment: "Error shown when job search API is unavailable while searching jobs",
                  message: "Could not fetch jobs from JSearch API. Please try again.",
                }),
              },
              fallback: t({
                comment: "Fallback error shown when job search request fails",
                message: "Failed to search jobs. Please try again.",
              }),
            });

            setError(message);
            toast.error(message);
          },
        },
      );
    },
    [filters, query, rapidApiKey, searchJobs, setJobsStore],
  );"""

new = """export function useJobSearch() {
  const jobServeRssUrl = useJobsStore((state) => state.jobServeRssUrl);
  const linkedInRssUrl = useJobsStore((state) => state.linkedInRssUrl);
  const setJobsStore = useJobsStore((state) => state.set);

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(initialFilterState);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [quota, setQuota] = useState<RapidApiQuota | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const { mutate: searchJobs, isPending } = useMutation(orpc.jobs.search.mutationOptions());

  const isConfigured = Boolean(jobServeRssUrl.trim() || linkedInRssUrl.trim());

  const executeSearch = useCallback(
    (page: number) => {
      if (!isConfigured) return;

      const requestId = ++requestIdRef.current;
      const effectiveQuery = query.trim() || "*";
      const params = buildSearchParams(effectiveQuery, filters, page);
      const postFilters = buildPostFilters(filters);
      setError(null);

      const source = filters.jobSource || "all";
      const rssUrl = source !== "linkedin" ? (jobServeRssUrl.trim() || undefined) : undefined;
      const linkedInUrl = source !== "jobserve" ? (linkedInRssUrl.trim() || undefined) : undefined;

      searchJobs(
        {
          apiKey: "",
          provider: "jobserve-rss",
          rssUrl,
          linkedInRssUrl: linkedInUrl,
          params,
          filters: postFilters,
        },
        {
          onSuccess: (data) => {
            if (requestId !== requestIdRef.current) return;

            setHasMore(data.data.length >= RESULTS_PER_PAGE);
            setJobs(data.data.slice(0, RESULTS_PER_PAGE));
            setQuota(data.rapidApiQuota ?? null);

            const rapidApiQuota = data.rapidApiQuota;
            if (rapidApiQuota) {
              setJobsStore((draft) => {
                draft.rapidApiQuota = rapidApiQuota;
              });
            }

            scrollRef.current?.scrollIntoView({ behavior: "smooth" });
          },
          onError: (error) => {
            if (requestId !== requestIdRef.current) return;
            const message = getOrpcErrorMessage(error, {
              byCode: {
                BAD_GATEWAY: t({
                  comment: "Error shown when job search API is unavailable while searching jobs",
                  message: "Could not fetch jobs from the selected job source. Please try again.",
                }),
              },
              fallback: t({
                comment: "Fallback error shown when job search request fails",
                message: "Failed to search jobs. Please try again.",
              }),
            });

            setError(message);
            toast.error(message);
          },
        },
      );
    },
    [filters, isConfigured, jobServeRssUrl, linkedInRssUrl, query, searchJobs, setJobsStore],
  );"""

if old in c:
    c = c.replace(old, new)
    with open(path, "w") as f:
        f.write(c)
    print("OK: use-job-search.ts fixed for RSS")
else:
    print("ERROR: Pattern not found!")
    # Find what's actually there
    idx = c.find("export function useJobSearch()")
    if idx > -1:
        print(c[idx:idx+200])
