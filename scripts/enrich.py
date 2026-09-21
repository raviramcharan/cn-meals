import json, re, sys

dishes = json.load(open(sys.argv[1]))

CAT_RULES = [
    ('ontbijt', r'havermout|oats|pap\b|rijstebloempap|chiapudding|pancakes|omelet|roerei|scrambled|muffins|jam en honing|yoghurt bowl|kwarkbowl|kwark met|shake'),
    ('lunch', r'broodje|boterham|tosti|wrap|crackers?\b|salade|pistolets|volkorenbrood|dubbeldekker|tuna melt|soep|omelet|roerei|scrambled'),
    ('tussendoortje', r'dadels|rijstwafels|maiswafels|komkommerbootjes|muffins|shake|kwarkbowl|kwark met|crackers? met'),
]
OVERRIDE = {
    'volkorencracker-met-avocado': ['lunch', 'tussendoortje'],
    'caesar-salade-met-gegrilde-kipfilet-en-volkoren-croutons': ['lunch', 'diner'],
    'zalmpasta-salade-met-erwtjes-en-citroendressing': ['lunch', 'diner'],
    'volkoren-couscoussalade-met-kip-en-gegrilde-groenten': ['lunch', 'diner'],
    'viral-komkommersalade-met-zalm': ['lunch', 'diner'],
    'courgettesoep-met-gerookte-zalm-en-aardappel': ['lunch', 'diner'],
    'smashed-hamburger-met-cheddar-en-huissaus': ['diner'],
    'volkorenwraps-met-gekruide-kip-avocado-zwarte-bonen-en-mais': ['lunch', 'diner'],
    'wraps-met-kip-paprika-en-avocado': ['lunch', 'diner'],
    'sweet-chili-kipwraps': ['lunch', 'diner'],
    'griekse-gehaktballetjes-met-salade-en-naan': ['diner'],
    'low-carb-pokebowl-met-zalm': ['lunch', 'diner'],
    'witte-boterham-met-jam-en-honing': ['ontbijt', 'lunch'],
}

MEAT = r'\bkip|kipfilet|rund|gehakt|\bham\b|rosbief|rookvlees|biefstuk|ribeye|carpaccio|spek|worst|beef|hamburger(?!broodje)|gehaktbal|runderrib|kalkoen|varken|bacon'
FISH = r'zalm|tonijn|garnal|\bvis\b|makreel|kabeljauw|ansjovis'
ANIMAL = r'melk|kwark|yoghurt|kaas|hüttenkäse|huttenkase|cottage|ei\b|eieren|\bei |honing|whey|boter\b|room|feta|mozzarella|burrata|parmezaan|skyr|mayo|tzatziki|gyoza'


def tags_for(d):
    v = d['variants'][0]
    names = ' | '.join(i['name'].lower() for vv in d['variants'] for i in vv['ingredients'])
    t = d['title'].lower()
    names_nov = re.sub(r'plantaardige?\s+\w+|vegan\w*|vega\w*', '', names)
    tags = []
    has_meat = re.search(MEAT, names_nov) or re.search(MEAT, re.sub(r'plantaardige? \w+', '', t))
    has_fish = re.search(FISH, names_nov) or re.search(FISH, t)
    if not has_meat and not has_fish:
        tags.append('vegetarisch')
        if 'vegan' in t or not re.search(ANIMAL, names_nov):
            tags.append('vegan')
    if has_fish:
        tags.append('vis')
    if 'glutenvrij' in t or 'gluten-' in t:
        tags.append('glutenvrij')
    if 'lactose' in t:
        tags.append('lactosevrij')
    if 'notenvrij' in t:
        tags.append('notenvrij')
    return tags


for d in dishes:
    cats = OVERRIDE.get(d['id'])
    if not cats:
        t = d['title'].lower()
        cats = [c for c, rx in CAT_RULES if re.search(rx, t)] or ['diner']
    d['categories'] = cats
    d['tags'] = tags_for(d)
    for v in d['variants']:
        v['ingredients'] = [i for i in v['ingredients'] if i['name']]
        for i in v['ingredients']:
            h = i.get('hint')
            if not h:
                continue
            if h.endswith(' · optioneel'):
                h = h[: -len(' · optioneel')]
                i['optional'] = True
            if h in ('Clean Nutrition', 'Albert Heijn', 'Albert Heijn Terra'):
                i['brand'] = h
                del i['hint']
                continue
            if not h[0].isdigit():
                h = '1× ' + h
            i['hint'] = h

json.dump(dishes, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for d in dishes:
    print(f"{d['id'][:60]:60} {','.join(d['categories']):28} {','.join(d['tags'])}")
