export default function Chip({ children, active = true, onClick }) {
  const className = `inline-flex h-[34px] items-center rounded-full border px-4 text-[13px] font-medium transition-colors ${
    active
      ? 'border-lavender/25 bg-lavender-soft text-[#5b4bd6]'
      : 'border-hairline bg-surface text-ink-soft'
  } ${onClick ? 'cursor-pointer hover:border-lavender/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lavender' : ''}`

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={className}>
        {children}
      </button>
    )
  }

  return <span className={className}>{children}</span>
}
