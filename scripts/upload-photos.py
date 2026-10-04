#!/usr/bin/env python3
"""
Uploads a folder of dish photos in one go and links each one to its dish.

    python3 scripts/upload-photos.py photos/            # local database (npm run dev)
    python3 scripts/upload-photos.py photos/ --remote   # Cloudflare (production)
    python3 scripts/upload-photos.py photos/ --dry-run  # only show what would happen

Name every file after the dish's number (its id), e.g. `01.png`, `23.png` or `23-kompot.jpg`.
The numbers are the ones in the admin panel's addresses (/admin/items/23 is Компот); for the
opening menu they run from 1 (Сорпа) to 37 (Кимчи) in menu order.

Each photo is turned into a WebP of at most 800 px, like the admin panel's uploads. It is stored
in R2 under a new random key (items/<id>/<uuid>.webp) and the dish's `photo_key` is set to it.
A photo the dish had before is then deleted from R2. Objects are never overwritten, because the
/img route serves them as immutable.

Requirements: Python 3 with Pillow (`pip install pillow`), and Node 22+ for `npx wrangler`.
For --remote, `npx wrangler login` first.
"""

import argparse
import io
import json
import re
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
# As in wrangler.jsonc.
DB_BINDING = "DB"
BUCKET = "rasel-kitchen-photos"

# Sharp on any phone screen, while a photo stays around 60 KB for guests on mobile data.
MAX_SIDE = 800
QUALITY = 82
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def wrangler(args: list[str], where: str) -> str:
    """Runs `npx wrangler …` in the project, against the local or the remote resources."""
    result = subprocess.run(
        ["npx", "wrangler", *args, f"--{where}"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        output = (result.stderr or result.stdout).strip()
        raise SystemExit(f"wrangler {' '.join(args[:3])} failed:\n{output}")
    return result.stdout


def read_items(where: str) -> dict[int, dict]:
    out = wrangler(
        ["d1", "execute", DB_BINDING, "--json", "--command",
         "SELECT id, name_ru, name_kk, photo_key FROM items"],
        where,
    )
    rows = json.loads(out)[0]["results"]
    return {row["id"]: row for row in rows}


def photo_files(folder: Path) -> dict[int, Path]:
    files: dict[int, Path] = {}
    problems = []
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() not in IMAGE_SUFFIXES or path.name.startswith("."):
            continue
        match = re.match(r"(\d+)", path.stem)
        if not match:
            problems.append(f"  {path.name}: the name must start with the dish number, e.g. 23.png")
            continue
        item_id = int(match.group(1))
        if item_id in files:
            problems.append(f"  {path.name}: dish {item_id} already has {files[item_id].name}")
            continue
        files[item_id] = path
    if problems:
        raise SystemExit("Fix these files first:\n" + "\n".join(problems))
    if not files:
        raise SystemExit(f"No .png, .jpg or .webp files in {folder}")
    return files


def to_webp(path: Path) -> tuple[bytes, tuple[int, int]]:
    """Upright (EXIF orientation applied), at most MAX_SIDE px, metadata dropped."""
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        has_alpha = image.mode in ("RGBA", "LA") or "transparency" in image.info
        image = image.convert("RGBA" if has_alpha else "RGB")
        image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buffer = io.BytesIO()
        image.save(buffer, "WEBP", quality=QUALITY, method=6)
        return buffer.getvalue(), image.size


def main() -> None:
    parser = argparse.ArgumentParser(description="Upload dish photos and link them to their dishes.")
    parser.add_argument("folder", type=Path, help="folder with files named 01.png, 23-kompot.jpg, …")
    parser.add_argument("--remote", action="store_true", help="upload to Cloudflare (production)")
    parser.add_argument("--dry-run", action="store_true", help="only show what would happen")
    args = parser.parse_args()
    where = "remote" if args.remote else "local"

    if not args.folder.is_dir():
        raise SystemExit(f"{args.folder} is not a folder")
    files = photo_files(args.folder)

    print(f"Reading the dishes from the {where} database…")
    items = read_items(where)
    unknown = sorted(set(files) - set(items))
    if unknown:
        raise SystemExit(
            "No dish with the number " + ", ".join(map(str, unknown))
            + ". The numbers are in the admin panel's addresses (/admin/items/<number>)."
        )

    with tempfile.TemporaryDirectory() as tmp:
        plan = []
        for item_id, path in sorted(files.items()):
            data, (width, height) = to_webp(path)
            key = f"items/{item_id}/{uuid.uuid4()}.webp"
            out = Path(tmp) / f"{item_id}.webp"
            out.write_bytes(data)
            plan.append((item_id, key, out, items[item_id]["photo_key"]))
            replaces = " (replaces the current photo)" if items[item_id]["photo_key"] else ""
            print(f"  {item_id:>3}  {items[item_id]['name_ru']:<28} {path.name:<20} "
                  f"→ {width}×{height}, {len(data) // 1024} KB{replaces}")

        if args.dry_run:
            print("Dry run: nothing uploaded.")
            return

        print(f"Uploading {len(plan)} photo(s) to R2 ({where})…")
        for item_id, key, out, _ in plan:
            wrangler(["r2", "object", "put", f"{BUCKET}/{key}", f"--file={out}",
                      "--content-type=image/webp"], where)
            print(f"  {item_id:>3}  {key}")

    # One command for all dishes. The keys contain only digits, letters, '-', '.' and '/'.
    updates = "; ".join(f"UPDATE items SET photo_key = '{key}' WHERE id = {item_id}"
                        for item_id, key, _, _ in plan)
    wrangler(["d1", "execute", DB_BINDING, "--command", updates], where)
    print("Linked the photos to their dishes.")

    old_keys = [old for _, key, _, old in plan if old and old != key]
    for old in old_keys:
        try:
            wrangler(["r2", "object", "delete", f"{BUCKET}/{old}"], where)
        except SystemExit as error:
            print(f"  could not delete the old photo {old} (it is no longer used): {error}")
    if old_keys:
        print(f"Deleted {len(old_keys)} replaced photo(s).")

    if args.remote:
        print("Done. The live menu shows the photos within about a minute (edge cache).")
    else:
        print("Done. Open http://localhost:5173 (npm run dev) to see them.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(1)
