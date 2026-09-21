import json, sys

dishes = {d['id']: d for d in json.load(open(sys.argv[1]))}
out_dir = sys.argv[2]

# Products: kcal per 100 g/ml taken from the schema, macros per 100 g/ml are standard reference values.
P = {
    'franse-magere-kwark': ('Franse Magere Kwark', 'g', 59.2, 8.9, 4.3, 0.3, [('1 halve portie', 250), ('1 portie', 500)]),
    'whey-banaan': ('Whey Protein Banaan', 'g', 394.3, 75, 8, 6, [('1 scoop', 35)]),
    'notenmix': ('Notenmix ongezouten', 'g', 600, 20, 10, 53, [('1 handje', 30)]),
    'blauwe-bessen': ('Blauwe bessen', 'g', 53.3, 0.7, 11.5, 0.3, [('1 handje', 30)]),
    'ei-gekookt': ('Ei gekookt', 'g', 154.5, 12.5, 0.7, 11, [('1 ei (M)', 55)]),
    'snoepgroente-tomaat': ('AH Snoepgroente tomaat', 'g', 31, 1.1, 5.5, 0.3, [('1 bakje', 100)]),
    'snoepgroente-komkommer': ('AH Snoepgroente komkommer', 'g', 13, 0.7, 2, 0.1, [('1 bakje', 100)]),
    'snoepgroente-paprika': ('AH Snoepgroente paprika', 'g', 25, 1, 5, 0.2, [('1 bakje', 100)]),
    'mandarijn': ('Mandarijn', 'g', 52.9, 0.8, 12, 0.3, [('1 mandarijn', 70)]),
    'pure-chocolade-70': ('Delicata Reep extra pure chocolade 70%', 'g', 540, 9, 33, 40, [('1 stukje', 25)]),
    'dadel-medjool': ('Dadel Medjool', 'g', 277, 1.8, 75, 0.2, [('1 dadel', 24)]),
    'kiwi': ('Kiwi', 'g', 61.3, 1.1, 12, 0.5, [('1 kiwi', 80)]),
    'muesli-naturel': ('Muesli naturel', 'g', 380, 10, 60, 7, [('1 portie', 40)]),
    'melkunie-protein-bosbes': ('Melkunie Protein bosbes kwark', 'g', 71, 10, 6, 0.4, [('1 portie', 200)]),
    'golden-bar-white-raspberry': ('Golden Bar White Chocolate Raspberry', 'g', 376, 40, 28, 12, [('1 bar', 50)]),
    'ovenfriet': ('Ovenfriet', 'g', 130, 2.5, 20, 4, [('1 portie', 250)]),
    'mayonaise': ('Zaanse mayonaise', 'g', 735, 1, 1.5, 80, [('1 eetlepel', 20)]),
    'banaan': ('Banaan', 'g', 89.2, 1.1, 20, 0.3, [('1 middelgrote', 120)]),
    'protein-pancakes-vanille': ('Protein Pancakes Vanille', 'g', 376, 38, 42, 5, [('1 scoop', 25)]),
    'olijfolie': ('Olijfolie', 'ml', 820, 0, 0, 91, [('1 eetlepel', 15), ('1 theelepel', 5)]),
    'honing': ('Honing', 'g', 307, 0.3, 82, 0, [('1 theelepel', 7)]),
    'appel': ('Appel', 'g', 52, 0.3, 12, 0.2, [('1 appel', 150)]),
}
products = [dict(id=k, name=v[0], unit=v[1], per100=dict(kcal=v[2], eiwit=v[3], kh=v[4], vet=v[5]),
                 servings=[dict(label=l, amount=a) for l, a in v[6]]) for k, v in P.items()]


def R(dish, kcal, portions=1, note=None):
    d = dishes[dish]
    v = min(d['variants'], key=lambda v: abs(v['kcal'] - kcal / portions))
    it = dict(type='recipe', dish=dish, variant=v['id'], portions=portions)
    if abs(v['kcal'] * portions - kcal) > 3:
        print('  !! kcal mismatch', dish, kcal, v['kcal'], portions)
    if note:
        it['leftover'] = note
    return it


def I(pid, amount, label=None):
    it = dict(type='product', product=pid, amount=amount)
    if label:
        it['label'] = label
    return it


days = [
    ('Maandag', dict(
        ontbijt=[R('overnight-oats-met-mango-sinaasappel-en-amandelen', 404)],
        lunch=[R('volkorencracker-met-avocado', 426, 3), I('ei-gekookt', 55, '1 ei (M)'), I('snoepgroente-tomaat', 100)],
        diner=[R('gebakken-aardappelschijfjes-met-gehaktballen-en-geroosterde-groente', 547)],
        tussendoortje=[I('franse-magere-kwark', 250, '1 halve portie'), I('whey-banaan', 35, '1 scoop'), I('notenmix', 30, '1 handje'), I('blauwe-bessen', 30, '1 handje')])),
    ('Dinsdag', dict(
        ontbijt=[R('kwarkbowl-met-aardbeien-muesli-en-walnoten', 473), I('notenmix', 30, '1 handje')],
        lunch=[R('volkorenbrood-met-kipfilet', 356, 1.5, 4), I('snoepgroente-komkommer', 100)],
        diner=[R('ribeye-met-zoete-aardappel-en-geroosterde-groente-uit-de-airfryer', 644)],
        tussendoortje=[I('franse-magere-kwark', 250, '1 halve portie'), I('mandarijn', 140, '2 mandarijnen')])),
    ('Woensdag', dict(
        ontbijt=[R('avocado-banaan-shake-met-honing', 504)],
        lunch=[R('tonijnwrap', 357), I('snoepgroente-tomaat', 100)],
        diner=[R('laag-voor-laag-groente-lasagne-met-mager-rundergehakt', 549, 1, 4)],
        tussendoortje=[I('pure-chocolade-70', 25, '1 stukje'), I('dadel-medjool', 48, '2 dadels'), I('franse-magere-kwark', 250, '1 halve portie'), I('notenmix', 15)])),
    ('Donderdag', dict(
        ontbijt=[R('protein-oats-met-blauwe-bessen-en-cacao-nibs', 546)],
        lunch=[R('volkorenbrood-met-kipfilet', 356, 1.5, 2), I('snoepgroente-komkommer', 100)],
        diner=[R('laag-voor-laag-groente-lasagne-met-mager-rundergehakt', 549, 1, 3)],
        tussendoortje=[I('franse-magere-kwark', 250, '1 halve portie'), I('notenmix', 30, '1 handje'), I('kiwi', 80, '1 kiwi')])),
    ('Vrijdag', dict(
        ontbijt=[I('franse-magere-kwark', 375), I('blauwe-bessen', 30, '1 handje'), I('muesli-naturel', 25)],
        lunch=[R('high-protein-tosti-met-kipfilet-en-kaas', 476), I('snoepgroente-paprika', 100)],
        diner=[R('kikkererwten-en-spinazie-kokoscurry', 673)],
        tussendoortje=[I('melkunie-protein-bosbes', 200, '1 portie'), I('mandarijn', 140, '2 mandarijnen'), I('golden-bar-white-raspberry', 50, '1 bar')])),
    ('Zaterdag', dict(
        ontbijt=[R('proteineshake-met-vanille-en-blauwe-bessen', 313)],
        lunch=[R('broodje-caprese-met-pesto-en-mozzarella', 351), I('mandarijn', 140, '2 mandarijnen')],
        diner=[R('smashed-hamburger-met-cheddar-en-huissaus', 501), I('ovenfriet', 250, '1 portie'), I('snoepgroente-tomaat', 100), I('mayonaise', 20, '1 eetlepel')],
        tussendoortje=[I('banaan', 120, '1 middelgrote'), I('whey-banaan', 35, '1 scoop')])),
    ('Zondag', dict(
        ontbijt=[I('protein-pancakes-vanille', 50, '2 scoops'), I('olijfolie', 15, '1 eetlepel'), I('honing', 14, '2 theelepels'), I('blauwe-bessen', 30, '1 handje')],
        lunch=[R('tosti-met-kip-mozzarella-en-pesto', 447)],
        diner=[R('zalm-teriyaki-met-woknoedels-en-cashewnoten', 833, 1.17)],
        tussendoortje=[I('franse-magere-kwark', 375), I('appel', 150, '1 appel')])),
]
PDF_TOT = [(1974, 131, 179, 80), (1887, 136, 202, 58), (1946, 154, 212, 57), (1840, 135, 193, 56),
           (1909, 134, 187, 66), (1988, 133, 197, 75), (1948, 132, 178, 75)]

pmap = {p['id']: p for p in products}
vmap = {v['id']: v for d in dishes.values() for v in d['variants']}
for (name, meals), pdf in zip(days, PDF_TOT):
    t = dict(kcal=0, eiwit=0, kh=0, vet=0)
    for items in meals.values():
        for it in items:
            if it['type'] == 'recipe':
                v = vmap[it['variant']]
                for k in t: t[k] += v[k] * it['portions']
            else:
                p = pmap[it['product']]
                for k in t: t[k] += p['per100'][k] * it['amount'] / 100
    print(f"{name:10} ours {round(t['kcal']):5} {round(t['eiwit']):4} {round(t['kh']):4} {round(t['vet']):4}   pdf {pdf}")

schema = dict(
    id='default', name='Groei-maatje weekmenu', builtin=True,
    targets=dict(kcal=1927, eiwit=136, kh=193, vet=67),
    days=[dict(name=n, meals=m) for n, m in days],
)
json.dump(products, open(f'{out_dir}/products.json', 'w'), ensure_ascii=False, indent=1)
json.dump(schema, open(f'{out_dir}/schema-default.json', 'w'), ensure_ascii=False, indent=1)
