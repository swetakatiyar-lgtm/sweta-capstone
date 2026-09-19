export default function GradientBlobs({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute -left-24 -top-32 h-[360px] w-[360px] rounded-full bg-lavender/25 blur-[100px]" />
      <div className="absolute -right-16 top-10 h-[280px] w-[280px] rounded-full bg-gold/20 blur-[90px]" />
    </div>
  )
}
