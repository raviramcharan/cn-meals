import { useSyncExternalStore } from 'react'
import { CATEGORIES, defaultSchema, type Category, type Day, type Schema, type SchemaItem } from './data'

/* ---------- tiny localStorage-backed store ---------- */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

function createStore<T>(key: string, init: () => T) {
  let state = read<T | null>(key, null) ?? init()
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(next: T | ((s: T) => T)) {
      state = typeof next === 'function' ? (next as (s: T) => T)(state) : next
      write(key, state)
      listeners.forEach((l) => l())
    },
    subscribe(l: () => void) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}

type Store<T> = ReturnType<typeof createStore<T>>
function useStore<T>(s: Store<T>) {
  return useSyncExternalStore(s.subscribe, s.get, s.get)
}

const uid = () => Math.random().toString(36).slice(2, 10)

/* ---------- theme ---------- */

export type Theme = 'light' | 'dark'
const themeStore = createStore<Theme>('cn.theme', () =>
  (document.documentElement.dataset.theme as Theme) ?? 'light',
)
export function useTheme() {
  const theme = useStore(themeStore)
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    themeStore.set(next)
  }
  return { theme, toggle }
}

/* ---------- favorites ---------- */

const favStore = createStore<string[]>('cn.favorites', () => [])
export function useFavorites() {
  const favs = useStore(favStore)
  return {
    favs,
    isFav: (id: string) => favs.includes(id),
    toggle: (id: string) => favStore.set((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id])),
  }
}

/* ---------- remembered portions per variant on the recipe page ---------- */

const portionStore = createStore<Record<string, number>>('cn.portions', () => ({}))
export function usePortion(variantId: string) {
  const all = useStore(portionStore)
  return [all[variantId] ?? 1, (n: number) => portionStore.set((s) => ({ ...s, [variantId]: n }))] as const
}

/* ---------- schemas ---------- */

function withUids(s: Schema, fresh = false): Schema {
  return {
    ...s,
    days: s.days.map((d) => ({
      ...d,
      meals: Object.fromEntries(
        CATEGORIES.map((c) => [c.id, (d.meals[c.id] ?? []).map((it) => ({ ...it, uid: fresh || !it.uid ? uid() : it.uid }))]),
      ) as Day['meals'],
    })),
  }
}

const freshDefault = () => withUids(structuredClone(defaultSchema))

type SchemaState = { version: 1; activeId: string; schemas: Schema[] }
const schemaStore = createStore<SchemaState>('cn.schemas', () => ({
  version: 1,
  activeId: 'default',
  schemas: [freshDefault()],
}))

const DAY_NAMES = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']
const emptyDays = (): Day[] =>
  DAY_NAMES.map((name) => ({ name, meals: { ontbijt: [], lunch: [], diner: [], tussendoortje: [] } }))

function updateSchema(id: string, fn: (s: Schema) => Schema) {
  schemaStore.set((st) => ({ ...st, schemas: st.schemas.map((s) => (s.id === id ? fn(s) : s)) }))
}

function updateMeal(id: string, day: number, meal: Category, fn: (items: SchemaItem[]) => SchemaItem[]) {
  updateSchema(id, (s) => ({
    ...s,
    days: s.days.map((d, i) => (i === day ? { ...d, meals: { ...d.meals, [meal]: fn(d.meals[meal] ?? []) } } : d)),
  }))
}

export const schemaActions = {
  setActive: (id: string) => schemaStore.set((st) => ({ ...st, activeId: id })),
  create(name: string, from?: Schema) {
    const s: Schema = from
      ? withUids({ ...structuredClone(from), id: uid(), name, builtin: false }, true)
      : { id: uid(), name, targets: { ...defaultSchema.targets }, days: emptyDays() }
    schemaStore.set((st) => ({ ...st, activeId: s.id, schemas: [...st.schemas, s] }))
    return s.id
  },
  rename: (id: string, name: string) => updateSchema(id, (s) => ({ ...s, name })),
  remove(id: string) {
    schemaStore.set((st) => {
      const schemas = st.schemas.filter((s) => s.id !== id)
      if (!schemas.length) schemas.push(freshDefault())
      return { ...st, schemas, activeId: st.activeId === id ? schemas[0].id : st.activeId }
    })
  },
  resetDefault() {
    schemaStore.set((st) => {
      const has = st.schemas.some((s) => s.id === 'default')
      const fresh = freshDefault()
      return {
        ...st,
        activeId: 'default',
        schemas: has ? st.schemas.map((s) => (s.id === 'default' ? fresh : s)) : [fresh, ...st.schemas],
      }
    })
  },
  setTargets: (id: string, targets: Schema['targets']) => updateSchema(id, (s) => ({ ...s, targets })),
  addItem: (id: string, day: number, meal: Category, item: SchemaItem) =>
    updateMeal(id, day, meal, (items) => [...items, { ...item, uid: uid() }]),
  updateItem: (id: string, day: number, meal: Category, itemUid: string, patch: Partial<SchemaItem>) =>
    updateMeal(id, day, meal, (items) =>
      items.map((it) => (it.uid === itemUid ? ({ ...it, ...patch } as SchemaItem) : it)),
    ),
  removeItem: (id: string, day: number, meal: Category, itemUid: string) =>
    updateMeal(id, day, meal, (items) => items.filter((it) => it.uid !== itemUid)),
  moveItem(id: string, day: number, meal: Category, itemUid: string, dir: -1 | 1) {
    updateMeal(id, day, meal, (items) => {
      const i = items.findIndex((it) => it.uid === itemUid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= items.length) return items
      const next = [...items]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  },
  copyDay(id: string, from: number, to: number) {
    updateSchema(id, (s) => ({
      ...s,
      days: s.days.map((d, i) =>
        i === to ? { ...d, meals: withUids({ ...s, days: [structuredClone(s.days[from])] }, true).days[0].meals } : d,
      ),
    }))
  },
  clearDay: (id: string, day: number) =>
    updateSchema(id, (s) => ({
      ...s,
      days: s.days.map((d, i) => (i === day ? { ...d, meals: emptyDays()[0].meals } : d)),
    })),
  exportAll: () => JSON.stringify(schemaStore.get(), null, 2),
  importAll(json: string) {
    const data = JSON.parse(json) as Partial<SchemaState> | Schema
    const incoming: Schema[] = 'schemas' in data && Array.isArray(data.schemas) ? data.schemas : [data as Schema]
    if (!incoming.every((s) => s && Array.isArray(s.days) && s.name)) throw new Error('Geen geldig voedingsschema-bestand.')
    schemaStore.set((st) => {
      const ids = new Set(st.schemas.map((s) => s.id))
      const added = incoming.map((s) => withUids(ids.has(s.id) ? { ...s, id: uid(), name: `${s.name} (import)` } : s))
      return { ...st, schemas: [...st.schemas, ...added], activeId: added[0].id }
    })
    return incoming.length
  },
}

export function useSchemas() {
  const st = useStore(schemaStore)
  const active = st.schemas.find((s) => s.id === st.activeId) ?? st.schemas[0]
  return { schemas: st.schemas, active }
}
