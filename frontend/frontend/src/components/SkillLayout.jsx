import { motion } from "framer-motion";

export default function SkillLayout({
  badge,
  title,
  subtitle,
  icon,
  children,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="max-w-6xl mx-auto"
    >
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#EFE8FF] px-3 py-1 text-sm text-[#6B5AE0]">
          {icon}
          {badge}
        </div>

        <h1 className="mt-5 text-5xl font-bold tracking-tight text-[#18181B]">
          {title}
        </h1>

        <p className="mt-3 max-w-2xl text-lg text-[#6B7280]">
          {subtitle}
        </p>
      </div>

      {children}
    </motion.div>
  );
}