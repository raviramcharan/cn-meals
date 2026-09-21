import { useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Recipes from './pages/Recipes'
import RecipeDetail from './pages/RecipeDetail'
import SchemaPage from './pages/Schema'
import { useTheme } from './lib/store'
import { Icon } from './components/ui'

function ScrollReset() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [pathname])
  return null
}

function Nav() {
  const { theme, toggle } = useTheme()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 40)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  // over the dark hero the nav is light-on-dark until you scroll
  const overHero = pathname === '/' && !scrolled

  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-2 text-sm font-semibold transition ${
      isActive
        ? overHero
          ? 'bg-[#eef2ec] text-[#14261f]'
          : 'bg-ink text-paper'
        : overHero
          ? 'text-[#eef2ec]/80 hover:text-[#eef2ec]'
          : 'text-ink-soft hover:text-ink'
    }`

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 h-16 transition-colors duration-500 ${
        overHero ? 'bg-transparent' : 'border-b border-line/60 bg-paper/80 backdrop-blur-xl'
      }`}
    >
      <nav className="mx-auto flex h-full max-w-7xl items-center gap-2 px-4 sm:px-6" aria-label="Hoofdmenu">
        <NavLink to="/" className={`mr-auto flex min-w-0 items-center gap-2 ${overHero ? 'text-[#eef2ec]' : 'text-ink'}`}>
          <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden>
            <rect width="64" height="64" rx="16" fill="currentColor" opacity=".12" />
            <rect x="12" y="38" width="16" height="10" rx="3" fill="var(--eiwit)" />
            <rect x="28" y="30" width="14" height="18" rx="3" fill="var(--kh)" />
            <rect x="42" y="22" width="10" height="26" rx="3" fill="var(--vet)" />
          </svg>
          <span className="whitespace-nowrap font-display text-base font-bold tracking-tight sm:text-lg">
            Groei-maatje <span className="hidden font-medium opacity-60 sm:inline">keuken</span>
          </span>
        </NavLink>
        <NavLink to="/" end className={link}>
          Recepten
        </NavLink>
        <NavLink to="/weekmenu" className={link}>
          Weekmenu
        </NavLink>
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema'}
          className={`ml-1 grid size-10 place-items-center rounded-full transition ${
            overHero ? 'text-[#eef2ec] hover:bg-white/10' : 'text-ink hover:bg-surface-2'
          }`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
        </button>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ScrollReset />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        Naar inhoud
      </a>
      <Nav />
      <main id="main">
        <Routes>
          <Route path="/" element={<Recipes />} />
          <Route path="/recept/:id" element={<RecipeDetail />} />
          <Route path="/weekmenu" element={<SchemaPage />} />
          <Route path="*" element={<Recipes />} />
        </Routes>
      </main>
      <footer className="border-t border-line py-8 text-center font-mono text-xs text-muted">
        Recepten en weekmenu van Groei-maatje · jouw aanpassingen worden alleen in deze browser bewaard
      </footer>
    </HashRouter>
  )
}
