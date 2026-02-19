interface CursePanelOverlayProps {
  isMobile?: boolean;
}

export function CursePanelOverlay({ isMobile }: CursePanelOverlayProps) {
  const particles = [
    { left: '8%',  delay: 0 },
    { left: '22%', delay: 0.4 },
    { left: '38%', delay: 0.9 },
    { left: '54%', delay: 0.2 },
    { left: '70%', delay: 1.1 },
    { left: '84%', delay: 0.6 },
    { left: '94%', delay: 1.5 },
  ];

  const rounded = isMobile ? 'rounded-xl' : 'rounded-t-lg';

  return (
    <div
      className={`absolute inset-0 pointer-events-none z-20 ${rounded}`}
      style={{ overflow: 'visible' }}
    >
      {/* Pulserende purpur glød-kant */}
      <div
        className={`absolute inset-0 ${rounded} animate-curse-pulse`}
        style={{
          border: '2px solid rgba(147, 51, 234, 0.6)',
          boxShadow:
            '0 0 14px 4px rgba(147,51,234,0.35), inset 0 0 10px 3px rgba(147,51,234,0.18)',
        }}
      />

      {/* Partikler langs topp-kanten — flyter oppover og ut av panelet */}
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute text-purple-400 animate-curse-particle select-none"
          style={{
            left: p.left,
            top: '-2px',
            fontSize: '10px',
            animationDelay: `${p.delay}s`,
          }}
        >
          ✦
        </span>
      ))}
    </div>
  );
}
