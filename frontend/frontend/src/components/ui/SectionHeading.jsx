const dotColors = {
  lavender: 'bg-lavender',
  sage: 'bg-sage',
  gold: 'bg-gold',
}

export default function SectionHeading({ eyebrow, title, dot = 'lavender', action }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColors[dot]}`} />
            <span className="text-[13px] font-medium uppercase tracking-wide text-ink-faint">
              {eyebrow}
            </span>
          </div>
        )}
        <h2 className="text-[28px] font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  )
}
