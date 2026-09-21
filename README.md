# Groei-maatje keuken

Recepten en voedingsschema's als statische site, gebouwd met Vite, React, Tailwind, GSAP en Three.js.
Er is geen database: de recepten staan als JSON in de repo, en alles wat je aanpast (weekmenu's, porties, favorieten, thema) wordt in `localStorage` van je browser bewaard.

## Functies

- **Recepten**: zoeken op naam of ingrediënt, filteren op moment (ontbijt, lunch, diner, tussendoortje), dieet, kenmerken (eiwitrijk, koolhydraatarm, snel, meal-prep), kcal en bereidingstijd. De filters staan in de URL, dus je kunt een gefilterde lijst delen of bookmarken.
- **Varianten**: gerechten met een Light-, Normaal- of XL-versie staan samen op één pagina.
- **Porties**: pas de portie aan in stappen van een kwart. Ingrediënten, macro's en de grammen in de bereidingsstappen rekenen mee. Bij meal-prep recepten wissel je tussen "voor jou" en "hele recept".
- **Weekmenu**: het Groei-maatje weekmenu is het standaardschema. Je kunt schema's toevoegen, dupliceren, hernoemen en verwijderen, en per item de portie of het aantal grammen aanpassen. Je ziet dagtotalen tegenover je eigen doelen, en je kunt dagen kopiëren. Via "Back-up" exporteer en importeer je je schema's als JSON.
- **Favorieten** en een **donker thema**.

## Lokaal draaien

```bash
npm install
npm run dev
```

## Publiceren

Bij elke push naar `main` bouwt `.github/workflows/deploy.yml` de site en zet hem op GitHub Pages. Zet eenmalig **Settings → Pages → Source** op **GitHub Actions**.

> Let op: met een privé-repo (GitHub Pro) is de site zelf nog steeds openbaar voor iedereen die de URL kent. `robots.txt` en `noindex` houden zoekmachines weg.

## Data bijwerken

De bestanden in `src/data/` zijn gemaakt uit de Groei-maatje PDF's en de JSON-export met de scripts in `scripts/` (Python + PyMuPDF). De paden naar de bronbestanden staan bovenaan in `scripts/parse.py`.

```bash
python3 scripts/parse.py . /tmp/dishes_raw.json   # recepten, varianten en foto's uit de PDF
python3 scripts/enrich.py /tmp/dishes_raw.json src/data/recipes.json   # categorieën en dieettags
python3 scripts/schema.py src/data/recipes.json src/data   # standaard weekmenu en producten
```

Producten in het weekmenu (kwark, fruit, noten enz.) hebben kcal uit het schema. Hun eiwit, koolhydraten en vet zijn standaardwaarden per 100 g; pas ze aan in `scripts/schema.py` of `src/data/products.json`.
