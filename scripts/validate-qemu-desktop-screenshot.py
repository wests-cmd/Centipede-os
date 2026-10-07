#!/usr/bin/env python3
"""Reject QEMU desktop captures that show only a black framebuffer."""

import sys
from pathlib import Path


def read_token(data: bytes, offset: int) -> tuple[bytes, int]:
    while offset < len(data):
        if data[offset] == ord("#"):
            newline = data.find(b"\n", offset)
            if newline < 0:
                raise ValueError("unterminated PPM comment")
            offset = newline + 1
        elif data[offset] in b" \t\r\n":
            offset += 1
        else:
            break
    end = offset
    while end < len(data) and data[end] not in b" \t\r\n#":
        end += 1
    if end == offset:
        raise ValueError("missing PPM header token")
    return data[offset:end], end


def validate(path: Path) -> tuple[int, int, float]:
    data = path.read_bytes()
    offset = 0
    magic, offset = read_token(data, offset)
    width_token, offset = read_token(data, offset)
    height_token, offset = read_token(data, offset)
    maxval_token, offset = read_token(data, offset)
    if magic != b"P6" or int(maxval_token) != 255:
        raise ValueError("expected an 8-bit binary PPM (P6) screenshot")
    if data[offset : offset + 2] == b"\r\n":
        offset += 2
    elif offset < len(data) and data[offset] in b" \t\r\n":
        offset += 1
    width, height = int(width_token), int(height_token)
    pixels = data[offset:]
    if len(pixels) != width * height * 3:
        raise ValueError("PPM pixel data is truncated or malformed")
    colorful = sum(
        1
        for index in range(0, len(pixels), 3)
        if max(pixels[index : index + 3]) >= 72
    )
    ratio = colorful / (width * height)
    if ratio < 0.15:
        raise ValueError(
            f"only {ratio:.1%} of pixels have visible desktop content; "
            "the wallpaper or home window may not have painted"
        )
    return width, height, ratio


if __name__ == "__main__":
    try:
        width, height, ratio = validate(Path(sys.argv[1]))
    except (IndexError, OSError, ValueError) as error:
        print(f"QEMU desktop screenshot validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS: {width}x{height} screenshot has {ratio:.1%} visible desktop pixels")
