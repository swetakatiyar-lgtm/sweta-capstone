import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'

export default function CountUp({ value, duration = 900, suffix = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const [display, setDisplay] = useState(0)

  const numeric = typeof value === 'number' ? value : parseInt(value, 10)
  const isNumeric = !Number.isNaN(numeric)

  useEffect(() => {
    if (!inView || !isNumeric) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * numeric))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, numeric, duration, isNumeric])

  return (
    <motion.span ref={ref} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {isNumeric ? display : value}
      {suffix}
    </motion.span>
  )
}
