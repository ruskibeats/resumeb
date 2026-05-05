import csv, os, tempfile
from pathlib import Path
from typing import List, Iterable
from .models import FIELDNAMES, Job

def atomic_write_rows(path: Path, rows: Iterable[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix="jobs_", suffix=".csv", dir=str(path.parent))
    os.close(fd)
    tmp_path = Path(tmp)
    try:
        with tmp_path.open("w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=FIELDNAMES)
            w.writeheader()
            for row in rows:
                w.writerow({k: str(row.get(k, "") or "") for k in FIELDNAMES})
        tmp_path.replace(path)
    finally:
        tmp_path.unlink(missing_ok=True)

def load_rows(path: Path) -> List[dict]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

class JobRepository:
    def __init__(self, csv_path: str | Path = "canonical_jobs.csv"):
        self.path = Path(csv_path)
        if not self.path.exists():
            atomic_write_rows(self.path, [])

    def _read_all(self) -> List[Job]:
        return [Job.from_row(r) for r in load_rows(self.path)]

    def _write_all(self, jobs: List[Job]) -> None:
        atomic_write_rows(self.path, [j.to_row() for j in jobs])

    def list(self) -> List[Job]:
        return self._read_all()

    def _index_by_key(self, jobs: List[Job]) -> dict:
        return {j.natural_key(): j for j in jobs}

    def upsert(self, job: Job) -> Job:
        jobs = self._read_all()
        idx = self._index_by_key(jobs)
        k = job.natural_key()
        if k in idx:
            idx[k] = idx[k].merge(job)
        else:
            if not job.job_id:
                from .models import derive_job_id
                job.job_id = derive_job_id(job.source, job.source_job_id,
                                          job.url, job.title, job.company, job.location)
            job.updated_at = job.updated_at or __import__("jobfeed.models").utc_now_iso()
            idx[k] = job
        jobs = list(idx.values())
        self._write_all(jobs)
        return idx[k]

    def bulk_upsert(self, jobs_in: List[Job]) -> List[Job]:
        jobs = self._read_all()
        idx = self._index_by_key(jobs)
        for j in jobs_in:
            k = j.natural_key()
            if k in idx:
                idx[k] = idx[k].merge(j)
            else:
                if not j.job_id:
                    from .models import derive_job_id
                    j.job_id = derive_job_id(j.source, j.source_job_id,
                                            j.url, j.title, j.company, j.location)
                j.updated_at = j.updated_at or __import__("jobfeed.models").utc_now_iso()
                idx[k] = j
        jobs = list(idx.values())
        self._write_all(jobs)
        return jobs
