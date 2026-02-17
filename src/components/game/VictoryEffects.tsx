import { useEffect, useState, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  type: 'confetti' | 'spark';
  shape: 'rect' | 'circle' | 'star';
}

interface Firework {
  id: number;
  x: number;
  y: number;
  targetY: number;
  exploded: boolean;
  sparks: Particle[];
  trailOpacity: number;
}

const COLORS = [
  '#FFD700', '#FF6B35', '#FF1744', '#D500F9',
  '#651FFF', '#2979FF', '#00E676', '#FFEA00',
  '#FF9100', '#F50057', '#00BCD4', '#76FF03',
];

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

export function VictoryEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const fireworksRef = useRef<Firework[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn confetti
    const spawnConfetti = () => {
      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          id: Math.random(),
          x: Math.random() * canvas.width,
          y: -10,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 2 + 1.5,
          color: randomColor(),
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          opacity: 1,
          type: 'confetti',
          shape: ['rect', 'circle', 'star'][Math.floor(Math.random() * 3)] as Particle['shape'],
        });
      }
    };

    // Spawn firework
    const spawnFirework = () => {
      fireworksRef.current.push({
        id: Math.random(),
        x: Math.random() * canvas.width * 0.8 + canvas.width * 0.1,
        y: canvas.height,
        targetY: Math.random() * canvas.height * 0.4 + canvas.height * 0.1,
        exploded: false,
        sparks: [],
        trailOpacity: 1,
      });
    };

    const explodeFirework = (fw: Firework) => {
      const color = randomColor();
      const sparkCount = 40 + Math.floor(Math.random() * 30);
      for (let i = 0; i < sparkCount; i++) {
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.3;
        const speed = Math.random() * 4 + 2;
        fw.sparks.push({
          id: Math.random(),
          x: fw.x,
          y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() > 0.3 ? color : randomColor(),
          size: Math.random() * 3 + 1.5,
          rotation: 0,
          rotationSpeed: 0,
          opacity: 1,
          type: 'spark',
          shape: 'circle',
        });
      }
      fw.exploded = true;
    };

    const drawStar = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
      const spikes = 5;
      const outerRadius = size;
      const innerRadius = size * 0.4;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };

    const animate = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn confetti every few frames
      if (frameRef.current % 3 === 0) spawnConfetti();
      // Spawn fireworks periodically
      if (frameRef.current % 60 === 0) spawnFirework();

      // Update & draw confetti
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // gravity
        p.rotation += p.rotationSpeed;
        p.vx *= 0.999;

        // Fade out near bottom
        if (p.y > canvas.height * 0.85) {
          p.opacity -= 0.02;
        }

        if (p.opacity <= 0 || p.y > canvas.height + 20) return false;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawStar(ctx, 0, 0, p.size / 2);
        }

        ctx.restore();
        return true;
      });

      // Update & draw fireworks
      fireworksRef.current = fireworksRef.current.filter(fw => {
        if (!fw.exploded) {
          fw.y -= 5;
          // Draw trail
          ctx.save();
          ctx.globalAlpha = fw.trailOpacity;
          ctx.fillStyle = '#FFD700';
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (fw.y <= fw.targetY) {
            explodeFirework(fw);
          }
          return true;
        }

        // Update sparks
        fw.sparks = fw.sparks.filter(s => {
          s.x += s.vx;
          s.y += s.vy;
          s.vy += 0.05;
          s.vx *= 0.98;
          s.opacity -= 0.012;

          if (s.opacity <= 0) return false;

          ctx.save();
          ctx.globalAlpha = s.opacity;
          ctx.fillStyle = s.color;
          ctx.shadowColor = s.color;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        });

        return fw.sparks.length > 0;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    // Initial burst
    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnFirework(), i * 300);
    }

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
