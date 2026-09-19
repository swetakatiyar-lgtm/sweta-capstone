import { motion } from "framer-motion";

export default function HoverCard({ children, className = "" }) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        scale: 1.01,
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 24,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}