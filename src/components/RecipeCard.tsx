import { Link } from 'react-router-dom'
import { CATEGORIES, defaultVariant, imgUrl, type Dish, type Variant } from '../lib/data'
import { useFavorites } from '../lib/store'
import { Icon, MacroBand } from './ui'

const catLabel = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]))

export default function RecipeCard({ dish, highlight }: { dish: Dish; highlight?: Variant }) {
  const { isFav, toggle } = useFavorites()
  const v = highlight ?? defaultVariant(dish)
  const fav = isFav(dish.id)
  const kcals = dish.variants.map((x) => x.kcal)
  return (
    <article data-reveal className="group relative">
      <Link
        to={`/recept/${dish.id}${highlight && highlight.id !== defaultVariant(dish).id ? `?v=${highlight.id}` : ''}`}
        className="block overflow-hidden rounded-[22px] border border-line bg-surface transition duration-500 ease-out-soft hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgb(20_38_31/0.45)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
          {v.image && (
            <img
              src={imgUrl(v.image)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition duration-700 ease-out-soft group-hover:scale-[1.04]"
            />
          )}
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            {dish.categories.slice(0, 2).map((c) => (
              <span key={c} className="rounded-full bg-surface/90 px-2.5 py-0.5 text-[11px] font-semibold text-ink backdrop-blur">
                {catLabel[c]}
              </span>
            ))}
          </div>
        </div>
        <div className="p-4 pb-5">
          <h3 className="line-clamp-2 min-h-[2.6em] font-display text-[1.15rem] font-semibold leading-[1.15]">{dish.title}</h3>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <p className="font-mono text-sm tabular">
              <span className="font-semibold text-ink">{v.kcal}</span>
              <span className="text-muted"> kcal · </span>
              <span className="text-eiwit">{v.eiwit}g</span>
              <span className="text-muted"> eiwit</span>
            </p>
            <p className="flex items-center gap-1 font-mono text-xs text-muted">
              <Icon name="clock" className="size-3.5" />
              {v.prep + v.cook}m
            </p>
          </div>
          <MacroBand m={v} className="mt-3 h-1" />
          {dish.variants.length > 1 && (
            <p className="mt-3 text-xs text-muted">
              {dish.variants.length} varianten · {Math.min(...kcals)}–{Math.max(...kcals)} kcal
            </p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={() => toggle(dish.id)}
        aria-pressed={fav}
        aria-label={fav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
        className={`absolute right-3 top-3 grid size-10 place-items-center rounded-full backdrop-blur transition active:scale-90 ${
          fav ? 'bg-vet text-white' : 'bg-surface/85 text-ink hover:bg-surface'
        }`}
      >
        <Icon name="heart" filled={fav} className="size-[18px]" />
      </button>
    </article>
  )
}
