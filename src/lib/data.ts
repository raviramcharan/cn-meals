import recipesJson from '../data/recipes.json'
import productsJson from '../data/products.json'
import defaultSchemaJson from '../data/schema-default.json'

export type Macros = { kcal: number; eiwit: number; kh: number; vet: number }

export type Ingredient = {
  name: string
  amount?: number
  unit?: string
  hint?: string
  brand?: string
  optional?: boolean
}

export type Variant = Macros & {
  id: string
  label: 'Light' | 'Normaal' | 'XL' | string
  title: string
  prep: number
  cook: number
  /** Number of portions the ingredient list is written for */
  servings: number
  portionLabel: string | null
  ingredients: Ingredient[]
  /** Steps with amounts for one portion */
  steps: string[]
  image: string | null
}

export type Category = 'ontbijt' | 'lunch' | 'diner' | 'tussendoortje'
export type DietTag = 'vegetarisch' | 'vegan' | 'vis' | 'glutenvrij' | 'lactosevrij' | 'notenvrij'

export type Dish = {
  id: string
  title: string
  description: string
  image: string | null
  categories: Category[]
  tags: DietTag[]
  variants: Variant[]
}

export type Product = {
  id: string
  name: string
  unit: 'g' | 'ml'
  per100: Macros
  servings: { label: string; amount: number }[]
}

export type RecipeItem = { type: 'recipe'; dish: string; variant: string; portions: number; leftover?: number }
export type ProductItem = { type: 'product'; product: string; amount: number; label?: string }
export type CustomItem = { type: 'custom'; name: string } & Macros
export type SchemaItem = (RecipeItem | ProductItem | CustomItem) & { uid?: string }

export type Day = { name: string; meals: Record<Category, SchemaItem[]> }
export type Schema = {
  id: string
  name: string
  builtin?: boolean
  targets: Macros
  days: Day[]
}

export const dishes = recipesJson as Dish[]
export const products = productsJson as Product[]
export const defaultSchema = defaultSchemaJson as Schema

export const dishById = new Map(dishes.map((d) => [d.id, d]))
export const variantById = new Map(dishes.flatMap((d) => d.variants.map((v) => [v.id, { dish: d, variant: v }] as const)))
export const productById = new Map(products.map((p) => [p.id, p]))

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'ontbijt', label: 'Ontbijt' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'diner', label: 'Diner' },
  { id: 'tussendoortje', label: 'Tussendoortje' },
]

export const DIETS: { id: DietTag; label: string }[] = [
  { id: 'vegetarisch', label: 'Vegetarisch' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vis', label: 'Met vis' },
  { id: 'glutenvrij', label: 'Glutenvrij' },
  { id: 'lactosevrij', label: 'Lactosevrij' },
  { id: 'notenvrij', label: 'Notenvrij' },
]

export const FEATURES = [
  { id: 'eiwitrijk', label: 'Eiwitrijk (30g+)', test: (v: Variant) => v.eiwit >= 30 },
  { id: 'lowcarb', label: 'Koolhydraatarm (≤30g)', test: (v: Variant) => v.kh <= 30 },
  { id: 'snel', label: 'Snel (≤15 min)', test: (v: Variant) => v.prep + v.cook <= 15 },
  { id: 'mealprep', label: 'Meal-prep', test: (v: Variant) => v.servings > 1 },
] as const

export const DAY_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

export const imgUrl = (p: string | null) => (p ? `${import.meta.env.BASE_URL}${p}` : '')

export const defaultVariant = (d: Dish) => d.variants.find((v) => v.label === 'Normaal') ?? d.variants[0]

export const scaleMacros = (m: Macros, f: number): Macros => ({
  kcal: m.kcal * f,
  eiwit: m.eiwit * f,
  kh: m.kh * f,
  vet: m.vet * f,
})

export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  eiwit: a.eiwit + b.eiwit,
  kh: a.kh + b.kh,
  vet: a.vet + b.vet,
})

export const ZERO: Macros = { kcal: 0, eiwit: 0, kh: 0, vet: 0 }

export function itemMacros(it: SchemaItem): Macros {
  if (it.type === 'recipe') {
    const v = variantById.get(it.variant)?.variant
    return v ? scaleMacros(v, it.portions) : ZERO
  }
  if (it.type === 'product') {
    const p = productById.get(it.product)
    return p ? scaleMacros(p.per100, it.amount / 100) : ZERO
  }
  return { kcal: it.kcal, eiwit: it.eiwit, kh: it.kh, vet: it.vet }
}

export const sumItems = (items: SchemaItem[]) => items.reduce((acc, it) => addMacros(acc, itemMacros(it)), ZERO)
export const dayMacros = (d: Day) => CATEGORIES.reduce((acc, c) => addMacros(acc, sumItems(d.meals[c.id] ?? [])), ZERO)

export function itemName(it: SchemaItem) {
  if (it.type === 'recipe') return variantById.get(it.variant)?.dish.title ?? 'Onbekend recept'
  if (it.type === 'product') return productById.get(it.product)?.name ?? 'Onbekend product'
  return it.name
}
