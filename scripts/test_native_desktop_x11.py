"""Opt-in real X11 readback under disposable Xvfb + openbox, not physical hardware."""
import os
import subprocess
import time
import unittest
from test_native_desktop import quick, assistant


@unittest.skipUnless(os.environ.get("CENTIPEDE_TEST_X11") == "1", "Disposable X11 test only")
class X11Readback(unittest.TestCase):
    def test_focus_observed_in_actual_x_server(self):
        processes = []
        try:
            processes.append(subprocess.Popen(["openbox"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            for name in ("centipede-fixture-one", "centipede-fixture-two"):
                processes.append(subprocess.Popen(["xterm", "-name", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
            desktop = quick.Desktop()
            targets = {}
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                try:
                    targets = {name: wid for wid, classes in desktop.windows()
                               for name in ("centipede-fixture-one", "centipede-fixture-two") if name in classes}
                except subprocess.SubprocessError:
                    pass
                if len(targets) == 2:
                    break
                time.sleep(.15)
            self.assertEqual(len(targets), 2)
            # Exercise production activate() with a temporary fixed fixture identity.
            quick.APPS["fixture"] = ("X11 fixture", ("/usr/bin/false",), {"centipede-fixture-one"})
            try:
                desktop.focus(targets["centipede-fixture-two"])
                deadline = time.monotonic() + 3
                while desktop.active() != targets["centipede-fixture-two"] and time.monotonic() < deadline:
                    time.sleep(.1)
                self.assertEqual(desktop.active(), targets["centipede-fixture-two"])
                self.assertEqual(quick.activate("fixture", desktop)[0], "VERIFIED")
                self.assertEqual(desktop.active(), targets["centipede-fixture-one"])
                target = targets["centipede-fixture-one"]
                self.assertEqual(quick.position("fixture", "maximize", desktop)[0], "VERIFIED")
                self.assertTrue(quick.MAXIMIZED <= desktop.state(target))
                self.assertEqual(quick.position("fixture", "restore", desktop)[0], "VERIFIED")
                self.assertFalse(quick.MAXIMIZED & desktop.state(target))
                area = desktop.workarea()
                self.assertIsNotNone(area)
                for side in ("left", "right"):
                    result = quick.snap("fixture", side, desktop)
                    self.assertEqual(result[0], "VERIFIED", (result, desktop.geometry(target), area))
                    self.assertTrue(quick.close_geometry(desktop.geometry(target), quick.snap_rectangle(area, side)))
                import tkinter as tk
                root = tk.Tk()
                try:
                    calls = []
                    receipts = []
                    def dispatch(command):
                        calls.append(command)
                        return ("VERIFIED", "UI fixture receipt")
                    ui = assistant.Assistant(root, dispatch=dispatch,
                                             notifier=lambda *receipt: receipts.append(receipt))
                    root.update()
                    ui.command.set("open writer")
                    ui.execute()
                    self.assertEqual(calls, [])
                    ui.review()
                    ui.command.set("open calc")
                    ui.execute()
                    self.assertEqual(calls, [])
                    ui.review()
                    ui.execute()
                    ui.execute()
                    deadline = time.monotonic() + 5
                    while (ui.busy or not receipts) and time.monotonic() < deadline:
                        root.update()
                        time.sleep(.05)
                    self.assertEqual(calls, ["calc:open"])
                    self.assertEqual(receipts, [("VERIFIED", "UI fixture receipt")])
                    self.assertFalse(ui.busy)
                    self.assertIn("VERIFIED", ui.message.get())
                finally:
                    root.destroy()
            finally:
                del quick.APPS["fixture"]
        finally:
            for process in reversed(processes):
                process.terminate()
                try:
                    process.wait(timeout=3)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=3)
