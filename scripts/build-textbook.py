"""Generate the full calculus reader from the same PDF offered for download."""
import hashlib
import json
import re
from pathlib import Path
import fitz

root = Path(__file__).resolve().parents[1]
catalog = root / 'materials.js'
prefix = 'const MATERIALS='
materials = json.loads(catalog.read_text().removeprefix(prefix).rstrip().removesuffix(';'))
book = next(material for material in materials if material['id'] == 'book')
pdf_path = root / book['downloads'][0]['url']

def printed_folio(number):
    # This edition numbers its preliminaries, chapters, appendix, and index separately.
    front = ('i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x', 'xi', 'xii')
    if number <= len(front):
        return front[number - 1]
    if number <= 790:
        return str(number - 12)
    if number <= 796:
        return f'A-{number - 790}'
    if number <= 805:
        return f'I-{number - 796}'
    return None

def searchable_text(page):
    # Drop the printer's job line. Its draft pagination can differ from the final folio.
    text = re.sub(r'(?im)^\s*VARBM[^\n]+\.QXP[^\n]*\bPage [\divxlcdm]+[ \t]*$', '', page.get_text(sort=True))
    # Retain line breaks without transferring padding between PDF columns to the reader.
    return re.sub(r'[ \t]+', ' ', text).strip()

# Recheck the printed pagination when replacing the source edition.
if hashlib.sha256(pdf_path.read_bytes()).hexdigest() != '0d0d9af7881576936dff8a2c92efa7b6751198b278e0790cff558911f6800689':
    raise ValueError('Recheck the printed folios for this edition before rebuilding.')
pages = []
with fitz.open(pdf_path) as document:
    for number, page in enumerate(document, 1):
        target = pdf_path.parent / f'{number}.jpg'
        scale = 1050 / page.rect.width
        page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False).save(target, jpg_quality=85)
        pages.append(dict(image=target.relative_to(root).as_posix(), text=searchable_text(page), printedPage=printed_folio(number)))
    assert len(pages) == document.page_count
book.update(name='Calculus: Early Transcendentals · 微积分教材', pages=pages)
catalog.write_text(prefix + json.dumps(materials, ensure_ascii=False) + ';\n')
print(f'Built {len(pages)} sequential textbook pages.')
