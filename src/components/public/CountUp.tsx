import { useEffect, useRef, useState } from "react";

interface Props {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

const formatNumber = (n: number, decimals: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(decimals || 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(decimals || 1) + "K";
  return n.toFixed(decimals);
};

const CountUp = ({ to, duration = 1800, suffix = "", prefix = "", decimals = 0 }: Props) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(to * eased);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{prefix}{formatNumber(val, decimals)}{suffix}</span>;
};

export default CountUp;
