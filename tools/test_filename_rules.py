import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from filename_rules import infer_filename


SETTINGS = {
    "separators": "_-—",
    "materials": ["布面油画", "油画", "水彩", "综合材料"],
    "authorChapters": {"董日福": "mastery", "陈致远": "study", "吴偲": "voices"},
}


class FilenameRuleTests(unittest.TestCase):
    def test_full_filename(self):
        value = infer_filename("陈致远_庙埕午后_布面油画_2026_80x100cm.jpg", SETTINGS, ["董日福", "陈致远"])
        self.assertEqual(value["artist"], "陈致远")
        self.assertEqual(value["title"], "庙埕午后")
        self.assertEqual(value["medium"], "布面油画")
        self.assertEqual(value["year"], "2026")
        self.assertEqual(value["chapter"], "study")
        self.assertIn("80", value["size"])

    def test_unknown_student_defaults_to_voices(self):
        value = infer_filename("林小雨—海边—水彩—2024.png", SETTINGS, ["董日福", "陈致远"])
        self.assertEqual(value["artist"], "林小雨")
        self.assertEqual(value["chapter"], "voices")
        self.assertEqual(value["title"], "海边")

    def test_no_metadata_does_not_invent(self):
        value = infer_filename("IMG20260831.jpg", SETTINGS, ["董日福", "陈致远"])
        self.assertEqual(value["artist"], "")
        self.assertEqual(value["year"], "")


if __name__ == "__main__":
    unittest.main()
