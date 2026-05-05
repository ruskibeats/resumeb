from .models import Job, utc_now_iso
TARGET = ["infrastructure","network","operations","programme","delivery","wifi","datacentre"]
GOOD  = ["manager","lead","cloud","migration","technical"]
def enrich_and_score(j: Job) -> Job:
    h = " ".join([j.title, j.company, j.description, j.location]).lower()
    sc = sum(20 for w in TARGET if w in h) + sum(10 for w in GOOD if w in h)
    sc = min(sc, 100)
    j.score = str(sc)
    j.match_level = "target" if sc>=80 else "good" if sc>=60 else "maybe" if sc>=40 else "poor"
    j.enrichment_status = "enriched"
    j.updated_at = utc_now_iso()
    return j
