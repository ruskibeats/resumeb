from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from typing import Optional

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

FIELDNAMES = [
    "id", "job_id", "source", "source_job_id", "title", "company",
    "location", "salary", "employment_type", "url", "description",
    "raw_description", "posted_date", "scraped_at", "score",
    "match_level", "enrichment_status", "manual", "approved",
    "rejected", "notes", "updated_at", "origin_json_path",
    "expires_at", "is_expired", "first_seen_at",
]

def normalize_text(value: Optional[str]) -> str:
    return " ".join((value or "").strip().lower().split())

@dataclass
class Job:
    id: str = ""
    job_id: str = ""
    source: str = ""
    source_job_id: str = ""
    title: str = ""
    company: str = ""
    location: str = ""
    salary: str = ""
    employment_type: str = ""
    url: str = ""
    description: str = ""
    raw_description: str = ""
    posted_date: str = ""
    scraped_at: str = ""
    score: str = ""
    match_level: str = ""
    enrichment_status: str = "raw"
    manual: str = "false"
    approved: str = "false"
    rejected: str = "false"
    notes: str = ""
    updated_at: str = ""
    origin_json_path: str = ""
    expires_at: str = ""
    is_expired: str = "false"
    first_seen_at: str = ""

    def to_row(self) -> dict:
        row = asdict(self)
        for f in FIELDNAMES:
            row.setdefault(f, "")
        return row

    @classmethod
    def from_row(cls, row: dict) -> "Job":
        norm = {f: str(row.get(f, "") or "") for f in FIELDNAMES}
        return cls(**norm)

    def natural_key(self) -> str:
        if self.source_job_id:
            return f"{self.source}::{self.source_job_id}"
        if self.url:
            return f"{self.source}::url::{normalize_text(self.url)}"
        return f"manual::{normalize_text(self.title)}::{normalize_text(self.company)}::{normalize_text(self.location)}"

    def merge(self, incoming: "Job") -> "Job":
        base = self.to_row()
        inc = incoming.to_row()
        for f in FIELDNAMES:
            if f in {"id", "job_id", "updated_at", "origin_json_path", "first_seen_at"}:
                continue
            if f in {"manual", "approved", "rejected", "is_expired"}:
                if inc.get(f) in {"true", "false", "True", "False"}:
                    base[f] = str(inc[f]).lower()
                continue
            v = inc.get(f, "")
            if v != "":
                base[f] = v
        base["updated_at"] = utc_now_iso()
        if inc.get("origin_json_path"):
            base["origin_json_path"] = inc["origin_json_path"]
        return Job.from_row(base)

def derive_job_id(source: str, source_job_id: str, url: str,
                  title: str, company: str, location: str) -> str:
    if source_job_id:
        return f"{source}:{source_job_id}"
    if url:
        return f"{source}:url:{normalize_text(url)}"
    return f"manual::{normalize_text(title)}::{normalize_text(company)}::{normalize_text(location)}"
