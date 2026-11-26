"""Native launcher policy and receipt tests; fake desktop and clock, no personal apps."""
import importlib.machinery
import importlib.util
import pathlib
import subprocess
import unittest

PATH = pathlib.Path(__file__).resolve().parents[1] / "packaging/live-build/config/includes.chroot/usr/local/bin/centipede-native-quick"
LOADER = importlib.machinery.SourceFileLoader("native_quick", str(PATH))
SPEC = importlib.util.spec_from_loader(LOADER.name, LOADER)
quick = importlib.util.module_from_spec(SPEC)
LOADER.exec_module(quick)


class Fixture:
    def __init__(self, windows=(), active=None):
        self.rows = list(windows)
        self.current = active
        self.launched = []
        self.focused = []
        self.time = 0
        self.focus_works = True
        self.launch_works = True

    def windows(self):
        return self.rows

    def active(self):
        return self.current

    def focus(self, wid):
        self.focused.append(wid)
        if self.focus_works:
            self.current = wid

    def launch(self, argv):
        self.launched.append(argv)
        if self.launch_works:
            self.rows.append((3, {"libreoffice-writer"}))

    def clock(self):
        return self.time

    def sleep(self, seconds):
        self.time += seconds

    def activate(self, app="writer"):
        return quick.activate(app, self, self.clock, self.sleep)


class NativeQuickTests(unittest.TestCase):
    def test_local_non_root_x11_only(self):
        self.assertTrue(quick.local_session({"DISPLAY": ":0", "XDG_SESSION_TYPE": "x11"}, 1000))
        for env, uid in [({"DISPLAY": ":0"}, 0), ({"DISPLAY": "remote:0"}, 1000),
                         ({"DISPLAY": ":0", "XDG_SESSION_TYPE": "wayland"}, 1000), ({}, 1000)]:
            self.assertFalse(quick.local_session(env, uid))

    def test_real_format_parser(self):
        rows = quick.parse_windows("0x01200007  0 libreoffice.libreoffice-writer host Title\n"
                                   "0x01200008 -1 vlc.Vlc host Other\nbad row")
        self.assertEqual(rows, [(0x01200007, {"libreoffice", "libreoffice-writer"}), (0x01200008, {"vlc"})])
        self.assertEqual(quick.parse_active("_NET_ACTIVE_WINDOW(WINDOW): window id # 0x1200007"), 0x1200007)
        self.assertIsNone(quick.parse_active("unrelated property 0x1200007"))

    def test_launch_and_readback(self):
        f = Fixture()
        self.assertEqual(f.activate()[0], "VERIFIED")
        self.assertEqual(f.launched, [("/usr/bin/libreoffice", "--writer")])
        self.assertEqual(f.focused, [3])

    def test_existing_and_ambiguous(self):
        f = Fixture([(5, {"libreoffice-writer"}), (6, {"libreoffice-writer"})], 5)
        self.assertEqual(f.activate()[0], "VERIFIED")
        self.assertEqual(f.launched + f.focused, [])
        f.current = 9
        self.assertEqual(f.activate()[0], "UNVERIFIED")
        self.assertEqual(f.launched + f.focused, [])

    def test_no_readback_no_success_or_retry(self):
        f = Fixture()
        f.launch_works = False
        self.assertEqual(f.activate()[0], "UNVERIFIED")
        self.assertEqual(len(f.launched), 1)
        f = Fixture([(5, {"libreoffice-writer"})], 6)
        f.focus_works = False
        self.assertEqual(f.activate()[0], "UNVERIFIED")
        self.assertEqual(f.focused, [5])

    def test_rejects_arbitrary_command_and_inspection_failure(self):
        f = Fixture()
        self.assertEqual(f.activate("writer; sudo sh")[0], "DENIED")
        self.assertEqual(f.launched + f.focused, [])
        def failed():
            raise subprocess.TimeoutExpired("fixture", 3)
        f.windows = failed
        self.assertEqual(f.activate()[0], "UNAVAILABLE")

    def test_target_disappears_before_dispatch(self):
        f = Fixture([(7, {"libreoffice-writer"})], 8)
        count = 0
        def windows():
            nonlocal count
            count += 1
            return f.rows if count == 1 else []
        f.windows = windows
        self.assertEqual(f.activate()[0], "UNVERIFIED")
        self.assertEqual(f.focused, [])


if __name__ == "__main__":
    unittest.main()
