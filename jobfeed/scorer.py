
"""
Canonical Scoring Module - v3.1 enhanced
"""
from __future__ import annotations
import os, re
from pathlib import Path
from datetime import datetime
from typing import Any

DEFAULT_MASTER_CAREER_FILE = Path("/opt/pi.dev/cvs/MASTER_CAREER_DATA.md")
MASTER_CAREER_FILE = Path(os.environ.get("MASTER_CAREER_FILE", DEFAULT_MASTER_CAREER_FILE))

HIGH_VALUE_KEYWORDS = [
    "programme director", "technical operations director", "infrastructure programme director",
    "technical director", "infrastructure director", "operations director",
    "infrastructure modernisation", "zero-disruption", "multi-vendor orchestration",
    "large-scale network deployments", "live-estate modernisation",
    "circuit migrations", "endpoint deployments", "data centre transitions",
    "sd-wan", "wan", "wi-fi", "network deployment", "infrastructure upgrade",
    "microsoft 365 migration", "euc migration", "cloud migration",
    "cost reduction", "commercial accountability", "p&l accountability",
    "cross-cutting programmes", "large-scale deployments",
]

MEDIUM_VALUE_KEYWORDS = [
    "infrastructure", "network", "technical operations", "migration", "deployment",
    "programme", "director", "project management", "operations management",
    "security", "cloud", "data centre", "wi-fi", "endpoint", "orchestration",
]

RUSSELL_INDICATORS = [
    "home office", "mhclg", "nato", "wwt", "retail sd-wan",
    "security check", "nppv3", "hemel hempstead", "london",
]

NEGATIVE_KEYWORDS = [
    "junior", "graduate", "entry level", "trainee", "apprentice",
    "1st line", "first line", "2nd line", "second line",
    "helpdesk", "help desk", "service desk", "desktop support",
    "support technician", "field technician", "it support",
    "service analyst", "operations analyst", "jnr", "grad",
]

TITLE_BONUSES = {
    "exact": [
        "programme director", "operations director", "technical director",
        "infrastructure director", "delivery director", "transformation director",
        "technical programme director", "infrastructure programme director",
        "technical operations director",
    ],
    "partial": [
        "director", "programme manager", "programme lead",
        "head of infrastructure", "head of operations", "head of delivery",
        "vp infrastructure", "vp operations", "vp technical",
    ],
}

SALARY_HIGH_THRESHOLD = 400
SALARY_LOW_THRESHOLD = 200
DESC_MIN_CHARS = 150
DESC_HTML_RATIO = 0.80

_master_cache: dict[str, Any] = {"text": "", "mtime": 0.0}


def load_master_career_data() -> str:
    global _master_cache
    if not MASTER_CAREER_FILE.exists():
        return ""
    mtime = MASTER_CAREER_FILE.stat().st_mtime
    if mtime != _master_cache["mtime"]:
        _master_cache["text"] = MASTER_CAREER_FILE.read_text(encoding="utf-8")
        _master_cache["mtime"] = mtime
    return _master_cache["text"]


def _extract_daily_rate(salary_text: str) -> int | None:
    if not salary_text:
        return None
    txt = salary_text.lower()
    m = re.search(r"£\s*([0-9,]+(?:\.\d+)?)\s*(?:per\s+day|/day|daily)", txt)
    if m:
        return int(m.group(1).replace(",", ""))
    m = re.search(r"£\s*([0-9,]+)\s*[-–]\s*£?\s*([0-9,]+)", txt)
    if m:
        return (int(m.group(1).replace(",", "")) + int(m.group(2).replace(",", ""))) // 2
    return None


def _extract_annual_salary(salary_text: str) -> int | None:
    if not salary_text:
        return None
    txt = salary_text.lower()
    m = re.search(r"£\s*([0-9,]+(?:\.\d+)?)\s*(?:per\s+annum|p\.?a\.?|annually|/year|yearly)", txt)
    if m:
        return int(m.group(1).replace(",", ""))
    m = re.search(r"£\s*([0-9,]+)\s*[-–]\s*£?\s*([0-9,]+)", txt)
    if m:
        return (int(m.group(1).replace(",", "")) + int(m.group(2).replace(",", ""))) // 2
    return None


def _description_quality_score(description: str) -> int:
    if not description:
        return -10
    if len(description) < DESC_MIN_CHARS:
        return -10
    html_tag_count = len(re.findall(r"<[^>]+>", description))
    if html_tag_count > 0 and (html_tag_count / len(description)) > DESC_HTML_RATIO:
        return -10
    return 0


def _title_bonus(title: str) -> int:
    if not title:
        return 0
    t = title.lower()
    for phrase in TITLE_BONUSES["exact"]:
        if phrase in t:
            return 25
    for phrase in TITLE_BONUSES["partial"]:
        if phrase in t:
            return 10
    return 0


def calculate_job_score(job: dict[str, Any], career_data: str = "") -> int:
    job_content = f"{job.get('title', '')} {job.get('company', '')} {job.get('description', '')}".lower()
    all_content = f"{job_content} {career_data.lower()}" if career_data else job_content

    score = 0

    high_matches = sum(1 for kw in HIGH_VALUE_KEYWORDS if kw in all_content)
    score += min(40, high_matches * 20)

    medium_matches = sum(1 for kw in MEDIUM_VALUE_KEYWORDS if kw in all_content)
    score += min(20, medium_matches * 5)

    russell_matches = sum(1 for ind in RUSSELL_INDICATORS if ind in all_content)
    score += min(10, russell_matches * 3)

    emp_type = job.get("employment_type", "")
    if isinstance(emp_type, str) and "contract" in emp_type.lower():
        score += 5

    neg_matches = sum(1 for kw in NEGATIVE_KEYWORDS if kw in all_content)
    score -= min(30, neg_matches * 10)

    score += _title_bonus(job.get("title", ""))

    salary_text = job.get("salary", "")
    daily_rate = _extract_daily_rate(salary_text)
    annual = _extract_annual_salary(salary_text)

    if daily_rate is not None:
        if daily_rate >= SALARY_HIGH_THRESHOLD:
            score += 15
        elif daily_rate <= SALARY_LOW_THRESHOLD:
            score -= 20
    elif annual is not None:
        if annual >= 80000:
            score += 15
        elif annual <= 35000:
            score -= 20

    score += _description_quality_score(job.get("description", ""))

    if job.get("title", "").lower().strip() == "test":
        score = 0

    return max(0, min(100, score))


def add_scoring_metadata(job: dict[str, Any], score: int) -> dict[str, Any]:
    out = dict(job)
    out["_score"] = score
    out["_scored_at"] = datetime.now().isoformat()
    out["_match_level"] = (
        "target" if score >= 80 else
        "good" if score >= 60 else
        "maybe" if score >= 40 else
        "poor"
    )
    return out
