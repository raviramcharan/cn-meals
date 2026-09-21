import { useLayoutEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { CATEGORIES, DIETS, FEATURES, defaultVariant, dishes, type Category, type DietTag, type Dish, type Variant } from '../lib/data'
import { useFavorites, useSchemas } from '../lib/store'
import RecipeCard from '../components/RecipeCard'
import { Chip, Icon, reducedMotion, useReveal } from '../components/ui'

const Hero3D = lazy(() => import('../components/Hero3D'))

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const searchIndex = new Map(
  dishes.map((d) => [
    d.id,
    norm([d.title, d.description, ...d.variants.flatMap((v) => v.ingredients.map((i) => i.name))].join(' ')),
  ]),
)

const KCAL_MAX = 1300
const SORTS = [
  { id: 'naam', label: 'Naam (A–Z)' },
  { id: 'kcal-op', label: 'Kcal laag → hoog' },
  { id: 'kcal-af', label: 'Kcal hoog → laag' },
  { id: 'eiwit', label: 'Meeste eiwit' },
  { id: 'eiwitratio', label: 'Eiwit per kcal' },
  { id: 'tijd', label: 'Snelst klaar' },
]

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

export default function Recipes() {
  const [params, setParams] = useSearchParams()
  const { favs } = useFavorites()
  const { active } = useSchemas()
  const [panel, setPanel] = useState(false)

  const q = params.get('q') ?? ''
  const cats = list(params.get('cat')) as Category[]
  const diets = list(params.get('dieet')) as DietTag[]
  const feats = list(params.get('kenmerk'))
  const kmin = +(params.get('kmin') ?? 0)
  const kmax = +(params.get('kmax') ?? KCAL_MAX)
  const tmax = +(params.get('tijd') ?? 0)
  const onlyFav = params.get('fav') === '1'
  const sort = params.get('sort') ?? 'naam'

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }
  const toggleIn = (key: string, arr: string[], id: string) =>
    set(key, (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]).join(','))

  const results = useMemo(() => {
    const nq = norm(q.trim())
    const terms = nq.split(/\s+/).filter(Boolean)
    const out: { dish: Dish; v: Variant }[] = []
    for (const d of dishes) {
      if (onlyFav && !favs.includes(d.id)) continue
      if (cats.length && !cats.some((c) => d.categories.includes(c))) continue
      if (diets.length && !diets.every((t) => d.tags.includes(t))) continue
      if (terms.length && !terms.every((t) => searchIndex.get(d.id)!.includes(t))) continue
      const ok = (v: Variant) =>
        v.kcal >= kmin &&
        (kmax >= KCAL_MAX || v.kcal <= kmax) &&
        (!tmax || v.prep + v.cook <= tmax) &&
        feats.every((f) => FEATURES.find((x) => x.id === f)?.test(v) ?? true)
      const def = defaultVariant(d)
      const v = ok(def) ? def : d.variants.find(ok)
      if (v) out.push({ dish: d, v })
    }
    const by: Record<string, (a: (typeof out)[0], b: (typeof out)[0]) => number> = {
      naam: (a, b) => a.dish.title.localeCompare(b.dish.title, 'nl'),
      'kcal-op': (a, b) => a.v.kcal - b.v.kcal,
      'kcal-af': (a, b) => b.v.kcal - a.v.kcal,
      eiwit: (a, b) => b.v.eiwit - a.v.eiwit,
      eiwitratio: (a, b) => b.v.eiwit / b.v.kcal - a.v.eiwit / a.v.kcal,
      tijd: (a, b) => a.v.prep + a.v.cook - (b.v.prep + b.v.cook),
    }
    return out.sort(by[sort] ?? by.naam)
  }, [q, cats, diets, feats, kmin, kmax, tmax, onlyFav, favs, sort])

  const activeCount =
    diets.length + feats.length + (kmin > 0 || kmax < KCAL_MAX ? 1 : 0) + (tmax ? 1 : 0)
  const anyFilter = activeCount + cats.length + (q ? 1 : 0) + (onlyFav ? 1 : 0) > 0

  const gridKey = results.map((r) => r.dish.id).join('|')
  const gridRef = useReveal<HTMLDivElement>('[data-reveal]', [gridKey])

  const catCount = (c: Category) => dishes.filter((d) => d.categories.includes(c)).length
  const totalVariants = dishes.reduce((n, d) => n + d.variants.length, 0)

  return (
    <>
      <Hero
        q={q}
        onQ={(v) => set('q', v)}
        stats={[
          `${dishes.length} gerechten`,
          `${totalVariants} varianten`,
          `Weekmenu ${active.targets.kcal} kcal / dag`,
        ]}
      />

      <section id="recepten" className="relative z-10 -mt-6 rounded-t-[28px] bg-paper">
        {/* Filter bar */}
        <div className="sticky top-16 z-20 border-b border-line/70 bg-paper/85 pt-3 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              <Chip active={!cats.length} onClick={() => set('cat', null)}>
                Alles
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip key={c.id} active={cats.includes(c.id)} onClick={() => toggleIn('cat', cats, c.id)} count={catCount(c.id)}>
                  {c.label}
                </Chip>
              ))}
              <span className="mx-1 h-6 w-px shrink-0 bg-line" />
              <Chip active={onlyFav} onClick={() => set('fav', onlyFav ? null : '1')} count={favs.length}>
                <Icon name="heart" filled={onlyFav} className="size-3.5" /> Favorieten
              </Chip>
              <button
                type="button"
                onClick={() => setPanel((p) => !p)}
                aria-expanded={panel}
                className={`ml-auto inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  panel || activeCount ? 'bg-oat text-forest' : 'bg-surface-2 text-ink hover:bg-line'
                }`}
              >
                <Icon name="filter" className="size-4" />
                Filters
                {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-forest font-mono text-[10px] text-paper">{activeCount}</span>}
              </button>
            </div>
            <FilterPanel
              open={panel}
              diets={diets}
              feats={feats}
              kmin={kmin}
              kmax={kmax}
              tmax={tmax}
              sort={sort}
              onToggleDiet={(id) => toggleIn('dieet', diets, id)}
              onToggleFeat={(id) => toggleIn('kenmerk', feats, id)}
              onKcal={(a, b) => {
                const next = new URLSearchParams(params)
                a > 0 ? next.set('kmin', String(a)) : next.delete('kmin')
                b < KCAL_MAX ? next.set('kmax', String(b)) : next.delete('kmax')
                setParams(next, { replace: true })
              }}
              onTime={(t) => set('tijd', t ? String(t) : null)}
              onSort={(s) => set('sort', s === 'naam' ? null : s)}
            />
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">
              {results.length} {results.length === 1 ? 'gerecht' : 'gerechten'}
              {q && <> voor “{q}”</>}
            </p>
            <div className="flex items-center gap-3">
              <label className="hidden items-center gap-2 text-sm text-muted sm:flex">
                Sorteer
                <select
                  value={sort}
                  onChange={(e) => set('sort', e.target.value === 'naam' ? null : e.target.value)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              {anyFilter && (
                <button type="button" onClick={() => setParams({}, { replace: true })} className="text-sm font-semibold text-ink underline decoration-oat decoration-2 underline-offset-4">
                  Wis alles
                </button>
              )}
            </div>
          </div>

          <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map(({ dish, v }) => (
              <RecipeCard key={dish.id} dish={dish} highlight={v} />
            ))}
          </div>

          {!results.length && (
            <div className="mx-auto max-w-md py-20 text-center">
              <p className="font-display text-2xl font-semibold">Geen gerechten gevonden</p>
              <p className="mt-2 text-muted">
                {onlyFav && !favs.length
                  ? 'Je hebt nog geen favorieten. Tik op het hartje bij een recept om het hier te bewaren.'
                  : 'Probeer een ander zoekwoord of zet een paar filters uit.'}
              </p>
              <button type="button" onClick={() => setParams({}, { replace: true })} className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
                Toon alle gerechten
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

/* ---------------- Hero ---------------- */

function Hero({ q, onQ, stats }: { q: string; onQ: (v: string) => void; stats: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!ref.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
      tl.from('[data-hero-word]', { yPercent: 110, duration: 1.2, stagger: 0.08 })
        .from('[data-hero-fade]', { y: 20, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, '-=0.8')
      gsap.to('[data-hero-title]', {
        yPercent: -25,
        autoAlpha: 0.2,
        ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  const words = ['Wat', 'eet', 'je', 'vandaag?']
  return (
    <header ref={ref} className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-forest text-[#eef2ec]">
      <Suspense fallback={null}>
        <Hero3D />
      </Suspense>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgb(10_20_15/0.85),transparent_65%)]" />
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-20 pt-32 sm:px-6 sm:pb-24">
        <p data-hero-fade className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-[#dcb25a]">
          Groei-maatje keuken
        </p>
        <h1 data-hero-title className="font-display text-[clamp(3.2rem,11vw,9.5rem)] font-bold leading-[0.88] tracking-[-0.04em]">
          {words.map((w, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <span data-hero-word className="inline-block pr-[0.22em]">
                {i === 3 ? <span className="italic text-[#dcb25a]">{w}</span> : w}
              </span>
            </span>
          ))}
        </h1>
        <form
          data-hero-fade
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            document.getElementById('recepten')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })
          }}
          className="mt-10 flex max-w-2xl items-center gap-2 rounded-full bg-[#eef2ec] p-1.5 pl-5 text-[#14261f] shadow-2xl"
        >
          <Icon name="search" className="size-5 shrink-0 text-[#62736b]" />
          <input
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Zoek op gerecht of ingrediënt, bijv. kwark, zalm, havermout"
            aria-label="Zoek recepten"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-[#62736b]"
          />
          <button type="submit" className="shrink-0 rounded-full bg-[#14261f] px-5 py-2.5 text-sm font-semibold text-[#eef2ec] transition hover:bg-[#1f3a2f]">
            Bekijk
          </button>
        </form>
        <ul data-hero-fade className="mt-6 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-[#eef2ec]/70">
          {stats.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </header>
  )
}

/* ---------------- Filter panel ---------------- */

function FilterPanel(props: {
  open: boolean
  diets: DietTag[]
  feats: string[]
  kmin: number
  kmax: number
  tmax: number
  sort: string
  onToggleDiet: (id: string) => void
  onToggleFeat: (id: string) => void
  onKcal: (a: number, b: number) => void
  onTime: (t: number) => void
  onSort: (s: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) {
      el.style.height = props.open ? 'auto' : '0px'
      return
    }
    gsap.to(el, { height: props.open ? 'auto' : 0, duration: 0.5, ease: 'expo.out' })
  }, [props.open])

  const dietCount = (t: DietTag) => dishes.filter((d) => d.tags.includes(t)).length

  return (
    <div ref={ref} className="h-0 overflow-hidden" aria-hidden={!props.open} inert={!props.open}>
      <div className="grid gap-6 pb-6 pt-2 md:grid-cols-2 lg:grid-cols-4">
        <fieldset>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Dieet</legend>
          <div className="flex flex-wrap gap-1.5">
            {DIETS.map((d) => (
              <Chip key={d.id} active={props.diets.includes(d.id)} onClick={() => props.onToggleDiet(d.id)} count={dietCount(d.id)}>
                {d.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Kenmerken</legend>
          <div className="flex flex-wrap gap-1.5">
            {FEATURES.map((f) => (
              <Chip key={f.id} active={props.feats.includes(f.id)} onClick={() => props.onToggleFeat(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Kcal per portie: {props.kmin}–{props.kmax >= KCAL_MAX ? `${KCAL_MAX}+` : props.kmax}
          </legend>
          <label className="block text-xs text-muted">
            Minimaal
            <input type="range" className="scale" min={0} max={KCAL_MAX} step={50} value={props.kmin} onChange={(e) => props.onKcal(Math.min(+e.target.value, props.kmax - 50), props.kmax)} style={{ ['--fill' as string]: `${(props.kmin / KCAL_MAX) * 100}%` }} />
          </label>
          <label className="block text-xs text-muted">
            Maximaal
            <input type="range" className="scale" min={0} max={KCAL_MAX} step={50} value={props.kmax} onChange={(e) => props.onKcal(props.kmin, Math.max(+e.target.value, props.kmin + 50))} style={{ ['--fill' as string]: `${(props.kmax / KCAL_MAX) * 100}%` }} />
          </label>
        </fieldset>
        <fieldset>
          <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Totale tijd</legend>
          <div className="flex flex-wrap gap-1.5">
            {[0, 10, 20, 30, 45].map((t) => (
              <Chip key={t} active={props.tmax === t} onClick={() => props.onTime(t)}>
                {t ? `≤ ${t} min` : 'Maakt niet uit'}
              </Chip>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-muted sm:hidden">
            Sorteer
            <select value={props.sort} onChange={(e) => props.onSort(e.target.value)} className="flex-1 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      </div>
    </div>
  )
}
