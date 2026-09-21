import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Macros } from '../lib/data'
import { fmt0, fractions } from '../lib/format'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/* ---------- Macro band: share of kcal from eiwit / kh / vet ---------- */

export function MacroBand({ m, className = 'h-1.5', animate = false }: { m: Macros; className?: string; animate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const e = m.eiwit * 4
  const k = m.kh * 4
  const v = m.vet * 9
  const tot = e + k + v || 1
  useLayoutEffect(() => {
    if (!animate || !ref.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from(ref.current!.children, { scaleX: 0, transformOrigin: 'left', duration: 0.9, stagger: 0.12, ease: 'expo.out' })
    })
    return () => ctx.revert()
  }, [animate])
  return (
    <div
      ref={ref}
      className={`flex w-full gap-[2px] overflow-hidden rounded-full ${className}`}
      role="img"
      aria-label={`Verdeling kcal: eiwit ${Math.round((e / tot) * 100)}%, koolhydraten ${Math.round((k / tot) * 100)}%, vet ${Math.round((v / tot) * 100)}%`}
    >
      <span className="block h-full rounded-full bg-eiwit transition-[flex-grow] duration-500" style={{ flexGrow: e }} />
      <span className="block h-full rounded-full bg-kh transition-[flex-grow] duration-500" style={{ flexGrow: k }} />
      <span className="block h-full rounded-full bg-vet transition-[flex-grow] duration-500" style={{ flexGrow: v }} />
    </div>
  )
}

/* ---------- Number that tweens to its new value ---------- */

export function AnimatedNumber({ value, format = fmt0 }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reducedMotion()) {
      el.textContent = format(value)
      prev.current = value
      return
    }
    const obj = { n: prev.current }
    const tw = gsap.to(obj, {
      n: value,
      duration: 0.6,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = format(obj.n)),
    })
    prev.current = value
    return () => {
      tw.kill()
    }
  }, [value, format])
  return <span ref={ref} className="tabular">{format(value)}</span>
}

/* ---------- Macro stat row ---------- */

export function MacroStats({ m, size = 'md', target }: { m: Macros; size?: 'sm' | 'md' | 'lg'; target?: Macros }) {
  const items = [
    { k: 'kcal', label: 'kcal', v: m.kcal, color: 'bg-ink', unit: '' },
    { k: 'eiwit', label: 'eiwit', v: m.eiwit, color: 'bg-eiwit', unit: 'g' },
    { k: 'kh', label: 'koolh.', v: m.kh, color: 'bg-kh', unit: 'g' },
    { k: 'vet', label: 'vet', v: m.vet, color: 'bg-vet', unit: 'g' },
  ] as const
  const num = size === 'lg' ? 'text-3xl sm:text-4xl' : size === 'md' ? 'text-xl' : 'text-sm'
  return (
    <dl className={`grid grid-cols-4 ${size === 'sm' ? 'gap-2' : 'gap-3 sm:gap-5'}`}>
      {items.map((it) => {
        const t = target?.[it.k]
        const pct = t ? Math.min(it.v / t, 1.5) : 0
        return (
          <div key={it.k} className="min-w-0">
            <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              <span className={`inline-block size-1.5 rounded-full ${it.color}`} />
              {it.label}
            </dt>
            <dd className={`font-display font-semibold ${num} leading-tight`}>
              <AnimatedNumber value={it.v} />
              <span className="ml-0.5 text-[0.55em] font-medium text-muted">{it.unit}</span>
              {t ? <span className="ml-1 font-mono text-[10px] font-normal text-muted">/ {fmt0(t)}</span> : null}
            </dd>
            {t ? (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${pct > 1.1 ? 'bg-vet' : it.color} transition-[width] duration-700 ease-out-soft`}
                  style={{ width: `${Math.min(pct, 1) * 100}%` }}
                />
              </div>
            ) : null}
          </div>
        )
      })}
    </dl>
  )
}

/* ---------- Portion control ---------- */

const PRESETS = [0.5, 1, 1.5, 2, 3]

export function PortionControl({
  value,
  onChange,
  max = 6,
  compact = false,
}: {
  value: number
  onChange: (n: number) => void
  max?: number
  compact?: boolean
}) {
  const clamp = (n: number) => Math.max(0.25, Math.min(max, Math.round(n * 4) / 4))
  if (compact) {
    return (
      <div className="inline-flex items-center rounded-full border border-line bg-surface">
        <StepBtn label="Minder" onClick={() => onChange(clamp(value - 0.25))} disabled={value <= 0.25}>
          −
        </StepBtn>
        <span className="min-w-10 text-center font-mono text-sm tabular">{fractions(value)}×</span>
        <StepBtn label="Meer" onClick={() => onChange(clamp(value + 0.25))} disabled={value >= max}>
          +
        </StepBtn>
      </div>
    )
  }
  return (
    <div>
      <div className="flex items-center gap-3">
        <StepBtn big label="Kwart portie minder" onClick={() => onChange(clamp(value - 0.25))} disabled={value <= 0.25}>
          −
        </StepBtn>
        <div className="flex-1">
          <input
            type="range"
            className="scale"
            min={0.25}
            max={max}
            step={0.25}
            value={value}
            aria-label="Aantal porties"
            style={{ ['--fill' as string]: `${((value - 0.25) / (max - 0.25)) * 100}%` }}
            onChange={(e) => onChange(clamp(+e.target.value))}
          />
        </div>
        <StepBtn big label="Kwart portie meer" onClick={() => onChange(clamp(value + 0.25))} disabled={value >= max}>
          +
        </StepBtn>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-full px-3 py-1 font-mono text-xs transition ${
              value === p ? 'bg-ink text-paper' : 'bg-surface-2 text-ink-soft hover:bg-line'
            }`}
          >
            {fractions(p)}×
          </button>
        ))}
      </div>
    </div>
  )
}

function StepBtn({
  children,
  onClick,
  label,
  disabled,
  big,
}: {
  children: ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
  big?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid place-items-center rounded-full font-mono transition active:scale-90 disabled:opacity-30 ${
        big ? 'size-10 bg-surface-2 text-lg hover:bg-line' : 'size-8 text-base hover:bg-surface-2'
      }`}
    >
      {children}
    </button>
  )
}

/* ---------- Scroll reveal ---------- */

export function useReveal<T extends HTMLElement>(selector = '[data-reveal]', deps: unknown[] = []) {
  const ref = useRef<T>(null)
  useLayoutEffect(() => {
    if (!ref.current || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.set(selector, { autoAlpha: 0 })
      ScrollTrigger.batch(selector, {
        start: 'top 92%',
        once: true,
        onEnter: (els) =>
          gsap.fromTo(els, { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out', overwrite: true }),
      })
      ScrollTrigger.refresh()
    }, ref)
    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

/* ---------- Chip ---------- */

export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-200 ${
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-line bg-surface text-ink-soft hover:border-ink-soft hover:text-ink'
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`font-mono text-[10px] ${active ? 'text-paper/70' : 'text-muted'}`}>{count}</span>
      )}
    </button>
  )
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      if (!reducedMotion()) gsap.fromTo(d, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power3.out' })
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[88dvh] w-[min(640px,calc(100vw-24px))] overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-forest/60 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full hover:bg-surface-2" aria-label="Sluiten">
            <Icon name="x" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  )
}

/* ---------- Icons (inline, stroke) ---------- */

const PATHS: Record<string, string> = {
  x: 'M6 6l12 12M18 6L6 18',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  search: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm5-2 4 4',
  clock: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-13v4l3 2',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  back: 'M15 18l-6-6 6-6',
  filter: 'M4 6h16M7 12h10M10 18h4',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  edit: 'M4 20h4L19 9l-4-4L4 16v4z',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  upload: 'M12 20V9m0 0l-4 4m4-4l4 4M5 4h14',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
  users: 'M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  leftover: 'M20 11a8 8 0 0 0-14.9-4M4 4v4h4M4 13a8 8 0 0 0 14.9 4M20 20v-4h-4',
  target: 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zm0-5a4 4 0 1 1 0-8 4 4 0 0 1 0 8z',
}

export function Icon({ name, className = 'size-5', filled = false }: { name: keyof typeof PATHS | string; className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  )
}
