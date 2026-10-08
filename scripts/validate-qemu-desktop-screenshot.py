#!/usr/bin/env python3
"""Reject QEMU desktop captures that do not show a rendered desktop."""

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
    pixel_count = width * height
    visible = 0
    near_white = 0
    high_frequency_horizontal = 0
    high_frequency_vertical = 0
    for index in range(0, len(pixels), 3):
        red, green, blue = pixels[index : index + 3]
        if max(red, green, blue) >= 72:
            visible += 1
        if min(red, green, blue) > 230:
            near_white += 1
    visible_ratio = visible / pixel_count
    near_white_ratio = near_white / pixel_count
    # Broken firmware/framebuffer captures often become fine red/blue/white
    # checkerboards. Measure a sparse grid so normal detailed artwork remains
    # acceptable while pathological pixel-to-pixel corruption fails closed.
    sample_step_x = max(1, width // 160)
    sample_step_y = max(1, height // 120)
    horizontal_pairs = 0
    vertical_pairs = 0
    for y in range(sample_step_y, height - 1, sample_step_y):
        for x in range(sample_step_x, width - 1, sample_step_x):
            index = (y * width + x) * 3
            right = index + 3
            below = index + width * 3
            if sum(abs(pixels[index + c] - pixels[right + c]) for c in range(3)) >= 240:
                high_frequency_horizontal += 1
            horizontal_pairs += 1
            if sum(abs(pixels[index + c] - pixels[below + c]) for c in range(3)) >= 240:
                high_frequency_vertical += 1
            vertical_pairs += 1
    horizontal_ratio = high_frequency_horizontal / max(1, horizontal_pairs)
    vertical_ratio = high_frequency_vertical / max(1, vertical_pairs)
    if visible_ratio < 0.15:
        raise ValueError(
            f"only {visible_ratio:.1%} of pixels have visible desktop content; "
            "the desktop may not have painted"
        )
    if near_white_ratio > 0.70:
        raise ValueError(
            f"{near_white_ratio:.1%} of pixels are near-white; this usually "
            "means Chromium is showing an empty or still-loading page"
        )
    if horizontal_ratio > 0.72 or vertical_ratio > 0.72:
        raise ValueError(
            f"frame has pathological pixel alternation ({horizontal_ratio:.1%} horizontal, "
            f"{vertical_ratio:.1%} vertical); display output may be corrupted"
        )
    return width, height, visible_ratio


if __name__ == "__main__":
    try:
        width, height, ratio = validate(Path(sys.argv[1]))
    except (IndexError, OSError, ValueError) as error:
        print(f"QEMU desktop screenshot validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS: {width}x{height} screenshot has {ratio:.1%} visible desktop pixels")

