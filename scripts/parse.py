import json, re, os, sys, unicodedata
import pymupdf

PDF = '/Users/ravi/Downloads/Clean nutrition - maaltijden.pdf'
JSN = '/Users/ravi/Downloads/groei-maatje-recepten (2).json'
OUT = sys.argv[1]  # project root
IMG_DIR = os.path.join(OUT, 'public', 'img', 'recepten')
os.makedirs(IMG_DIR, exist_ok=True)

doc = pymupdf.open(PDF)
src = json.load(open(JSN))


def spans(page):
    out = []
    for b in page.get_text('dict')['blocks']:
        for l in b.get('lines', []):
            for s in l['spans']:
                if s['text'].strip():
                    out.append(dict(x=s['bbox'][0], y=s['bbox'][1], size=round(s['size'], 1),
                                    font=s['font'], color=s['color'], text=s['text'].strip()))
    return out


# --- split into recipes (title = 17pt bold near top) ---
recipes = []
for i in range(3, doc.page_count):
    ss = spans(doc[i])
    titles = [s for s in ss if s['size'] == 17.0 and s['y'] < 100]
    if titles:
        recipes.append({'page': i, 'spans': ss})

print('pdf recipes', len(recipes), 'json', len(src))
assert len(recipes) == len(src)

NUM = r'(\d+(?:[.,]\d+)?)'


def num(s):
    return float(s.replace(',', '.'))


def parse_ingredients(ss):
    hdr = [s for s in ss if s['text'].startswith('INGREDI')]
    if not hdr:
        return [], None
    y0 = hdr[0]['y']
    col = [s for s in ss if s['x'] < 255 and s['y'] > y0 + 5]
    basis = next((s['text'] for s in col if s['font'].endswith('Italic') and s['size'] == 8.0), None)
    col = [s for s in col if not (s['font'].endswith('Italic') and s['size'] == 8.0)]
    right = sorted([s for s in col if s['x'] > 150], key=lambda s: s['y'])
    left = sorted([s for s in col if s['x'] <= 150], key=lambda s: s['y'])
    # item starts: left name lines (9pt regular dark) whose y matches a right anchor
    anchors = []
    for r in right:
        if anchors and abs(anchors[-1]['y'] - r['y']) < 3:
            anchors[-1]['items'].append(r)
        else:
            anchors.append({'y': r['y'], 'items': [r]})
    items = []
    for k, a in enumerate(anchors):
        yend = anchors[k + 1]['y'] - 2 if k + 1 < len(anchors) else 1e9
        lines = [s for s in left if a['y'] - 2 <= s['y'] < yend]
        names = [s['text'] for s in lines if s['size'] == 9.0]
        hints = [s['text'] for s in lines if s['size'] == 7.5]
        optional = any(h.lower() == 'optioneel' for h in hints) or any(
            r['text'].lower() == 'optioneel' for r in a['items'])
        hints = [h for h in hints if h.lower() != 'optioneel']
        amt_txt = ' '.join(r['text'] for r in a['items'] if r['text'].lower() != 'optioneel')
        amount, unit = None, None
        m = re.fullmatch(NUM + r'\s*(.*)', amt_txt)
        if m:
            amount, unit = num(m.group(1)), m.group(2).strip()
        elif amt_txt:
            unit = amt_txt
        item = {'name': ' '.join(names).strip()}
        if amount is not None:
            item['amount'] = amount
        if unit:
            item['unit'] = unit
        if hints:
            item['hint'] = ' '.join(hints)
        if optional:
            item['optional'] = True
        if not item['name'] and items:
            items[-1]['unit'] = (items[-1].get('unit', '') + ' ' + item.get('unit', '')).strip()
            continue
        items.append(item)
    for it in items:
        patch(it)
    return items, basis


def patch(it):
    n, u = it['name'], it.get('unit', '')
    if n == 'Komkommer' and u.startswith('0,5'):
        it.update(amount=0.5, unit='komkommer')
    elif n == 'Chilivlokken' and u.startswith('1/2'):
        it.update(amount=1.5, unit='theelepel')
    elif n == 'hamburgerbroodjes luxe':
        it.update(name='Hamburgerbroodjes luxe', amount=2, unit='broodjes')
    elif n.startswith('AH Tortilla volkoren wraps') and 'mini' in (n + u):
        it.update(name='AH Tortilla volkoren wraps mini', amount=116, unit='g', hint='4× mini wrap')


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def mins(t):
    m = re.match(r'(\d+)', t or '')
    return int(m.group(1)) if m else 0


def clean_desc(r):
    d = r['description'].replace(r['title'], '', 1)
    d = re.sub(r'^\s*\((XL|Light)\)', '', d)
    d = re.split(r'Let op:|Jij eet', d)[0].strip()
    return d


def variant_label(r):
    d = r['description'].replace(r['title'], '', 1)
    m = re.match(r'\s*\((XL|Light)\)', d)
    return m.group(1) if m else 'Normaal'


def portion_label(r):
    m = re.search(r'Jij eet\s*(?:[\d,]+ porties?)\s*\(([^)]*)\)', r['description'])
    return m.group(1) if m else None


# Titles that belong to another dish (same meal, slightly different name)
MERGE = {'Havermoutpap basisrecept': 'Havermoutpap basis'}

dishes = {}
problems = []
for rec, r in zip(recipes, src):
    ss = rec['spans']
    title_pdf = ' '.join(s['text'] for s in ss if s['size'] == 17.0 and s['y'] < 100)
    title_pdf = re.sub(r'\s*\(\d+ kcal\)$', '', title_pdf)
    if title_pdf.replace(' ', '') != r['title'].replace(' ', ''):
        problems.append(('title', title_pdf, r['title']))
    kcal_pdf = next((s['text'] for s in ss if s['size'] == 14.0), None)
    if kcal_pdf and int(kcal_pdf) != r['macrosPerPortion']['kcal']:
        problems.append(('kcal', r['title'], kcal_pdf, r['macrosPerPortion']))
    ings, basis = parse_ingredients(ss)
    servings = 1
    if basis:
        m = re.search(r'(\d+)\s*porties', basis)
        if m:
            servings = int(m.group(1))
    if r.get('recipeServings') and r['recipeServings'] != servings:
        problems.append(('servings', r['title'], servings, r['recipeServings']))
    sub = ' '.join(s['text'] for s in ss if s['size'] == 7.5 and s['y'] < 100 and s['color'] == 0xa8873b)
    # image
    page = doc[rec['page']]
    imgs = page.get_images(full=True)
    base = MERGE.get(r['title'], r['title'])
    did = slug(base)
    vid = f"{did}-{r['macrosPerPortion']['kcal']}"
    img_path = None
    if imgs:
        pix = pymupdf.Pixmap(doc, imgs[0][0])
        if pix.n - pix.alpha >= 4:
            pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
        fn = f'{vid}.jpg'
        pix.save(os.path.join(IMG_DIR, fn), jpg_quality=82) if hasattr(pix, 'save') else None
        img_path = f'img/recepten/{fn}'
    if not ings:
        problems.append(('noings', r['title']))
    mp = r['macrosPerPortion']
    variant = {
        'id': vid,
        'label': variant_label(r),
        'title': r['title'],
        'kcal': mp['kcal'], 'eiwit': mp['eiwit'], 'kh': mp['kh'], 'vet': mp['vet'],
        'prep': mins(r['prepTime']), 'cook': mins(r['cookTime']),
        'servings': servings,
        'portionLabel': portion_label(r),
        'ingredients': ings,
        'steps': r['stepsPerPortion'],
        'image': img_path,
    }
    d = dishes.setdefault(did, {'id': did, 'title': base, 'description': clean_desc(r), 'variants': []})
    d['variants'].append(variant)

for d in dishes.values():
    d['variants'].sort(key=lambda v: v['kcal'])
    # choose a default: the 'Normaal' one if present
    labels = [v['label'] for v in d['variants']]
    for v in d['variants']:
        if labels.count(v['label']) > 1:
            v['label'] = f"{v['label']}"
    d['image'] = next((v['image'] for v in d['variants'] if v['label'] == 'Normaal' and v['image']),
                      d['variants'][0]['image'])

print('dishes', len(dishes))
print('problems', len(problems))
for p in problems:
    print(' ', p)
json.dump(list(dishes.values()), open(os.path.join(sys.argv[2]), 'w'), ensure_ascii=False, indent=1)
