"""Fail-closed Android publisher identity verification across apksigner formats."""

import argparse
import os
import re
import subprocess


FINGERPRINT_LINE = re.compile(
    r"^(?:V[1-4] )?Signer[^\n]*certificate SHA-256 digest:\s*([0-9a-fA-F:]{64,95})\s*$",
    re.MULTILINE,
)


def normalize_fingerprint(value: str) -> str:
    normalized = re.sub(r"[:\s]", "", value).lower()
    if not re.fullmatch(r"[0-9a-f]{64}", normalized):
        raise ValueError("Invalid SHA-256 publisher certificate fingerprint")
    return normalized


def verify_identity(output: str, expected: str) -> str:
    pinned = normalize_fingerprint(expected)
    actual = {normalize_fingerprint(value) for value in FINGERPRINT_LINE.findall(output)}
    if actual != {pinned}:
        raise ValueError("APK publisher certificate does not match the pinned identity")
    return pinned


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("apksigner")
    parser.add_argument("apk")
    args = parser.parse_args()
    result = subprocess.run(
        [args.apksigner, "verify", "--print-certs", args.apk],
        capture_output=True,
        text=True,
        check=True,
    )
    fingerprint = verify_identity(
        result.stdout,
        os.environ.get("ANDROID_EXPECTED_CERT_SHA256", ""),
    )
    print(f"Verified pinned Android publisher certificate SHA-256: {fingerprint}")


if __name__ == "__main__":
    main()
