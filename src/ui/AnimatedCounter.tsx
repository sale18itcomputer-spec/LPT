import React, { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

interface AnimatedCounterProps {
  to: number;
  formatter?: (value: number) => string;
  className?: string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ to, formatter = (v) => v.toLocaleString(), className }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest as number));
  const display = useTransform(rounded, latest => formatter(latest as number));

  useEffect(() => {
    const controls = animate(count, to, {
      duration: 1.5,
      ease: 'easeOut',
    });
    return controls.stop;
  }, [to, count]);

  return <motion.span className={className}>{display}</motion.span>;
};

export default AnimatedCounter;