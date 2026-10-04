#!/usr/bin/env python3
"""
Makes the print files for the table QR code, in print/:

    python3 scripts/make-table-card.py                          # for https://rasel-kitchen.app
    python3 scripts/make-table-card.py https://menu.example.kz  # for another address

- table-card.pdf: an A6 card (105 × 148 mm) with the logo, "Мәзір · Меню", the QR code and the
  address, all vector. It has white margins, so it prints on any printer and needs no bleed.
- table-card.png: the same card at 300 dpi, to print at home or send in a chat.
- qr-code.svg and qr-code.png: the bare QR code, to place in other designs.

The QR code is made with Apple's Core Image, and the finished card is checked by reading the code
back from it, so this runs on macOS only (through `swift`). Also needs Python 3 with fontTools and
brotli (as for build-fonts.py) and Pillow.
"""

import re
import subprocess
import sys
import tempfile
import zlib
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from fontTools.svgLib.path import parse_path
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "print"
FONTS = ROOT / "src" / "lib" / "assets" / "fonts"
LOGO = ROOT / "src" / "lib" / "brand" / "logo-art.ts"

# Q: a quarter of the code can be scratched or stained and it still reads.
CORRECTION = "Q"
# Light modules around the code, as the QR standard asks.
QUIET_ZONE = 4
DPI = 300

# Brand colours (src/theme.css).
VIOLET = "#aa72ab"
ORANGE = "#f79e45"
DEEP = "#7d447e"
INK = "#2b1a2d"
INK_SOFT = "#5c4a5e"

MM = 72 / 25.4  # PDF points per millimetre
PAGE_W, PAGE_H = 105, 148  # A6, in mm

SWIFT = r"""
import CoreImage
import Foundation
import ImageIO
import UniformTypeIdentifiers

func printCodes(in image: CGImage) {
    let detector = CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                              options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
    for case let code as CIQRCodeFeature in detector.features(in: CIImage(cgImage: image)) {
        print(code.messageString ?? "")
    }
}

let args = CommandLine.arguments
switch args[1] {
case "matrix":  // matrix <text> <L|M|Q|H>: one row of 0/1 per line, 1 = dark, top row first
    let filter = CIFilter(name: "CIQRCodeGenerator")!
    filter.setValue(Data(args[2].utf8), forKey: "inputMessage")
    filter.setValue(args[3], forKey: "inputCorrectionLevel")
    let image = filter.outputImage!
    let width = Int(image.extent.width), height = Int(image.extent.height)
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    CIContext().render(image, toBitmap: &pixels, rowBytes: width * 4, bounds: image.extent,
                       format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
    for y in 0..<height {
        print((0..<width).map { pixels[(y * width + $0) * 4] < 128 ? "1" : "0" }.joined())
    }
case "render":  // render <pdf> <png> <dpi>: rasterises page 1, then prints the codes it reads
    let page = CGPDFDocument(URL(fileURLWithPath: args[2]) as CFURL)!.page(at: 1)!
    let box = page.getBoxRect(.mediaBox)
    let dpi = Double(args[4])!, scale = dpi / 72
    let context = CGContext(data: nil, width: Int((box.width * scale).rounded()),
                            height: Int((box.height * scale).rounded()), bitsPerComponent: 8,
                            bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue)!
    context.setFillColor(CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: context.width, height: context.height))
    context.scaleBy(x: scale, y: scale)
    context.drawPDFPage(page)
    let image = context.makeImage()!
    let file = CGImageDestinationCreateWithURL(URL(fileURLWithPath: args[3]) as CFURL,
                                               UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(file, image, [kCGImagePropertyDPIWidth as String: dpi,
                                             kCGImagePropertyDPIHeight as String: dpi] as CFDictionary)
    CGImageDestinationFinalize(file)
    printCodes(in: image)
case "read":  // read <image>: prints the codes it reads
    let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: args[2]) as CFURL, nil)!
    printCodes(in: CGImageSourceCreateImageAtIndex(source, 0, nil)!)
default:
    exit(2)
}
"""


def swift(*args: str) -> list[str]:
    with tempfile.NamedTemporaryFile("w", suffix=".swift", delete=False) as script:
        script.write(SWIFT)
    try:
        result = subprocess.run(["swift", script.name, *args], capture_output=True, text=True)
    finally:
        Path(script.name).unlink()
    if result.returncode != 0:
        raise SystemExit(f"swift {args[0]} failed:\n{result.stderr.strip()}")
    return result.stdout.splitlines()


def qr_matrix(text: str) -> list[list[bool]]:
    rows = [[c == "1" for c in line] for line in swift("matrix", text, CORRECTION) if line]
    # Core Image adds a light margin of its own; the quiet zone is added when drawing.
    rows = [r for r in rows if any(r)]
    left = min(r.index(True) for r in rows)
    right = max(len(r) - r[::-1].index(True) for r in rows)
    rows = [r[left:right] for r in rows]
    if len(rows) != len(rows[0]):
        raise SystemExit("The QR code is not square")

    def finder(top: int, left: int) -> bool:
        ring = [rows[top][left + i] and rows[top + 6][left + i] and rows[top + i][left]
                and rows[top + i][left + 6] for i in range(7)]
        return all(ring) and all(rows[top + 2 + i][left + 2 + j] for i in range(3) for j in range(3))

    n = len(rows)
    # Finder patterns sit in three corners, never bottom right. Anything else is a mirrored code.
    if not (finder(0, 0) and finder(0, n - 7) and finder(n - 7, 0) and not finder(n - 7, n - 7)):
        raise SystemExit("The QR code came out mirrored")
    return rows


def runs(row: list[bool]):
    """(start, length) of each stretch of dark modules in a row."""
    start = None
    for i, dark in enumerate(row + [False]):
        if dark and start is None:
            start = i
        elif not dark and start is not None:
            yield start, i - start
            start = None


class PdfPen(BasePen):
    """Collects an outline (glyph or SVG path) as PDF path operators. Glyphs built from other
    glyphs (accented letters) need the font's glyph set to draw their parts."""

    def __init__(self, glyph_set=None):
        super().__init__(glyph_set)
        self.ops: list[str] = []

    def _moveTo(self, p):
        self.ops.append(f"{p[0]:.3f} {p[1]:.3f} m")

    def _lineTo(self, p):
        self.ops.append(f"{p[0]:.3f} {p[1]:.3f} l")

    def _curveToOne(self, p1, p2, p3):
        self.ops.append(" ".join(f"{x:.3f} {y:.3f}" for x, y in (p1, p2, p3)) + " c")

    def _closePath(self):
        self.ops.append("h")


class Card:
    """A page drawn in millimetres from the top left, written out as PDF operators."""

    def __init__(self):
        self.ops: list[str] = []

    @staticmethod
    def place(x_mm: float, y_mm: float, scale: float, flip: bool, origin=(0.0, 0.0)):
        """PDF transformation from outline units to points that puts the outline's `origin` at
        (x_mm, y_mm). `flip` is for SVG paths, whose y axis points down."""
        ox, oy = origin
        y_scale = -scale if flip else scale
        return (scale, 0, 0, y_scale, x_mm * MM - ox * scale, (PAGE_H - y_mm) * MM - oy * y_scale)

    def fill(self, colour: str, ops: list[str], even_odd=False):
        r, g, b = (int(colour[i:i + 2], 16) / 255 for i in (1, 3, 5))
        self.ops += [f"{r:.4f} {g:.4f} {b:.4f} rg", *ops, "f*" if even_odd else "f"]

    def rounded_rect(self, colour: str, x: float, y: float, w: float, h: float, radius: float):
        k = 0.5523 * radius  # control-point distance for a quarter circle
        x0, x1, y0, y1 = x * MM, (x + w) * MM, (PAGE_H - y - h) * MM, (PAGE_H - y) * MM
        r, k = radius * MM, k * MM
        self.fill(colour, [
            f"{x0 + r:.3f} {y0:.3f} m", f"{x1 - r:.3f} {y0:.3f} l",
            f"{x1 - r + k:.3f} {y0:.3f} {x1:.3f} {y0 + r - k:.3f} {x1:.3f} {y0 + r:.3f} c",
            f"{x1:.3f} {y1 - r:.3f} l",
            f"{x1:.3f} {y1 - r + k:.3f} {x1 - r + k:.3f} {y1:.3f} {x1 - r:.3f} {y1:.3f} c",
            f"{x0 + r:.3f} {y1:.3f} l",
            f"{x0 + r - k:.3f} {y1:.3f} {x0:.3f} {y1 - r + k:.3f} {x0:.3f} {y1 - r:.3f} c",
            f"{x0:.3f} {y0 + r:.3f} l",
            f"{x0:.3f} {y0 + r - k:.3f} {x0 + r - k:.3f} {y0:.3f} {x0 + r:.3f} {y0:.3f} c",
            "h",
        ])

    def logo(self, centre_x: float, top: float, height: float, white: str, accent: str):
        """The wordmark from logo-art.ts, `height` mm tall."""
        source = LOGO.read_text()
        block = re.search(r"export const wordmark: LogoArt = \{(.*?)\n\};", source, re.S).group(1)
        number = lambda key: float(re.search(rf"{key}: (\d+)", block).group(1))
        path = lambda key: re.search(rf"{key}:\s*'([^']+)'", block).group(1)
        width, art_height, inset = number("width"), number("height"), number("inset")
        scale = height * MM / art_height
        left = centre_x - width * height / art_height / 2
        # The traced paths carry a margin (inset); the artwork itself starts there.
        transform = self.place(left, top, scale, flip=True, origin=(inset, inset))
        for key, colour in (("primary", white), ("accent", accent)):
            pen = PdfPen()
            parse_path(path(key), TransformPen(pen, transform))
            self.fill(colour, pen.ops, even_odd=True)

    def text(self, colour: str, font: TTFont, text: str, size_pt: float, centre_x: float,
             baseline: float):
        cmap, glyphs, metrics = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
        names = [cmap[ord(c)] for c in text]
        scale = size_pt / font["head"].unitsPerEm
        x = centre_x - sum(metrics[n][0] for n in names) * scale / MM / 2
        pen = PdfPen(glyphs)
        for name in names:
            glyphs[name].draw(TransformPen(pen, self.place(x, baseline, scale, flip=False)))
            x += metrics[name][0] * scale / MM
        self.fill(colour, pen.ops)

    def qr(self, colour: str, matrix: list[list[bool]], x: float, y: float, size: float):
        module = size / len(matrix)
        ops = []
        for r, row in enumerate(matrix):
            for start, length in runs(row):
                # A hair taller than a module, so no seams show between rows.
                bottom = PAGE_H - y - (r + 1) * module
                ops.append(f"{(x + start * module) * MM:.3f} {bottom * MM - 0.02:.3f} "
                           f"{length * module * MM:.3f} {module * MM + 0.04:.3f} re")
        self.fill(colour, ops)

    def pdf(self, title: str) -> bytes:
        stream = zlib.compress("\n".join(self.ops).encode("ascii"), 9)
        width, height = PAGE_W * MM, PAGE_H * MM
        objects = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width:.2f} {height:.2f}] "
            f"/TrimBox [0 0 {width:.2f} {height:.2f}] /Contents 4 0 R /Resources << >> >>".encode(),
            f"<< /Length {len(stream)} /Filter /FlateDecode >>\nstream\n".encode() + stream
            + b"\nendstream",
            f"<< /Title ({title}) /Producer (scripts/make-table-card.py) >>".encode(),
        ]
        out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets = []
        for number, body in enumerate(objects, start=1):
            offsets.append(len(out))
            out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"
        xref = len(out)
        out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
        out += b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets)
        out += (f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R /Info 5 0 R >>\n"
                f"startxref\n{xref}\n%%EOF\n").encode()
        return bytes(out)


def font(name: str, weight: int | None = None) -> TTFont:
    loaded = TTFont(FONTS / name)
    return instancer.instantiateVariableFont(loaded, {"wght": weight}) if weight else loaded


def qr_svg(matrix: list[list[bool]], colour: str) -> str:
    size = len(matrix) + 2 * QUIET_ZONE
    path = "".join(f"M{QUIET_ZONE + start} {QUIET_ZONE + r}h{length}v1h-{length}z"
                   for r, row in enumerate(matrix) for start, length in runs(row))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
            f'shape-rendering="crispEdges">\n<rect width="{size}" height="{size}" fill="#fff"/>\n'
            f'<path fill="{colour}" d="{path}"/>\n</svg>\n')


def qr_png(matrix: list[list[bool]], colour: str, pixels_per_module: int) -> Image.Image:
    size = (len(matrix) + 2 * QUIET_ZONE) * pixels_per_module
    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    for r, row in enumerate(matrix):
        for start, length in runs(row):
            x0 = (QUIET_ZONE + start) * pixels_per_module
            y0 = (QUIET_ZONE + r) * pixels_per_module
            draw.rectangle((x0, y0, x0 + length * pixels_per_module - 1,
                            y0 + pixels_per_module - 1), fill=colour)
    return image


def main() -> None:
    url = sys.argv[1] if len(sys.argv) > 1 else "https://rasel-kitchen.app"
    address = re.sub(r"^https?://|/$", "", url)
    OUT.mkdir(exist_ok=True)

    matrix = qr_matrix(url)
    print(f"QR code for {url}: {len(matrix)}×{len(matrix)} modules, correction level {CORRECTION}")

    centre = PAGE_W / 2
    card = Card()
    # A violet panel with the logo, inset from the edges so no printer crops it.
    card.rounded_rect(VIOLET, 6, 6, PAGE_W - 12, 54, 4)
    card.logo(centre, 15, 36, white="#ffffff", accent=ORANGE)
    card.text(INK, font("alegreya-bold.woff2"), "Мәзір · Меню", 22, centre, 73)
    card.text(INK_SOFT, font("onest-wght.woff2", 400), "QR-кодты сканерлеңіз · Отсканируйте QR-код",
              8, centre, 79.5)
    # 44 mm across: easy to scan from a seat, about 1.5 mm per module.
    card.qr(INK, matrix, centre - 22, 85, 44)
    card.text(DEEP, font("onest-wght.woff2", 600), address, 12, centre, 138)

    pdf_path, png_path = OUT / "table-card.pdf", OUT / "table-card.png"
    pdf_path.write_bytes(card.pdf("Rasel Kitchen table card"))
    read_back = swift("render", str(pdf_path), str(png_path), str(DPI))
    if read_back != [url]:
        raise SystemExit(f"The card's QR code reads as {read_back}, not {url}")

    (OUT / "qr-code.svg").write_text(qr_svg(matrix, INK))
    qr_png(matrix, INK, 32).save(OUT / "qr-code.png", optimize=True)
    if swift("read", str(OUT / "qr-code.png")) != [url]:
        raise SystemExit("qr-code.png does not read back correctly")

    for path in (pdf_path, png_path, OUT / "qr-code.svg", OUT / "qr-code.png"):
        print(f"  {path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")
    print(f"Checked: both codes read back as {url}")


if __name__ == "__main__":
    main()
