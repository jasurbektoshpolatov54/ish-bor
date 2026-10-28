import json, re, math, difflib, sys
D = json.load(open('raw.json'))
M = json.load(open('match.json'))
GN = [c for c in json.load(open(sys.argv[1])) if c.get('country') == 'UZ']
GNREG = {'01': 'UZ-AN', '02': 'UZ-BU', '03': 'UZ-FA', '05': 'UZ-XO', '06': 'UZ-NG', '07': 'UZ-NW', '08': 'UZ-QA', '09': 'UZ-QR',
         '10': 'UZ-SA', '12': 'UZ-SU', '13': 'UZ-TK', '14': 'UZ-TO', '15': 'UZ-JI', '16': 'UZ-SI'}
K, X0, Y0 = 3343.6624833383376, -3267.8471157240906, 2997.229057903864
rad = math.pi / 180
def inv(x, y):
    lng = (x - X0) / K / rad
    lat = (2 * math.atan(math.exp(-(y - Y0) / K)) - math.pi / 2) / rad
    return round(lat, 4), round(lng, 4)
def proj(lat, lng):
    return lng * rad * K + X0, -math.log(math.tan(math.pi / 4 + lat * rad / 2)) * K + Y0

def ph(s):
    s = s.lower().replace(' city', '')
    s = re.sub(r'\s+(shahri|tumani)$', '', s)
    for a, b in [('ŭ', 'u'), ('ü', 'u'), ('ö', 'o'), ('’', ''), ("'", ''), ('ʻ', ''), ('ʼ', '')]: s = s.replace(a, b)
    s = re.sub(r'[^a-z]', '', s)
    for a, b in [('dzh', 'j'), ('dj', 'j'), ('kh', 'h'), ('x', 'h'), ('ts', 's'), ('yo', 'o'), ('ya', 'a'), ('y', 'i'), ('q', 'k'), ('gh', 'g'), ('w', 'v'), ('ee', 'e')]: s = s.replace(a, b)
    s = re.sub(r'[aou]', 'a', s); s = re.sub(r'[ei]', 'e', s)
    return s

def ap(s):
    s = re.sub(r"([OoGg])'", '\\1‘', s)
    return s.replace("'", '’')

F = json.load(open('fit.json'))
def fix(x, y): return F['ax'][0] * x + F['ax'][1] * y + F['ax'][2], F['ay'][0] * x + F['ay'][1] * y + F['ay'][2]
shapes = {s['id']: s for v in D['shapes'].values() for s in v}
for s_ in shapes.values():
    s_['centroid'] = fix(*s_['centroid'])
    s_['d'] = re.sub(r'(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)', lambda m: '%.2f,%.2f' % fix(float(m.group(1)), float(m.group(2))), s_['d'])

def simplify(pts, tol):
    if len(pts) < 4: return pts
    def dp(a, b):
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1; L = math.hypot(dx, dy) or 1e-9
        bi, bd = -1, 0
        for i in range(a + 1, b):
            x, y = pts[i]; d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
            if d > bd: bi, bd = i, d
        if bd > tol: return dp(a, bi)[:-1] + dp(bi, b)
        return [pts[a], pts[b]]
    return dp(0, len(pts) - 1)

def rings(d):
    out = []
    for part in re.findall(r'M[^M]*', d):
        pts = [tuple(map(float, p.split(','))) for p in re.findall(r'-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?', part)]
        pts = simplify(pts, 0.35)
        if len(pts) >= 3: out.append(pts)
    return out
def enc(rs):
    return ' '.join(';'.join(f'{x:g},{y:g}' for x, y in ((round(a, 1), round(b, 1)) for a, b in r)) for r in rs)

def inside(rs, x, y):
    c = False
    for r in rs:
        n = len(r)
        for i in range(n):
            x1, y1 = r[i]; x2, y2 = r[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
    return c

def gnfind(name_en, name_uz, reg, shape_rs=None):
    best, bs = None, 0
    for c in GN:
        if GNREG.get(c['admin1']) != reg and not (reg in ('UZ-TK', 'UZ-TO') and GNREG.get(c['admin1']) in ('UZ-TK', 'UZ-TO')): continue
        s = max(difflib.SequenceMatcher(None, ph(n), ph(c['name'])).ratio() for n in (name_en, name_uz))
        if s > bs: best, bs = c, s
    return best, bs

REG = {r['iso']: r for r in D['regions']}
regions = []
for r in sorted(D['regions'], key=lambda r: ap(r['titles']['uz'])):
    regions.append({'id': r['iso'], 'name': ap(r['titles']['uz']), 'cyr': r['titles']['uzc'], 'ru': r['titles']['ru']})

OLDTK = {'Bektemir': (41.209, 69.334), 'Chilonzor': (41.275, 69.204), 'Mirobod': (41.287, 69.284), 'Mirzo Ulug‘bek': (41.338, 69.335), 'Olmazor': (41.352, 69.212), 'Sergeli': (41.227, 69.219), 'Shayxontohur': (41.326, 69.228), 'Uchtepa': (41.292, 69.169), 'Yakkasaroy': (41.283, 69.256), 'Yashnobod': (41.294, 69.336), 'Yangihayot': (41.205, 69.183), 'Yunusobod': (41.364, 69.287)}
KNOWN = {'Taxiatosh': (42.3167, 59.6), 'Keles sh.': (41.4033, 69.2072)}
# Toshkent shahri: ilovadagi mavjud 12 tuman nomi o‘zgarmaydi
OLD = {'Shayxontoxur': 'Shayxontohur', 'Sirg‘ali': 'Sergeli'}
places, shp, report = [], {}, []
dcoord = {}
for x in D['districts']:
    sid, sc = M['districts:' + x['slug']]
    name = OLD.get(ap(x['names']['uz']), ap(x['names']['uz']))
    rs = None
    if x['regionIso'] == 'UZ-TK':
        lat, lng = OLDTK[name]; src = 'old'
        if sc >= 0.95: rs = rings(shapes[sid]['d'])
    elif sc >= 0.8:
        lat, lng = inv(*shapes[sid]['centroid']); rs = rings(shapes[sid]['d']); src = 'shape'
    else:
        g, gs = gnfind(x['names']['en'], x['names']['uz'], x['regionIso'])
        if g and gs >= 0.8: lat, lng = round(float(g['lat']), 4), round(float(g['lng']), 4); src = 'gn:' + g['name']
        elif name in KNOWN: lat, lng = KNOWN[name]; src = 'known'
        else: lat, lng = inv(*shapes[sid]['centroid']); src = 'LOW shape ' + shapes[sid]['name']
    report.append((x['regionIso'], name, src, round(sc, 2)))
    dcoord[x['slug']] = (lat, lng)
    p = {'approx': True} if 'LOW' in src else {}
    p |= {'name': name, 'cyr': x['names']['uzc'], 'ru': x['names']['ru'], 'region': x['regionIso'], 'lat': lat, 'lng': lng}
    places.append(p)
    if rs: shp[name] = enc(rs)
for x in D['cities']:
    name = ap(x['names']['uz']) + ' sh.'
    g, gs = gnfind(x['names']['en'], x['names']['uz'], x['regionIso'])
    if g and gs >= 0.8: lat, lng = round(float(g['lat']), 4), round(float(g['lng']), 4); src = 'gn:' + g['name']
    else:
        sid, sc = M['cities:' + x['slug']]
        if sc >= 0.8: lat, lng = inv(*shapes[sid]['centroid']); src = 'shape ' + shapes[sid]['name']
        elif name in KNOWN: lat, lng = KNOWN[name]; src = 'known'
        else: lat, lng = dcoord.get(x['parentSlug'], (None, None)); src = 'LOW parent ' + x['parentSlug']
    report.append((x['regionIso'], name, src, round(gs, 2)))
    places.append({**({'approx': True} if 'LOW' in src else {}), 'name': name, 'cyr': x['names']['uzc'] + ' ш.', 'ru': 'г. ' + x['names']['ru'], 'region': x['regionIso'], 'lat': lat, 'lng': lng, 'city': True})

for r in report:
    if 'LOW' in r[2] or 'gn' in r[2] and r[3] < 0.9: print(r)
print(len(places), len(shp), sum(len(v) for v in shp.values()))
json.dump({'regions': regions, 'places': places, 'shapes': shp}, open('places.json', 'w'), ensure_ascii=False)
