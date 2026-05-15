#!/usr/bin/env python3
"""Add manual job endpoint to RSS feed server."""
import re

path = "/opt/pi.dev/linkedin-feed/server.py"

with open(path) as f:
    c = f.read()

# 1. Add MANUAL_FILE constant
c = c.replace(
    'CACHE_FILE = Path(__file__).parent / "jobs_cache.json"',
    'CACHE_FILE = Path(__file__).parent / "jobs_cache.json"\nMANUAL_FILE = Path(__file__).parent / "manual_jobs.json"'
)

# 2. Add load/save manual jobs functions
old = 'def save_jobs(jobs: list):\n    CACHE_FILE.write_text(json.dumps(jobs, indent=2, default=str))'
new = '''def save_jobs(jobs: list):
    CACHE_FILE.write_text(json.dumps(jobs, indent=2, default=str))


def load_manual_jobs() -> list:
    if not MANUAL_FILE.exists():
        return []
    with open(MANUAL_FILE) as f:
        return json.load(f)


def save_manual_jobs(jobs: list):
    MANUAL_FILE.write_text(json.dumps(jobs, indent=2, default=str))'''
c = c.replace(old, new)

# 3. Update load_jobs to merge with manual jobs
old2 = "def load_jobs() -> list:\n    if not CACHE_FILE.exists():\n        return []\n    with open(CACHE_FILE) as f:\n        return json.load(f)"
new2 = "def load_jobs() -> list:\n    manual = load_manual_jobs()\n    cache = []\n    if CACHE_FILE.exists():\n        with open(CACHE_FILE) as f:\n            cache = json.load(f)\n    return manual + cache"
c = c.replace(old2, new2)

# 4. Add manual job endpoint
old3 = "    save_jobs(body)\n    return {\"status\": \"ok\", \"count\": len(body), \"cached_at\": datetime.now(timezone.utc).isoformat()}\n\n\n@app.get(\"/health\")"
new3 = '''    save_jobs(body)
    return {"status": "ok", "count": len(body), "cached_at": datetime.now(timezone.utc).isoformat()}


@app.post("/api/jobs/manual")
async def add_manual_job(request: Request):
    """Add a single job manually. Accepts title, company, url, description."""
    body = await request.json()
    if not isinstance(body, dict):
        return {"error": "body must be a JSON object"}, 400

    job = {
        "title": body.get("title", "Unknown Position"),
        "company": body.get("company", "Manual Entry"),
        "location": body.get("location", ""),
        "linkedin_url": body.get("url", body.get("linkedin_url", "")),
        "posted_date": body.get("posted_date", "1 day ago"),
        "employment_type": body.get("employment_type", ""),
        "salary": body.get("salary", ""),
        "description": body.get("description", ""),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
        "_manual": True,
    }

    manual = load_manual_jobs()
    urls = {j.get("linkedin_url", "") for j in manual}
    if job["linkedin_url"] and job["linkedin_url"] in urls:
        return {"status": "ok", "message": "Job already exists (duplicate URL)"}

    manual.insert(0, job)
    save_manual_jobs(manual)
    return {"status": "ok", "message": "Job added", "total_manual": len(manual)}


@app.get("/health")'''
c = c.replace(old3, new3)

# 5. Update root endpoint
c = c.replace(
    '"POST /api/cache/push": "Push LinkedIn job cache (JSON array)"',
    '"POST /api/cache/push": "Push LinkedIn job cache (JSON array)",\n            "POST /api/jobs/manual": "Add a single job manually"'
)
c = c.replace(
    '"linkedin_jobs_cached": len(jobs),',
    '"linkedin_jobs_cached": len(jobs),\n        "manual_jobs": len(load_manual_jobs()),'
)

with open(path, "w") as f:
    f.write(c)

print("Done: manual job endpoint added")
