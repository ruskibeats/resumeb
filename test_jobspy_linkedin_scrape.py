import unittest

from jobspy_linkedin_scrape import normalize_jobspy_row


class JobSpyLinkedInScrapeTests(unittest.TestCase):
    def test_normalize_jobspy_row_maps_expected_cache_fields(self):
        row = {
            "id": "li-4408915855",
            "site": "linkedin",
            "job_url": "https://www.linkedin.com/jobs/view/4408915855?trk=x",
            "title": "Global IT Operations Manager",
            "company": "Muck Rack",
            "location": "United Kingdom",
            "date_posted": "2026-05-05",
            "job_type": "fulltime",
            "description": "Own global IT operations.",
            "min_amount": 400,
            "max_amount": 500,
            "currency": "GBP",
            "interval": "day",
        }

        job = normalize_jobspy_row(row)

        self.assertEqual(job["source"], "linkedin")
        self.assertEqual(job["source_job_id"], "li-4408915855")
        self.assertEqual(job["title"], "Global IT Operations Manager")
        self.assertEqual(job["company"], "Muck Rack")
        self.assertEqual(job["location"], "United Kingdom")
        self.assertEqual(job["linkedin_url"], "https://www.linkedin.com/jobs/view/4408915855")
        self.assertEqual(job["url"], "https://www.linkedin.com/jobs/view/4408915855")
        self.assertEqual(job["posted_date"], "2026-05-05")
        self.assertEqual(job["employment_type"], "fulltime")
        self.assertEqual(job["salary"], "GBP 400-500 per day")
        self.assertEqual(job["description"], "Own global IT operations.")
        self.assertTrue(job["scraped_at"])


if __name__ == "__main__":
    unittest.main()
