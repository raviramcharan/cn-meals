import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CATEGORIES, dishById, type Category } from '../lib/data'
import { schemaActions, useSchemas } from '../lib/store'
import { fractions } from '../lib/format'
import { Modal, PortionControl } from './ui'

export default function AddToSchema({
  open,
  onClose,
  dishId,
  variantId,
  portions,
}: {
  open: boolean
  onClose: () => void
  dishId: string
  variantId: string
  portions: number
}) {
  const { schemas, active } = useSchemas()
  const navigate = useNavigate()
  const dish = dishById.get(dishId)!
  const [schemaId, setSchemaId] = useState(active.id)
  const [day, setDay] = useState(Math.min((new Date().getDay() + 6) % 7, 6))
  const [meal, setMeal] = useState<Category>(dish.categories[0])
  const [p, setP] = useState(portions)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (open) {
      setP(portions)
      setDone(false)
      setSchemaId(active.id)
    }
  }, [open, portions, active.id])

  const schema = schemas.find((s) => s.id === schemaId) ?? active

  return (
    <Modal open={open} onClose={onClose} title="Zet in weekmenu">
      {done ? (
        <div className="py-6 text-center">
          <p className="font-display text-2xl font-semibold">Toegevoegd</p>
          <p className="mt-2 text-muted">
            {dish.title} staat nu bij {CATEGORIES.find((c) => c.id === meal)?.label.toLowerCase()} op{' '}
            {schema.days[day].name.toLowerCase()} ({fractions(p)}×).
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink">
              Sluiten
            </button>
            <button
              type="button"
              onClick={() => {
                schemaActions.setActive(schema.id)
                navigate(`/weekmenu?dag=${day}`)
              }}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper"
            >
              Bekijk weekmenu
            </button>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            schemaActions.addItem(schema.id, day, meal, { type: 'recipe', dish: dishId, variant: variantId, portions: p })
            setDone(true)
          }}
          className="space-y-6"
        >
          {schemas.length > 1 && (
            <label className="block">
              <span className="mb-2 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Voedingsschema</span>
              <select value={schemaId} onChange={(e) => setSchemaId(e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2.5">
                {schemas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset>
            <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Dag</legend>
            <div className="grid grid-cols-7 gap-1">
              {schema.days.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDay(i)}
                  aria-pressed={day === i}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${day === i ? 'bg-ink text-paper' : 'bg-surface-2 hover:bg-line'}`}
                >
                  {d.name.slice(0, 2)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Moment</legend>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setMeal(c.id)}
                  aria-pressed={meal === c.id}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${meal === c.id ? 'bg-ink text-paper' : 'bg-surface-2 hover:bg-line'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Porties</p>
            <PortionControl value={p} onChange={setP} />
          </div>
          <button type="submit" className="w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper">
            Voeg toe aan {schema.days[day].name.toLowerCase()}
          </button>
        </form>
      )}
    </Modal>
  )
}
