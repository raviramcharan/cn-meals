import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import gsap from 'gsap'
import {
  CATEGORIES,
  DAY_SHORT,
  dayMacros,
  imgUrl,
  itemMacros,
  productById,
  sumItems,
  variantById,
  type Category,
  type Macros,
  type Schema,
  type SchemaItem,
} from '../lib/data'
import { fmt0, fractions } from '../lib/format'
import { schemaActions, useSchemas } from '../lib/store'
import { Icon, MacroBand, MacroStats, Modal, PortionControl, reducedMotion } from '../components/ui'
import AddItem from '../components/AddItem'

export default function SchemaPage() {
  const { schemas, active } = useSchemas()
  const [params, setParams] = useSearchParams()
  const today = (new Date().getDay() + 6) % 7
  const day = Math.max(0, Math.min(6, +(params.get('dag') ?? today)))
  const setDay = (d: number) => {
    const next = new URLSearchParams(params)
    next.set('dag', String(d))
    setParams(next, { replace: true })
  }
  const [adding, setAdding] = useState<Category | null>(null)
  const [dialog, setDialog] = useState<null | 'new' | 'rename' | 'targets' | 'delete' | 'copy' | 'io'>(null)

  const totals = useMemo(() => active.days.map(dayMacros), [active])
  const avg = useMemo(
    () => totals.reduce((a, t) => ({ kcal: a.kcal + t.kcal / 7, eiwit: a.eiwit + t.eiwit / 7, kh: a.kh + t.kh / 7, vet: a.vet + t.vet / 7 }), { kcal: 0, eiwit: 0, kh: 0, vet: 0 }),
    [totals],
  )
  const d = active.days[day]

  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!root.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-in]', { y: 20, autoAlpha: 0, duration: 0.7, stagger: 0.05, ease: 'power3.out' })
    }, root)
    return () => ctx.revert()
  }, [])

  const dayRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!dayRef.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from('[data-meal]', { y: 16, autoAlpha: 0, duration: 0.5, stagger: 0.06, ease: 'power2.out' })
    }, dayRef)
    return () => ctx.revert()
  }, [day, active.id])

  return (
    <div ref={root} className="mx-auto max-w-7xl px-4 pb-28 pt-24 sm:px-6">
      {/* Header */}
      <div data-in className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-oat">Voedingsschema</p>
          <div className="mt-2 flex items-center gap-2">
            <label className="sr-only" htmlFor="schema-select">
              Kies voedingsschema
            </label>
            <div className="relative min-w-0">
              <select
                id="schema-select"
                value={active.id}
                onChange={(e) => schemaActions.setActive(e.target.value)}
                className="max-w-full cursor-pointer appearance-none truncate rounded-2xl bg-transparent py-1 pr-10 font-display text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none tracking-[-0.03em] hover:bg-surface-2"
              >
                {schemas.map((s) => (
                  <option key={s.id} value={s.id} className="text-base">
                    {s.name}
                  </option>
                ))}
              </select>
              <Icon name="down" className="pointer-events-none absolute right-2 top-1/2 size-6 -translate-y-1/2" />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            {schemas.length} {schemas.length === 1 ? 'schema' : "schema's"} · gemiddeld {fmt0(avg.kcal)} kcal en {fmt0(avg.eiwit)} g eiwit per dag
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ToolBtn icon="plus" onClick={() => setDialog('new')}>Nieuw schema</ToolBtn>
          <ToolBtn icon="copy" onClick={() => schemaActions.create(`${active.name} (kopie)`, active)}>Dupliceer</ToolBtn>
          <ToolBtn icon="edit" onClick={() => setDialog('rename')}>Hernoem</ToolBtn>
          <ToolBtn icon="target" onClick={() => setDialog('targets')}>Doelen</ToolBtn>
          <ToolBtn icon="download" onClick={() => setDialog('io')}>Back-up</ToolBtn>
          {active.id === 'default' ? (
            <ToolBtn icon="reset" onClick={() => setDialog('delete')}>Herstel</ToolBtn>
          ) : (
            <ToolBtn icon="trash" onClick={() => setDialog('delete')}>Verwijder</ToolBtn>
          )}
        </div>
      </div>

      {/* Week strip */}
      <div data-in className="no-scrollbar -mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[640px] grid-cols-7 gap-2">
          {active.days.map((dd, i) => {
            const t = totals[i]
            const pct = active.targets.kcal ? t.kcal / active.targets.kcal : 0
            const on = i === day
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDay(i)}
                aria-pressed={on}
                className={`group rounded-2xl border p-3 text-left transition duration-300 ${
                  on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface hover:border-ink-soft'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="font-display text-lg font-semibold capitalize">{DAY_SHORT[i]}</span>
                  {i === today && <span className={`size-1.5 rounded-full ${on ? 'bg-oat' : 'bg-oat'}`} title="Vandaag" />}
                </span>
                <span className={`mt-1 block font-mono text-sm tabular ${on ? 'text-paper' : ''}`}>{fmt0(t.kcal)}</span>
                <span className={`block font-mono text-[10px] ${on ? 'text-paper/60' : 'text-muted'}`}>
                  {fmt0(t.eiwit)}g eiwit
                </span>
                <span className={`mt-2 block h-1 overflow-hidden rounded-full ${on ? 'bg-paper/20' : 'bg-line'}`}>
                  <span
                    className={`block h-full rounded-full transition-[width] duration-700 ${pct > 1.08 ? 'bg-vet' : 'bg-oat'}`}
                    style={{ width: `${Math.min(pct, 1) * 100}%` }}
                  />
                </span>
                <span className="sr-only">{dd.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Day */}
      <div ref={dayRef} className="mt-10 grid gap-8 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <div className="rounded-[24px] border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
              Dag {day + 1} van 7{day === today ? ' · vandaag' : ''}
            </p>
            <h2 className="mt-1 font-display text-4xl font-bold">{d.name}</h2>
            <div className="mt-6">
              <MacroStats m={totals[day]} size="sm" target={active.targets} />
            </div>
            <MacroBand m={totals[day]} className="mt-5 h-2" />
            <Remaining total={totals[day]} target={active.targets} />
            <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
              <ToolBtn icon="copy" onClick={() => setDialog('copy')}>Kopieer dag</ToolBtn>
              <ToolBtn
                icon="trash"
                onClick={() => {
                  if (confirm(`Alles van ${d.name.toLowerCase()} verwijderen?`)) schemaActions.clearDay(active.id, day)
                }}
              >
                Leeg dag
              </ToolBtn>
            </div>
          </div>
        </aside>

        <div className="space-y-6 lg:col-span-8">
          {CATEGORIES.map((c) => {
            const items = d.meals[c.id] ?? []
            const sub = sumItems(items)
            return (
              <section key={c.id} data-meal className="rounded-[24px] border border-line bg-surface">
                <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
                  <h3 className="font-display text-2xl font-semibold">{c.label}</h3>
                  <p className="font-mono text-sm tabular text-muted">
                    <span className="font-semibold text-ink">{fmt0(sub.kcal)}</span> kcal · {fmt0(sub.eiwit)}g eiwit
                  </p>
                </header>
                <ul className="divide-y divide-line">
                  {items.map((it, idx) => (
                    <ItemRow
                      key={it.uid}
                      it={it}
                      schema={active}
                      first={idx === 0}
                      last={idx === items.length - 1}
                      onPatch={(p) => schemaActions.updateItem(active.id, day, c.id, it.uid!, p)}
                      onRemove={() => schemaActions.removeItem(active.id, day, c.id, it.uid!)}
                      onMove={(dir) => schemaActions.moveItem(active.id, day, c.id, it.uid!, dir)}
                      onGoDay={setDay}
                    />
                  ))}
                </ul>
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setAdding(c.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-3 text-sm font-semibold text-muted transition hover:border-ink hover:text-ink"
                  >
                    <Icon name="plus" className="size-4" /> Toevoegen aan {c.label.toLowerCase()}
                  </button>
                </div>
              </section>
            )
          })}
        </div>
      </div>

      {/* Week table */}
      <section className="mt-16">
        <h2 className="font-display text-3xl font-semibold">Weekoverzicht</h2>
        <div className="mt-4 overflow-x-auto rounded-[20px] border border-line bg-surface">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="px-4 py-3 font-medium">Dag</th>
                <th className="px-4 py-3 text-right font-medium">Kcal</th>
                <th className="px-4 py-3 text-right font-medium">Eiwit</th>
                <th className="px-4 py-3 text-right font-medium">Koolh.</th>
                <th className="px-4 py-3 text-right font-medium">Vet</th>
                <th className="w-1/4 px-4 py-3 font-medium">Verdeling</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {active.days.map((dd, i) => (
                <tr key={i} className={`border-b border-line last:border-0 ${i === day ? 'bg-surface-2' : ''}`}>
                  <td className="px-4 py-2.5">
                    <button type="button" onClick={() => { setDay(i); scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' }) }} className="font-semibold hover:underline">
                      {dd.name}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt0(totals[i].kcal)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt0(totals[i].eiwit)} g</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt0(totals[i].kh)} g</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt0(totals[i].vet)} g</td>
                  <td className="px-4 py-2.5"><MacroBand m={totals[i]} className="h-1.5" /></td>
                </tr>
              ))}
              <tr className="bg-surface-2/60 font-semibold">
                <td className="px-4 py-3">Gemiddeld</td>
                <td className="px-4 py-3 text-right font-mono">{fmt0(avg.kcal)}</td>
                <td className="px-4 py-3 text-right font-mono">{fmt0(avg.eiwit)} g</td>
                <td className="px-4 py-3 text-right font-mono">{fmt0(avg.kh)} g</td>
                <td className="px-4 py-3 text-right font-mono">{fmt0(avg.vet)} g</td>
                <td className="px-4 py-3"><MacroBand m={avg} className="h-1.5" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <AddItem open={adding !== null} meal={adding ?? 'ontbijt'} onClose={() => setAdding(null)} onAdd={(item) => adding && schemaActions.addItem(active.id, day, adding, item)} dayName={d.name} />
      <SchemaDialogs which={dialog} onClose={() => setDialog(null)} schema={active} day={day} />
    </div>
  )
}

function Remaining({ total, target }: { total: Macros; target: Macros }) {
  const diff = target.kcal - total.kcal
  const e = target.eiwit - total.eiwit
  if (!target.kcal) return null
  return (
    <p className="mt-4 text-sm text-ink-soft">
      {Math.abs(diff) < 40 ? (
        <>Precies op doel. </>
      ) : diff > 0 ? (
        <>Nog <b className="font-mono">{fmt0(diff)}</b> kcal ruimte. </>
      ) : (
        <><b className="font-mono text-vet">{fmt0(-diff)}</b> kcal boven je doel. </>
      )}
      {e > 5 && <>Nog <b className="font-mono text-eiwit">{fmt0(e)} g</b> eiwit te gaan.</>}
    </p>
  )
}

function ToolBtn({ icon, onClick, children }: { icon: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft transition hover:border-ink hover:text-ink"
    >
      <Icon name={icon} className="size-4" />
      {children}
    </button>
  )
}

/* ---------------- Item row ---------------- */

function ItemRow({
  it,
  schema,
  first,
  last,
  onPatch,
  onRemove,
  onMove,
  onGoDay,
}: {
  it: SchemaItem
  schema: Schema
  first: boolean
  last: boolean
  onPatch: (p: Partial<SchemaItem>) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
  onGoDay: (d: number) => void
}) {
  const m = itemMacros(it)
  let thumb: string | null = null
  let title = ''
  let sub = ''
  let link: string | null = null
  let control = null

  if (it.type === 'recipe') {
    const hit = variantById.get(it.variant)
    title = hit?.dish.title ?? 'Onbekend recept'
    if (hit) {
      thumb = hit.variant.image
      const pl = hit.variant.portionLabel
      const amount = pl ? (it.portions === 1 ? pl : `${fractions(it.portions)} × ${pl}`) : `${fractions(it.portions)} ${it.portions === 1 ? 'portie' : 'porties'}`
      sub = [hit.dish.variants.length > 1 ? `${hit.variant.label} (${hit.variant.kcal} kcal)` : null, amount].filter(Boolean).join(' · ')
      link = `/recept/${hit.dish.id}?v=${hit.variant.id}`
    }
    control = <PortionControl compact value={it.portions} onChange={(n) => onPatch({ portions: n })} />
  } else if (it.type === 'product') {
    const p = productById.get(it.product)
    title = p?.name ?? 'Onbekend product'
    const unit = p?.unit ?? 'g'
    sub = it.label ? `${it.label} · ${fmt0(it.amount)} ${unit}` : `${fmt0(it.amount)} ${unit}`
    const step = it.amount >= 100 ? 25 : 5
    control = (
      <div className="inline-flex items-center rounded-full border border-line bg-surface">
        <button type="button" aria-label="Minder" disabled={it.amount <= step} onClick={() => onPatch({ amount: it.amount - step, label: undefined })} className="grid size-8 place-items-center rounded-full font-mono hover:bg-surface-2 disabled:opacity-30">−</button>
        <label className="sr-only" htmlFor={`amt-${it.uid}`}>Hoeveelheid in {unit}</label>
        <input
          id={`amt-${it.uid}`}
          type="number"
          inputMode="numeric"
          min={1}
          value={Math.round(it.amount)}
          onChange={(e) => +e.target.value > 0 && onPatch({ amount: +e.target.value, label: undefined })}
          className="w-12 bg-transparent text-center font-mono text-sm tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button type="button" aria-label="Meer" onClick={() => onPatch({ amount: it.amount + step, label: undefined })} className="grid size-8 place-items-center rounded-full font-mono hover:bg-surface-2">+</button>
      </div>
    )
  } else {
    title = it.name
    sub = 'Eigen item'
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:flex-nowrap sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {thumb ? (
          <img src={imgUrl(thumb)} alt="" loading="lazy" className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-surface-2 font-display text-lg font-bold text-muted">
            {title.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          {link ? (
            <Link to={link} className="line-clamp-2 font-semibold leading-snug decoration-oat decoration-2 underline-offset-4 hover:underline">
              {title}
            </Link>
          ) : (
            <p className="line-clamp-2 font-semibold leading-snug">{title}</p>
          )}
          {sub && <p className="truncate text-sm text-muted">{sub}</p>}
          {it.type === 'recipe' && it.leftover && (
            <button type="button" onClick={() => onGoDay(it.leftover! - 1)} className="mt-1 inline-flex items-center gap-1 rounded-full bg-kh/15 px-2 py-0.5 text-xs font-semibold text-ink">
              <Icon name="leftover" className="size-3.5" />
              Overige portie op {schema.days[it.leftover - 1]?.name.toLowerCase()}
            </button>
          )}
        </div>
      </div>
      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
        {control}
        <p className="w-28 whitespace-nowrap text-right font-mono text-sm tabular">
          <span className="font-semibold">{fmt0(m.kcal)}</span> <span className="text-muted">kcal</span>
          <span className="block text-[11px] text-muted">{fmt0(m.eiwit)}e · {fmt0(m.kh)}k · {fmt0(m.vet)}v</span>
        </p>
        <div className="flex items-center opacity-60 transition group-hover:opacity-100">
          <button type="button" aria-label="Omhoog" disabled={first} onClick={() => onMove(-1)} className="grid size-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-20"><Icon name="up" className="size-4" /></button>
          <button type="button" aria-label="Omlaag" disabled={last} onClick={() => onMove(1)} className="grid size-8 place-items-center rounded-full hover:bg-surface-2 disabled:opacity-20"><Icon name="down" className="size-4" /></button>
          <button type="button" aria-label={`Verwijder ${title}`} onClick={onRemove} className="grid size-8 place-items-center rounded-full hover:bg-vet/15 hover:text-vet"><Icon name="trash" className="size-4" /></button>
        </div>
      </div>
    </li>
  )
}

/* ---------------- Dialogs ---------------- */

function SchemaDialogs({ which, onClose, schema, day }: { which: string | null; onClose: () => void; schema: Schema; day: number }) {
  const [name, setName] = useState('')
  const [copyFrom, setCopyFrom] = useState(true)
  const [targets, setTargets] = useState<Macros>(schema.targets)
  const [copyTo, setCopyTo] = useState<number[]>([])
  const [ioMsg, setIoMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [lastWhich, setLastWhich] = useState<string | null>(null)
  if (which !== lastWhich) {
    setLastWhich(which)
    if (which === 'rename') setName(schema.name)
    if (which === 'new') setName('')
    if (which === 'targets') setTargets(schema.targets)
    if (which === 'copy') setCopyTo([])
    if (which === 'io') setIoMsg('')
  }

  const field = 'w-full rounded-xl border border-line bg-surface px-3 py-2.5'
  const primary = 'w-full rounded-full bg-ink py-3 text-sm font-semibold text-paper disabled:opacity-40'

  return (
    <>
      <Modal open={which === 'new'} onClose={onClose} title="Nieuw voedingsschema">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            schemaActions.create(name.trim() || 'Mijn schema', copyFrom ? schema : undefined)
            onClose()
          }}
          className="space-y-5"
        >
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Naam</span>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. Cut 1800 kcal" className={field} />
          </label>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Beginnen met</legend>
            <label className="flex items-center gap-3 rounded-xl border border-line p-3">
              <input type="radio" checked={copyFrom} onChange={() => setCopyFrom(true)} />
              <span>Een kopie van “{schema.name}”</span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line p-3">
              <input type="radio" checked={!copyFrom} onChange={() => setCopyFrom(false)} />
              <span>Een lege week</span>
            </label>
          </fieldset>
          <button type="submit" className={primary}>Maak schema</button>
        </form>
      </Modal>

      <Modal open={which === 'rename'} onClose={onClose} title="Hernoem schema">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) schemaActions.rename(schema.id, name.trim())
            onClose()
          }}
          className="space-y-5"
        >
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label="Naam" className={field} />
          <button type="submit" disabled={!name.trim()} className={primary}>Bewaar naam</button>
        </form>
      </Modal>

      <Modal open={which === 'targets'} onClose={onClose} title="Dagdoelen">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            schemaActions.setTargets(schema.id, targets)
            onClose()
          }}
          className="space-y-5"
        >
          <p className="text-sm text-muted">Deze doelen gelden per dag voor “{schema.name}”. De balkjes bij elke dag vergelijken je menu hiermee.</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['kcal', 'Kcal', ''],
                ['eiwit', 'Eiwit', 'g'],
                ['kh', 'Koolhydraten', 'g'],
                ['vet', 'Vet', 'g'],
              ] as const
            ).map(([k, label, unit]) => (
              <label key={k} className="block">
                <span className="mb-1.5 block text-sm font-semibold">{label}{unit && ` (${unit})`}</span>
                <input type="number" min={0} value={targets[k]} onChange={(e) => setTargets({ ...targets, [k]: +e.target.value })} className={`${field} font-mono`} />
              </label>
            ))}
          </div>
          <button type="submit" className={primary}>Bewaar doelen</button>
        </form>
      </Modal>

      <Modal open={which === 'delete'} onClose={onClose} title={schema.id === 'default' ? 'Standaardschema herstellen' : 'Schema verwijderen'}>
        <p className="text-ink-soft">
          {schema.id === 'default'
            ? 'Alle aanpassingen aan het standaard weekmenu gaan verloren en het origineel komt terug. Je andere schema’s blijven staan.'
            : `“${schema.name}” wordt verwijderd uit deze browser. Dit kun je niet ongedaan maken, tenzij je eerst een back-up maakt.`}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-ink">Annuleer</button>
          <button
            type="button"
            onClick={() => {
              if (schema.id === 'default') schemaActions.resetDefault()
              else schemaActions.remove(schema.id)
              onClose()
            }}
            className="rounded-full bg-vet px-5 py-2.5 text-sm font-semibold text-white"
          >
            {schema.id === 'default' ? 'Herstel origineel' : 'Verwijder schema'}
          </button>
        </div>
      </Modal>

      <Modal open={which === 'copy'} onClose={onClose} title={`Kopieer ${schema.days[day].name.toLowerCase()} naar`}>
        <p className="text-sm text-muted">De gekozen dagen worden vervangen door een kopie van {schema.days[day].name.toLowerCase()}.</p>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {schema.days.map((dd, i) => (
            <button
              key={i}
              type="button"
              disabled={i === day}
              aria-pressed={copyTo.includes(i)}
              onClick={() => setCopyTo((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
              className={`rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-30 ${copyTo.includes(i) ? 'bg-ink text-paper' : 'bg-surface-2 hover:bg-line'}`}
            >
              {dd.name.slice(0, 2)}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!copyTo.length}
          onClick={() => {
            copyTo.forEach((to) => schemaActions.copyDay(schema.id, day, to))
            onClose()
          }}
          className={`${primary} mt-6`}
        >
          Kopieer naar {copyTo.length || ''} {copyTo.length === 1 ? 'dag' : 'dagen'}
        </button>
      </Modal>

      <Modal open={which === 'io'} onClose={onClose} title="Back-up">
        <p className="text-ink-soft">
          Je schema’s staan alleen in deze browser. Download een back-up om ze te bewaren of op een ander apparaat te openen.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              const blob = new Blob([schemaActions.exportAll()], { type: 'application/json' })
              const a = document.createElement('a')
              a.href = URL.createObjectURL(blob)
              a.download = `voedingsschemas-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(a.href)
              setIoMsg('Back-up gedownload.')
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink py-3 text-sm font-semibold text-paper"
          >
            <Icon name="download" className="size-4" /> Download back-up
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-full border border-line py-3 text-sm font-semibold">
            <Icon name="upload" className="size-4" /> Importeer bestand
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              try {
                const n = schemaActions.importAll(await f.text())
                setIoMsg(`${n} ${n === 1 ? 'schema' : "schema's"} geïmporteerd.`)
              } catch (err) {
                setIoMsg(err instanceof Error && err.message.startsWith('Geen') ? err.message : 'Dit bestand kon niet worden gelezen. Kies een back-up die je hier eerder hebt gedownload.')
              }
              e.target.value = ''
            }}
          />
        </div>
        {ioMsg && <p role="status" className="mt-4 text-sm font-semibold">{ioMsg}</p>}
      </Modal>
    </>
  )
}
