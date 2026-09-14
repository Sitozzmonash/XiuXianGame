"""Skin art prep: flood-fill key black background -> trim -> transparent PNG."""
import sys
from collections import deque
from PIL import Image

TOL = 34  # near-black tolerance per channel


def key_black(src: str, dst: str) -> None:
    im = Image.open(src).convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = bytearray(w * h)

    def dark(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r <= TOL and g <= TOL and b <= TOL

    q = deque()

    def seed(x: int, y: int) -> None:
        i = y * w + x
        if not visited[i] and dark(x, y):
            visited[i] = 1
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                i = ny * w + nx
                if not visited[i] and dark(nx, ny):
                    visited[i] = 1
                    q.append((nx, ny))

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    im.save(dst)
    print(f"{dst}: {im.size[0]}x{im.size[1]}")


if __name__ == "__main__":
    jobs = [
        (r"C:\Users\Sito\Documents\Qoder\2026-09-13\8b384d8d\vibe_images\skin-qingfeng-raw_1789396374374_536bc2bf.png", "qingfeng"),
        (r"C:\Users\Sito\Documents\Qoder\2026-09-13\8b384d8d\vibe_images\skin-xuanye-raw_1789396414965_152389b9.png", "xuanye"),
        (r"C:\Users\Sito\Documents\Qoder\2026-09-13\8b384d8d\vibe_images\skin-leiyin-raw_1789396458440_d50d1998.png", "leiyin"),
        (r"C:\Users\Sito\Documents\Qoder\2026-09-13\8b384d8d\vibe_images\skin-qingzhu-raw_1789396504768_2ff73509.png", "qingzhu"),
    ]
    for src, name in jobs:
        key_black(src, rf"D:\Documents\MyWorkSpace\XiuXianGame\public\images\skins\{name}.png")
