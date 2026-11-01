#!/usr/bin/env python3
"""Dependency-free exact plaid/complete-front regression (not visual acceptance)."""
from pathlib import Path
import hashlib
import json
import struct
import subprocess
import sys
import zlib

ROOT = Path(__file__).resolve().parent.parent

def png_rgb(data):
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    offset = 8
    compressed = bytearray()
    width = height = channels = 0
    while offset < len(data):
        size = struct.unpack('>I', data[offset:offset + 4])[0]
        kind = data[offset + 4:offset + 8]
        payload = data[offset + 8:offset + 8 + size]
        if kind == b'IHDR':
            width, height, depth, color, compression, filtering, interlace = struct.unpack('>IIBBBBB', payload)
            assert depth == 8 and color in (2, 6) and not interlace, 'expected non-interlaced RGB/RGBA8'
            channels = 3 if color == 2 else 4
        if kind == b'IDAT':
            compressed.extend(payload)
        offset += size + 12
    assert width > 0 and height > 0 and channels in (3, 4), 'missing PNG header'
    raw = zlib.decompress(compressed)
    stride = width * channels
    rows = []
    prev = bytearray(stride)
    offset = 0
    for _ in range(height):
        method = raw[offset]
        row = bytearray(raw[offset + 1:offset + 1 + stride])
        offset += stride + 1
        assert method <= 4, 'invalid PNG filter'
        for i in range(stride):
            left = row[i - channels] if i >= channels else 0
            up = prev[i]
            corner = prev[i - channels] if i >= channels else 0
            if method == 1:
                prediction = left
            elif method == 2:
                prediction = up
            elif method == 3:
                prediction = (left + up) // 2
            elif method == 4:
                p = left + up - corner
                distances = [abs(p - v) for v in (left, up, corner)]
                prediction = (left, up, corner)[distances.index(min(distances))]
            else:
                prediction = 0
            row[i] = (row[i] + prediction) % 256
        if channels == 4:
            assert all(row[i] == 255 for i in range(3, stride, 4)), 'unexpected transparency'
            rows.append(bytes(v for i, v in enumerate(row) if i % 4 != 3))
        else:
            rows.append(bytes(row))
        prev = row
    return width, height, rows

def main():
    contract = json.loads((ROOT / 'data/cover-matte-contract.json').read_text())
    legacy = '--legacy' in sys.argv
    failures = 0
    for item in contract:
        file = item['legacy'] if legacy else item['file']
        try:
            data = (ROOT / file).read_bytes()
            width, height, rows = png_rgb(data)
            donor = subprocess.check_output(['git', 'show', item['revision'] + ':' + item['donor']], cwd=ROOT)
            dw, dh, original = png_rgb(donor)
            assert (width, height) == (dw, dh) == (800, 800)
            x1, y1, x2, y2 = item['overlay']
            mismatches = 0
            for y in range(height):
                for x in range(width):
                    if not (x1 <= x < x2 and y1 <= y < y2):
                        i = x * 3
                        mismatches += rows[y][i:i + 3] != original[y][i:i + 3]
            assert mismatches == 0, f'{mismatches} exterior pixels differ: added backing or changed plaid'
            ratio = (x2 - x1) / (y2 - y1)
            assert abs(ratio / (item['sourceSize'][0] / item['sourceSize'][1]) - 1) < 0.003, 'front aspect ratio changed'
            assert hashlib.sha256(data).hexdigest() == item['sha256'], 'accepted complete-front bytes changed'
            print(f'PASS {file}: exact donor exterior, aspect ratio and accepted bytes')
        except (AssertionError, OSError, subprocess.CalledProcessError) as error:
            failures += 1
            print(f'FAIL {file}: {error}')
    return 1 if failures else 0

if __name__ == '__main__':
    sys.exit(main())
