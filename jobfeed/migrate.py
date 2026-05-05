import json
from pathlib import Path
from .models import Job
from .repository import JobRepository
from .enrichment import enrich_and_score
from .rss_builder import build_linkedin_rss

BASE = Path(__file__).parent.parent
CACHE = BASE / "jobs_cache.json"
MANUAL = BASE / "manual_jobs.json"
SCORED = BASE / "scored_jobs.json"
CANONICAL = BASE / "canonical_jobs.csv"
FEED_RSS = BASE / "feed.rss"

def _load(p):
    if not p.exists(): return []
    t = p.read_text(encoding="utf-8").strip()
    return json.loads(t) if t else []

def _row_from_cache(r):
    return Job.from_row({
        "source": r.get("source","linkedin"),
        "source_job_id": r.get("source_job_id", r.get("id","")),
        "title": r.get("title",""),
        "company": r.get("company",""),
        "location": r.get("location",""),
        "salary": r.get("salary",""),
        "employment_type": r.get("employment_type", r.get("employmenttype","")),
        "url": r.get("url", r.get("linkedinurl","")),
        "description": r.get("description",""),
        "raw_description": r.get("description",""),
        "posted_date": r.get("posteddate",""),
        "scraped_at": r.get("scrapedat",""),
        "manual": "true" if r.get("manual") else "false",
        "origin_json_path": "jobs_cache.json",
    })

def _row_from_manual(r):
    return Job.from_row({
        "source": "manual",
        "title": r.get("title",""),
        "company": r.get("company",""),
        "location": r.get("location",""),
        "salary": r.get("salary",""),
        "employment_type": r.get("employment_type",""),
        "url": r.get("url",""),
        "description": r.get("description",""),
        "raw_description": r.get("description",""),
        "manual": "true",
        "origin_json_path": "manual_jobs.json",
    })

def _row_from_scored(r):
    return Job.from_row({
        "source": r.get("source","linkedin"),
        "source_job_id": r.get("source_job_id", r.get("id","")),
        "title": r.get("title",""),
        "company": r.get("company",""),
        "location": r.get("location",""),
        "salary": r.get("salary",""),
        "employment_type": r.get("employment_type", r.get("employmenttype","")),
        "url": r.get("url", r.get("linkedinurl","")),
        "description": r.get("description",""),
        "raw_description": r.get("raw_description", r.get("description","")),
        "posted_date": r.get("posteddate",""),
        "scraped_at": r.get("scrapedat",""),
        "score": str(r.get("score","")),
        "match_level": r.get("matchlevel",""),
        "enrichment_status": "enriched" if r.get("score") is not None else "raw",
        "manual": "true" if r.get("manual") else "false",
        "origin_json_path": "scored_jobs.json",
    })

def run():
    repo = JobRepository(CANONICAL)
    cache = [_row_from_cache(r) for r in _load(CACHE)]
    manual = [_row_from_manual(r) for r in _load(MANUAL)]
    scored = [_row_from_scored(r) for r in _load(SCORED)]
    enriched_cache = [enrich_and_score(j) for j in cache]
    enriched_manual = [enrich_and_score(j) for j in manual]
    repo.bulk_upsert(enriched_cache)
    repo.bulk_upsert(enriched_manual)
    repo.bulk_upsert(scored)
    all_jobs = repo.list()
    (BASE / "scored_jobs.json").write_text(
        json.dumps([j.to_row() for j in all_jobs], indent=2), encoding="utf-8")
    rss = build_linkedin_rss(
        all_jobs,
        feed_url="http://localhost:9099/feed",
        title="LinkedIn Job Search UK",
        description="LinkedIn job listings for IT, Infrastructure, and Operations roles in the UK",
    )
    FEED_RSS.write_text(rss, encoding="utf-8")
    print(f"Migrated {len(all_jobs)} jobs into canonical_jobs.csv")
    print("Regenerated scored_jobs.json and feed.rss")

if __name__ == "__main__":
    run()
