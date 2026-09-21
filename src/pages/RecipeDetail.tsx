import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import { CATEGORIES, DIETS, defaultVariant, dishById, imgUrl, scaleMacros, type Ingredient } from '../lib/data'
import { fractions, niceAmount, portionsLabel, scaleStep } from '../lib/format'
import { useFavorites, usePortion } from '../lib/store'
import { Icon, MacroBand, MacroStats, PortionControl, reducedMotion, useReveal } from '../components/ui'
import AddToSchema from '../components/AddToSchema'

const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))
const dietLabel = Object.fromEntries(DIETS.map((d) => [d.id, d.label]))

export default function RecipeDetail() {
  const { id = '' } = useParams()
  const dish = dishById.get(id)
  if (!dish) return <NotFound />
  return <Detail key={dish.id} dishId={dish.id} />
}

function Detail({ dishId }: { dishId: string }) {
  const dish = dishById.get(dishId)!
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const variant = dish.variants.find((v) => v.id === params.get('v')) ?? defaultVariant(dish)
  const [portions, setPortions] = usePortion(variant.id)
  const [whole, setWhole] = useState(false)
  const [adding, setAdding] = useState(false)
  const { isFav, toggle } = useFavorites()
  const fav = isFav(dish.id)

  const m = scaleMacros(variant, portions)
  // factor applied to ingredient amounts (which are written for `servings` portions)
  const ingFactor = whole ? 1 : portions / variant.servings

  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-in]', { y: 24, autoAlpha: 0, duration: 0.8, stagger: 0.06, ease: 'power3.out' })
      gsap.from('[data-img]', { clipPath: 'inset(12% 12% 12% 12% round 28px)', scale: 1.08, duration: 1.2, ease: 'expo.out' })
    }, root)
    return () => ctx.revert()
  }, [])
  const stepsRef = useReveal<HTMLOListElement>('[data-reveal]', [variant.id])

  return (
    <div ref={root} className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6">
      <button
        type="button"
        onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}
        className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
      >
        <Icon name="back" className="size-4" /> Terug
      </button>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        {/* Image */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <div data-img className="relative aspect-[4/3] overflow-hidden rounded-[28px] bg-surface-2 lg:aspect-[4/5]">
              {variant.image && <img src={imgUrl(variant.image)} alt={dish.title} className="size-full object-cover" />}
              <button
                type="button"
                onClick={() => toggle(dish.id)}
                aria-pressed={fav}
                aria-label={fav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
                className={`absolute right-4 top-4 grid size-12 place-items-center rounded-full backdrop-blur transition active:scale-90 ${
                  fav ? 'bg-vet text-white' : 'bg-surface/85 text-ink'
                }`}
              >
                <Icon name="heart" filled={fav} />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {dish.tags.map((t) => (
                <Link key={t} to={`/?dieet=${t}`} className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft hover:border-ink">
                  {dietLabel[t]}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-7">
          <p data-in className="font-mono text-xs uppercase tracking-[0.16em] text-oat">
            {dish.categories.map((c) => catLabel[c]).join(' · ')}
          </p>
          <h1 data-in className="mt-3 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-bold leading-[0.95] tracking-[-0.03em]">
            {dish.title}
          </h1>
          <p data-in className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {dish.description}
          </p>

          {dish.variants.length > 1 && (
            <div data-in className="mt-7">
              <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Variant</p>
              <div role="radiogroup" aria-label="Kies een variant" className="inline-flex flex-wrap gap-1 rounded-2xl bg-surface-2 p-1">
                {dish.variants.map((v) => {
                  const on = v.id === variant.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        const next = new URLSearchParams(params)
                        v.id === defaultVariant(dish).id ? next.delete('v') : next.set('v', v.id)
                        setParams(next, { replace: true })
                      }}
                      className={`rounded-xl px-4 py-2 text-left transition duration-300 ${on ? 'bg-surface shadow-sm' : 'hover:bg-surface/50'}`}
                    >
                      <span className="block text-sm font-semibold">{v.label}</span>
                      <span className="block font-mono text-xs text-muted">{v.kcal} kcal · {v.eiwit}g eiwit</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Portion + macros card */}
          <section data-in className="mt-8 rounded-[24px] border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Jij eet</p>
                <p className="font-display text-3xl font-semibold">
                  {portionsLabel(portions)}
                  {variant.portionLabel && (
                    <span className="ml-2 text-base font-normal text-muted">
                      ({portions === 1 ? variant.portionLabel : `${fractions(portions)} × ${variant.portionLabel}`})
                    </span>
                  )}
                </p>
              </div>
              <p className="flex items-center gap-3 font-mono text-xs text-muted">
                <Icon name="clock" className="size-4" />
                {variant.prep > 0 && <span>Voorbereiden {variant.prep} min</span>}
                {variant.cook > 0 && <span>Bereiden {variant.cook} min</span>}
              </p>
            </div>
            <div className="mt-5">
              <PortionControl value={portions} onChange={setPortions} />
            </div>
            <div className="mt-7 border-t border-line pt-6">
              <MacroStats m={m} size="lg" />
              <MacroBand m={m} animate className="mt-5 h-2" />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:opacity-90 active:scale-[0.98]"
              >
                <Icon name="plus" className="size-4" /> Zet in weekmenu
              </button>
              {portions !== 1 && (
                <button type="button" onClick={() => setPortions(1)} className="rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-ink">
                  Terug naar 1 portie
                </button>
              )}
            </div>
          </section>

          {/* Ingredients */}
          <section className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-3xl font-semibold">Ingrediënten</h2>
              {variant.servings > 1 && (
                <div className="inline-flex rounded-full bg-surface-2 p-1 text-sm">
                  <button type="button" onClick={() => setWhole(false)} className={`rounded-full px-3 py-1.5 font-semibold transition ${!whole ? 'bg-surface shadow-sm' : 'text-muted'}`}>
                    Voor jou ({fractions(portions)})
                  </button>
                  <button type="button" onClick={() => setWhole(true)} className={`rounded-full px-3 py-1.5 font-semibold transition ${whole ? 'bg-surface shadow-sm' : 'text-muted'}`}>
                    Hele recept ({variant.servings})
                  </button>
                </div>
              )}
            </div>
            {variant.servings > 1 && (
              <p className="mt-2 text-sm text-muted">
                {whole
                  ? `Alles wat je nodig hebt om ${variant.servings} porties in één keer te maken, handig voor boodschappen of meal-prep.`
                  : `Het recept is voor ${variant.servings} porties. Hieronder staat alleen jouw deel.`}
              </p>
            )}
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {variant.ingredients.map((ing, i) => (
                <IngredientRow key={i} ing={ing} f={ingFactor} />
              ))}
            </ul>
          </section>

          {/* Steps */}
          <section className="mt-12">
            <h2 className="font-display text-3xl font-semibold">Bereiding</h2>
            <p className="mt-2 text-sm text-muted">
              Hoeveelheden in de stappen zijn omgerekend naar {portionsLabel(portions)}.
            </p>
            <ol ref={stepsRef} className="mt-6 space-y-3">
              {variant.steps.map((s, i) => (
                <li key={i} data-reveal className="grid grid-cols-[2.5rem_1fr] gap-3 rounded-2xl bg-surface p-4 sm:p-5">
                  <span className="font-display text-2xl font-bold leading-none text-oat">{i + 1}</span>
                  <p className="leading-relaxed">
                    {scaleStep(s, portions).map((p, j) =>
                      p.scaled ? (
                        <mark key={j} className="rounded-md bg-kh/20 px-1 font-mono text-[0.92em] font-medium text-ink">
                          {p.text}
                        </mark>
                      ) : (
                        <span key={j}>{p.text}</span>
                      ),
                    )}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <AddToSchema open={adding} onClose={() => setAdding(false)} dishId={dish.id} variantId={variant.id} portions={portions} />
    </div>
  )
}

function IngredientRow({ ing, f }: { ing: Ingredient; f: number }) {
  const hint = ing.hint?.replace(/^(\d+(?:[.,]\d+)?)×/, (_, n) => `${fractions(parseFloat(n.replace(',', '.')) * f)}×`)
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="font-medium">{ing.name}</span>
        {ing.optional && <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">optioneel</span>}
        {(hint || ing.brand) && <span className="block text-sm text-muted">{[hint, ing.brand].filter(Boolean).join(' · ')}</span>}
      </span>
      <span className="shrink-0 font-mono text-sm tabular">
        {ing.amount !== undefined ? (
          <>
            <span className="font-semibold">{niceAmount(ing.amount * f, ing.unit)}</span> <span className="text-muted">{ing.unit}</span>
          </>
        ) : (
          <span className="text-muted">{ing.unit ?? ''}</span>
        )}
      </span>
    </li>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-40 text-center">
      <h1 className="font-display text-4xl font-bold">Recept niet gevonden</h1>
      <p className="mt-3 text-muted">Dit recept bestaat niet (meer). Kies een ander gerecht uit het overzicht.</p>
      <Link to="/" className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper">
        Naar alle recepten
      </Link>
    </div>
  )
}
