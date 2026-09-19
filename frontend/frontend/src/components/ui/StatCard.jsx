import { motion } from 'framer-motion'
import CountUp from './CountUp'

const tones = {
  lavender: { bg: 'bg-lavender-soft', text: 'text-[#5b4bd6]' },
  sage: { bg: 'bg-sage-soft', text: 'text-[#3f6a52]' },
  gold: { bg: 'bg-gold-soft', text: 'text-[#8a6a1f]' },
}

export default function StatCard({ icon: Icon, label, value, tone = 'lavender' }) {
  const palette = tones[tone]

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className="rounded-[24px] border border-hairline/70 bg-surface p-6 shadow-[0_1px_2px_rgba(28,26,23,0.04)] transition-shadow hover:shadow-[0_16px_32px_-16px_rgba(28,26,23,0.16)]"
    >
      <span className={`flex h-10 w-10 items-center justify-center rounded-full ${palette.bg} ${palette.text}`}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <p className="mt-5 text-[32px] font-semibold leading-none tracking-tight">
        <CountUp value={value} />
      </p>
      <p className="mt-2 text-[13px] text-ink-faint">{label}</p>
    </motion.div>
  )
}
