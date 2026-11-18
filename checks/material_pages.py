#!/usr/bin/env python3
"""Read-only audit of every PDF and preview in both course libraries.

Run from any directory: python checks/material_pages.py
Dependencies: Node.js, PyMuPDF, Pillow, NumPy. No repository files are changed.
Use --json /tmp/material-pages.json to save a machine-readable report outside the site.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import time

import fitz
import numpy as np
from PIL import Image, ImageFilter, ImageOps


def load_materials(course: Path) -> list[dict]:
    # Execute the data file so appended MATERIALS.push(...) entries are included.
    source = r"""
const fs=require('fs'),vm=require('vm');
const sandbox=vm.createContext({});
vm.runInContext(fs.readFileSync(process.argv[1],'utf8')+';globalThis.out=MATERIALS',sandbox);
process.stdout.write(JSON.stringify(sandbox.out));
"""
    return json.loads(subprocess.check_output(['node', '-e', source, str(course/'materials.js')]))


def safe_path(course: Path, relative: str) -> Path:
    path = (course/relative).resolve()
    if not path.is_relative_to(course.resolve()):
        raise ValueError(f'Path escapes course directory: {relative}')
    return path


def open_original(course: Path, material: dict) -> fitz.Document | None:
    chunks = material.get('chunks')
    if chunks:
        return fitz.open(stream=b''.join(safe_path(course, p).read_bytes() for p in chunks), filetype='pdf')
    downloads = [x['url'] for x in material.get('downloads', []) if x.get('url', '').lower().endswith('.pdf')]
    path = safe_path(course, downloads[0]) if downloads else course/'materials'/material['id']/'original.pdf'
    return fitz.open(path) if path.exists() else None


def thumbnail(image: Image.Image) -> np.ndarray:
    image = ImageOps.exif_transpose(image).convert('L').resize((96, 128), Image.Resampling.LANCZOS)
    return np.asarray(image.filter(ImageFilter.GaussianBlur(.65)), dtype=np.float32)


def pdf_thumbnail(page: fitz.Page) -> np.ndarray:
    pix = page.get_pixmap(matrix=fitz.Matrix(180/page.rect.width, 180/page.rect.width),
                         alpha=False, colorspace=fitz.csGRAY)
    return thumbnail(Image.frombytes('L', (pix.width, pix.height), pix.samples))


def visible_folios(page: fitz.Page) -> list[str]:
    """Extract final folios in outer page margins, not prepress 'Page N' marks.

    The book has numeric, Roman, A-N and I-N folios. QXP prepress marks can disagree
    with the visible final folio, so they are never treated as the printed page.
    Restricting positions/font sizes avoids mistaking table cells for page numbers.
    """
    width, height = page.rect.width, page.rect.height
    candidates = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            spans = line.get('spans', [])
            text = ''.join(s['text'] for s in spans).strip()
            if not text or 'QXP' in text or re.search(r'\bPage\b', text):
                continue
            for span in spans:
                token = span['text'].strip()
                x0,y0,x1,y1 = span['bbox']
                if span['size'] < 10 or not (y1 < height*.11 or y0 > height*.91):
                    continue
                if y1 < height*.11 and not (x1 < width*.30 or x0 > width*.70):
                    continue
                if y0 > height*.91 and (span['size'] < 10.5 or not (x1 < width*.25 or x0 > width*.75)):
                    continue
                if re.fullmatch(r'(?:[AI]-\d+|\d{1,3}|[ivxlcdm]{1,6})',token):
                    candidates.append(token)
                else:
                    embedded=re.search(r'^(I-\d+)\s+Index$|^Index\s+(I-\d+)$',token)
                    if embedded:
                        candidates.append(next(g for g in embedded.groups() if g))
    return list(dict.fromkeys(candidates))


def audit_material(course: Path, material: dict, max_mae: float) -> dict:
    result = {'id': material['id'], 'name': material.get('name', ''), 'errors': [], 'warnings': []}
    errors, warnings = result['errors'], result['warnings']
    pdf = open_original(course, material)
    if pdf is None:
        if material.get('pages'):
            errors.append('Preview images exist but no PDF original was found')
        result.update(kind='non-pdf', physical=0, previews=len(material.get('pages', [])))
        return result
    previews = material.get('pages', [])
    result.update(kind='pdf', physical=len(pdf), previews=len(previews))
    if len(previews) != len(pdf):
        errors.append(f'Physical page count {len(pdf)} differs from preview count {len(previews)}')
    paths = [p.get('image') for p in previews]
    if len(paths) != len(set(paths)):
        errors.append('Duplicate preview image paths')
    scores, refs, signatures, mapped = [], [], [], []
    verified_folios, unconfirmed_folios = [], []
    for ordinal, entry in enumerate(previews, 1):
        try:
            path = safe_path(course, entry['image'])
            page_suffix = re.search(r'(\d+)$', path.stem)
            if not page_suffix:
                raise ValueError(f'Preview filename has no physical page suffix: {path.name}')
            physical = int(page_suffix.group(1))
            if physical != ordinal:
                errors.append(f'Preview ordinal {ordinal} maps to physical page {physical}, expected {ordinal}')
            if not 1 <= physical <= len(pdf):
                errors.append(f'Out-of-range physical page {physical}')
                continue
            page = pdf[physical-1]
            with Image.open(path) as image:
                image.load()  # Validate decoding, including truncated image files.
                ratio = image.width/image.height
                expected_ratio = page.rect.width/page.rect.height
                if abs(ratio/expected_ratio-1) > .015:
                    errors.append(f'Page {physical}: image/PDF aspect ratio differs by more than 1.5%')
                im = thumbnail(image)
            ref = pdf_thumbnail(page)
            mae = float(np.mean(np.abs(im-ref)))
            scores.append(mae)
            # Small image signatures allow a cheap all-pages ordering cross-check.
            signatures.append(np.asarray(Image.fromarray(im.astype('uint8')).resize((24,32)),dtype=np.float32).ravel())
            refs.append(np.asarray(Image.fromarray(ref.astype('uint8')).resize((24,32)),dtype=np.float32).ravel())
            mapped.append(physical)
            if mae > max_mae:
                errors.append(f'Page {physical}: preview does not match PDF rendering (MAE {mae:.2f}/255)')
            if material['id'] == 'book':
                folios = visible_folios(page)
                declared = entry.get('printedPage')
                if declared and declared in folios:
                    verified_folios.append({'physical':physical,'printed':declared})
                elif declared and not folios:
                    unconfirmed_folios.append({'physical':physical,'printed':declared})
                if declared and folios and declared not in folios:
                    warnings.append(f'PDF {physical}: declared folio {declared!r}; extracted marginal candidates {folios!r}')
        except Exception as exc:
            errors.append(f'Preview ordinal {ordinal}: {type(exc).__name__}: {exc}')
    if refs:
        # Only a substantially closer alternative indicates a possible ordering error.
        # Blank pages and identical repeated source pages may legitimately tie.
        a, b = np.asarray(signatures), np.asarray(refs)
        distance = np.maximum(0, (a*a).sum(1)[:,None]+(b*b).sum(1)[None,:]-2*(a@b.T))/a.shape[1]
        nearest = distance.argmin(axis=1)
        for i, j in enumerate(nearest):
            own, other = float(distance[i,i]), float(distance[i,j])
            if j != i and own > 4 and other < .45*own:
                errors.append(f'Possible wrong order: preview PDF {mapped[i]} much closer to source PDF {mapped[j]} '
                              f'(signature MSE {own:.2f} vs {other:.2f})')
    result['max_mae'] = round(max(scores, default=0), 3)
    if material['id'] == 'book':
        result['verified_folios'] = verified_folios
        result['unconfirmed_folios'] = unconfirmed_folios
        result['last_three'] = [{'physical':i+1,'declared':previews[i].get('printedPage') if i<len(previews) else None,
                                 'visible_folios':visible_folios(pdf[i]),'text_characters':len(pdf[i].get_text().strip())}
                                for i in range(max(0,len(pdf)-3),len(pdf))]
    pdf.close()
    return result


def main() -> int:
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--max-mae', type=float, default=12.0, help='Maximum blurred thumbnail absolute error, 0–255')
    parser.add_argument('--json', type=Path, help='Optional report path; no output file is written by default')
    args=parser.parse_args()
    start=time.monotonic()
    report=[]
    for name, course in [('calculus',args.root),('algebra',args.root/'algebra')]:
        for material in load_materials(course):
            try:
                row=audit_material(course,material,args.max_mae)
            except Exception as exc:
                row={'id':material.get('id'),'kind':'pdf','physical':0,'previews':0,
                     'errors':[f'{type(exc).__name__}: {exc}'],'warnings':[]}
            row['course']=name
            report.append(row)
            status='FAIL' if row['errors'] else 'PASS'
            print(f'{status} {name}/{row["id"]}: physical={row["physical"]}, previews={row["previews"]}'
                  f', max MAE={row.get("max_mae",0):.3f}',flush=True)
            for error in row['errors']:
                print('  ERROR '+error,flush=True)
            for warning in row.get('warnings',[]):
                print('  WARNING '+warning,flush=True)
            if row.get('last_three'):
                print('  LAST THREE '+json.dumps(row['last_three'],ensure_ascii=False),flush=True)
    pdfs=[r for r in report if r['kind']=='pdf']
    errors=sum(len(r['errors']) for r in report)
    summary={'pdfs':len(pdfs),'physical':sum(r['physical'] for r in pdfs),
             'previews':sum(r['previews'] for r in pdfs),'errors':errors,
             'warnings':sum(len(r.get('warnings',[])) for r in report),'seconds':round(time.monotonic()-start,1)}
    print('SUMMARY '+json.dumps(summary),flush=True)
    if args.json:
        args.json.write_text(json.dumps({'summary':summary,'materials':report},ensure_ascii=False,indent=2))
    return bool(errors)


if __name__=='__main__':
    sys.exit(main())
