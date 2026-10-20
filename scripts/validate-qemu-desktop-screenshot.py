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
    page_visible = 0
    near_white = 0
    high_frequency_horizontal = 0
    high_frequency_vertical = 0
    for index in range(0, len(pixels), 3):
        red, green, blue = pixels[index : index + 3]
        if min(red, green, blue) > 230:
            near_white += 1
    pixel_count = width * height
    near_white_ratio = near_white / pixel_count
    # Exclude the XFCE panel and Chromium window chrome. Those surfaces were
    # enough to make an empty, dark browser page pass the old whole-screen
    # threshold even though Centipede itself had not rendered.
    content_top = int(height * 0.14)
    content_bottom = int(height * 0.98)
    content_height = max(0, content_bottom - content_top)
    for y in range(content_top, content_bottom):
        row_start = y * width * 3
        for x in range(width):
            index = row_start + x * 3
            if max(pixels[index], pixels[index + 1], pixels[index + 2]) >= 72:
                page_visible += 1
    content_visible_ratio = page_visible / max(1, width * content_height)
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
    # A mapped browser window is independently required by the live readiness
    # probe. Measure the page area separately so panel/window chrome cannot
    # make a blank dark page pass. The floor accepts the dark setup wizard but
    # rejects a page showing only its background and pointer.
    if content_visible_ratio < 0.0075:
        raise ValueError(
            f"only {content_visible_ratio:.2%} of browser-page pixels have visible content; "
            "the Centipede page may not have rendered"
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
    return width, height, content_visible_ratio


if __name__ == "__main__":
    try:
        width, height, ratio = validate(Path(sys.argv[1]))
    except (IndexError, OSError, ValueError) as error:
        print(f"QEMU desktop screenshot validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
    print(f"PASS: {width}x{height} screenshot has {ratio:.2%} visible browser-page pixels")

