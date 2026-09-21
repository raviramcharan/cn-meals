import { useMemo, useState } from 'react'
import { CATEGORIES, defaultVariant, dishes, imgUrl, products, type Category, type SchemaItem } from '../lib/data'
import { fmt0 } from '../lib/format'
import { useFavorites } from '../lib/store'
import { Icon, Modal } from './ui'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

type Tab = 'recept' | 'product' | 'eigen'

export default function AddItem({
  open,
  meal,
  dayName,
  onClose,
  onAdd,
}: {
  open: boolean
  meal: Category
  dayName: string
  onClose: () => void
  onAdd: (item: SchemaItem) => void
}) {
  const [tab, setTab] = useState<Tab>('recept')
  const [q, setQ] = useState('')
  const [onlyMeal, setOnlyMeal] = useState(true)
  const { isFav } = useFavorites()
  const [custom, setCustom] = useState({ name: '', kcal: 0, eiwit: 0, kh: 0, vet: 0 })
  const [grams, setGrams] = useState<Record<string, number>>({})

  const mealLabel = CATEGORIES.find((c) => c.id === meal)?.label.toLowerCase()

  const dishList = useMemo(() => {
    const t = norm(q.trim())
    return dishes
      .filter((d) => (!onlyMeal || d.categories.includes(meal)) && (!t || norm(d.title).includes(t)))
      .sort((a, b) => Number(isFav(b.id)) - Number(isFav(a.id)) || a.title.localeCompare(b.title, 'nl'))
  }, [q, onlyMeal, meal, isFav])

  const productList = useMemo(() => {
    const t = norm(q.trim())
    return products.filter((p) => !t || norm(p.name).includes(t))
  }, [q])

  const add = (item: SchemaItem) => {
    onAdd(item)
    onClose()
    setQ('')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recept', label: 'Recept' },
    { id: 'product', label: 'Product' },
    { id: 'eigen', label: 'Eigen item' },
  ]

  return (
    <Modal open={open} onClose={onClose} title={`${dayName}: ${mealLabel}`}>
      <div role="tablist" className="mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-surface-2 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-surface shadow-sm' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'eigen' && (
        <div className="mb-3 flex items-center gap-2 rounded-full border border-line px-4">
          <Icon name="search" className="size-4 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'recept' ? 'Zoek een recept' : 'Zoek een product'}
            aria-label="Zoeken"
            className="min-w-0 flex-1 bg-transparent py-2.5 outline-none"
          />
        </div>
      )}

      {tab === 'recept' && (
        <>
          <label className="mb-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={onlyMeal} onChange={(e) => setOnlyMeal(e.target.checked)} />
            Alleen recepten voor {mealLabel}
          </label>
          <ul className="space-y-1">
            {dishList.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-surface-2">
                {d.image && <img src={imgUrl(d.image)} alt="" loading="lazy" className="size-12 shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold">
                    {isFav(d.id) && <Icon name="heart" filled className="mr-1 inline size-3 text-vet" />}
                    {d.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {d.variants.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => add({ type: 'recipe', dish: d.id, variant: v.id, portions: 1 })}
                        className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition hover:border-ink hover:bg-ink hover:text-paper ${
                          v.id === defaultVariant(d).id ? 'border-ink-soft' : 'border-line'
                        }`}
                        aria-label={`Voeg ${d.title} ${v.label} (${v.kcal} kcal) toe`}
                      >
                        {d.variants.length > 1 && `${v.label} · `}
                        {v.kcal} kcal
                      </button>
                    ))}
                  </div>
                </div>
              </li>
            ))}
            {!dishList.length && <li className="py-8 text-center text-sm text-muted">Geen recepten gevonden.</li>}
          </ul>
        </>
      )}

      {tab === 'product' && (
        <ul className="space-y-1">
          {productList.map((p) => {
            const g = grams[p.id] ?? p.servings[0]?.amount ?? 100
            return (
              <li key={p.id} className="rounded-2xl p-3 hover:bg-surface-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="shrink-0 font-mono text-[11px] text-muted">{fmt0(p.per100.kcal)} kcal / 100{p.unit}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.servings.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => add({ type: 'product', product: p.id, amount: s.amount, label: s.label })}
                      className="rounded-full border border-line px-2.5 py-1 text-xs transition hover:border-ink hover:bg-ink hover:text-paper"
                    >
                      {s.label} · {s.amount}
                      {p.unit}
                    </button>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={g}
                      onChange={(e) => setGrams({ ...grams, [p.id]: +e.target.value })}
                      aria-label={`Hoeveelheid ${p.name} in ${p.unit}`}
                      className="w-16 rounded-full border border-line bg-surface px-2 py-1 text-center font-mono text-xs"
                    />
                    <span className="text-xs text-muted">{p.unit}</span>
                    <button
                      type="button"
                      disabled={!(g > 0)}
                      onClick={() => add({ type: 'product', product: p.id, amount: g })}
                      className="grid size-7 place-items-center rounded-full bg-ink text-paper disabled:opacity-30"
                      aria-label={`Voeg ${g}${p.unit} ${p.name} toe`}
                    >
                      <Icon name="plus" className="size-3.5" />
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
          {!productList.length && (
            <li className="py-8 text-center text-sm text-muted">
              Geen product gevonden. Voeg het toe als eigen item met de voedingswaarden van de verpakking.
            </li>
          )}
        </ul>
      )}

      {tab === 'eigen' && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!custom.name.trim()) return
            add({ type: 'custom', ...custom, name: custom.name.trim() })
            setCustom({ name: '', kcal: 0, eiwit: 0, kh: 0, vet: 0 })
          }}
          className="space-y-4"
        >
          <p className="text-sm text-muted">Voor iets dat niet in de recepten staat. Vul de waarden in voor de hoeveelheid die je eet.</p>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Naam</span>
            <input value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Bijv. Proteïnereep" className="w-full rounded-xl border border-line bg-surface px-3 py-2.5" />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ['kcal', 'Kcal'],
                ['eiwit', 'Eiwit (g)'],
                ['kh', 'Koolh. (g)'],
                ['vet', 'Vet (g)'],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-sm font-semibold">{l}</span>
                <input type="number" min={0} step="any" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: +e.target.value })} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono" />
              </label>
            ))}
          </div>
          <button type="submit" disabled={!custom.name.trim()} className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-40">
            Voeg toe aan {mealLabel}
          </button>
        </form>
      )}
    </Modal>
  )
}
