import unittest

from verify_android_signature import verify_identity


class AndroidSignatureTests(unittest.TestCase):
    def test_accepts_supported_apksigner_labels_for_the_pinned_certificate(self):
        labels = (
            "V2 Signer:",
            "V3 Signer:",
            "Signer #1",
            "Signer (minSdkVersion=24, maxSdkVersion=32)",
            "Signer (minSdkVersion=33, maxSdkVersion=2147483647)",
        )
        for label in labels:
            with self.subTest(label=label):
                output = f"{label} certificate SHA-256 digest: {'a' * 64}\n"
                self.assertEqual(verify_identity(output, "A" * 64), "a" * 64)

    def test_rejects_missing_mismatched_or_multiple_certificates(self):
        outputs = (
            "",
            f"Signer #1 certificate SHA-256 digest: {'b' * 64}\n",
            f"Signer #1 certificate SHA-256 digest: {'a' * 64}\n"
            f"Signer #2 certificate SHA-256 digest: {'b' * 64}\n",
        )
        for output in outputs:
            with self.subTest(output=output):
                with self.assertRaises(ValueError):
                    verify_identity(output, "a" * 64)

    def test_rejects_malformed_expected_fingerprint(self):
        with self.assertRaises(ValueError):
            verify_identity("Signer #1 certificate SHA-256 digest: " + "a" * 64, "bad")


if __name__ == "__main__":
    unittest.main()
