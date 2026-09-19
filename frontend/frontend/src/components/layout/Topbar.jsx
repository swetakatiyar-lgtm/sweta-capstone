import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function Topbar({ title }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { settings, updateSettings } = useApp()

  useEffect(() => {
    const handler = (e) => {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isShortcut) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const isDocsRoute = location.pathname.startsWith('/documents')

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter' || !query.trim()) return
    const target = isDocsRoute ? '/documents' : '/scout'
    navigate(`${target}?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <header className="flex h-20 items-center justify-between gap-6 px-10">
      <h1 className="text-[15px] font-semibold tracking-tight text-ink-soft">{title}</h1>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="flex w-full max-w-[320px] items-center gap-2 rounded-full border border-hairline/70 bg-surface/70 px-4 py-2.5 shadow-[0_1px_1px_rgba(28,26,23,0.03)] backdrop-blur-md transition-shadow focus-within:shadow-[0_2px_12px_-4px_rgba(139,124,246,0.35)]">
          <Search size={15} className="text-ink-faint" strokeWidth={1.75} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search opportunities, docs…"
            aria-label="Search opportunities and documents"
            className="w-full bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
          <kbd className="hidden shrink-0 rounded-md border border-hairline px-1.5 py-0.5 text-[11px] text-ink-faint sm:inline">
            ⌘K
          </kbd>
        </div>
        <button
          type="button"
          aria-label="Toggle notifications"
          aria-pressed={settings.notifications}
          onClick={() => updateSettings({ notifications: !settings.notifications })}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender ${
            settings.notifications
              ? 'border-lavender/30 bg-lavender-soft text-[#5b4bd6]'
              : 'border-hairline/70 bg-surface/70 text-ink-soft hover:text-ink'
          }`}
        >
          <Bell size={16} strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
