import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { useEffect, type ReactNode } from "react";
export const motionTokens = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as const,
  stagger: 0.065,
};
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ ...motionTokens, delay }}
    >
      {children}
    </motion.div>
  );
}
export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: motionTokens.stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}
export function PageTransition({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reduced ? 0 : -6 }}
      transition={motionTokens}
    >
      {children}
    </motion.div>
  );
}
export function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const count = useMotionValue(reduced ? value : 0);
  const rounded = useTransform(count, (n) =>
    Math.round(n).toLocaleString("nl-NL"),
  );
  useEffect(() => {
    const controls = animate(count, value, { duration: reduced ? 0 : 1.1 });
    return controls.stop;
  }, [count, value, reduced]);
  return <motion.span>{rounded}</motion.span>;
}
export function Skeleton() {
  return <div className="skeleton" role="status" aria-label="Laden" />;
}
