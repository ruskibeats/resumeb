import unittest

from server import _is_expired


class ServerFilterTests(unittest.TestCase):
    def test_is_expired_handles_string_false_as_not_expired(self):
        self.assertFalse(_is_expired({"is_expired": "false"}))
        self.assertFalse(_is_expired({"is_expired": "False"}))
        self.assertFalse(_is_expired({"is_expired": ""}))
        self.assertFalse(_is_expired({}))

    def test_is_expired_handles_string_true_as_expired(self):
        self.assertTrue(_is_expired({"is_expired": "true"}))
        self.assertTrue(_is_expired({"is_expired": "True"}))
        self.assertTrue(_is_expired({"is_expired": True}))


if __name__ == "__main__":
    unittest.main()
