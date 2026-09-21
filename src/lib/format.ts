const nl = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 })
const nl0 = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 })

export const fmt = (n: number) => nl.format(n)
export const fmt0 = (n: number) => nl0.format(Math.round(n))

/** Round a scaled ingredient amount to something you can actually weigh. */
export function niceAmount(n: number, unit?: string) {
  if (unit === 'g' || unit === 'ml') {
    if (n >= 100) return nl0.format(Math.round(n / 5) * 5)
    if (n >= 10) return nl0.format(Math.round(n))
    return nl.format(Math.round(n * 2) / 2)
  }
  // pieces: quarters
  const q = Math.round(n * 4) / 4
  return fractions(q)
}

export function fractions(n: number) {
  const whole = Math.floor(n)
  const rest = +(n - whole).toFixed(2)
  const map: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' }
  if (rest === 0) return String(whole)
  const f = map[String(rest)]
  if (!f) return nl.format(n)
  return whole ? `${whole}${f}` : f
}

export const portionsLabel = (n: number) => `${fractions(n)} ${n === 1 ? 'portie' : 'porties'}`

/** Scale gram/ml amounts written inside step text ("Snijd de 275g aardappels"). */
export function scaleStep(text: string, f: number): { text: string; scaled: boolean }[] {
  if (f === 1) return splitAmounts(text, (m) => m)
  return splitAmounts(text, (m) => {
    const num = parseFloat(m.num.replace(',', '.'))
    return { ...m, num: niceAmount(num * f, m.unit.startsWith('g') ? 'g' : 'ml') }
  })
}

type Match = { num: string; space: string; unit: string }
const AMOUNT_RE = /(\d+(?:[.,]\d+)?)(\s?)(gram|g|ml|kg|l)\b/g

function splitAmounts(text: string, fn: (m: Match) => Match) {
  const parts: { text: string; scaled: boolean }[] = []
  let last = 0
  for (const m of text.matchAll(AMOUNT_RE)) {
    const idx = m.index ?? 0
    if (idx > last) parts.push({ text: text.slice(last, idx), scaled: false })
    const r = fn({ num: m[1], space: m[2], unit: m[3] })
    parts.push({ text: `${r.num}${r.space}${r.unit}`, scaled: true })
    last = idx + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), scaled: false })
  return parts
}
