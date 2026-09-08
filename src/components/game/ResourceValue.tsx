import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useGameOptions } from '@/hooks/useGameOptions';
import { useEnvironmentActivity } from '@/hooks/useEnvironmentActivity';

/** A short delta next to the changed resource, never a modal or a gameplay timer. */
export function ResourceValue({ value, identity, children }: { value: number; identity: string; children?: ReactNode }) {
  const previous = useRef({ value, identity });
  const [delta, setDelta] = useState(0);
  const { options } = useGameOptions();
  const { reducedMotion, visible } = useEnvironmentActivity();
  useEffect(() => {
    const before = previous.current;
    previous.current = { value, identity };
    if (before.identity !== identity || !visible || options.environmentDetail === 'off') { setDelta(0); return; }
    if (before.value === value) return;
    setDelta(Math.round((value - before.value) * 100) / 100);
    const timer = setTimeout(() => setDelta(0), 2200);
    return () => clearTimeout(timer);
  }, [value, identity, visible, options.environmentDetail]);
  return <span className="resource-value">{children ?? value}{delta !== 0 && <span aria-hidden="true" className="resource-delta" data-gain={delta > 0} data-animated={!reducedMotion && options.environmentDetail === 'full'}>{delta > 0 ? '+' : ''}{delta}</span>}</span>;
}
