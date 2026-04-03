import { useEffect, useRef, type CSSProperties } from 'react';
import type { ScreenSpacePoint } from '../../experience/model/types';

interface DissolveParticleOverlayProps {
  active: boolean;
  durationMs: number;
  particleCount?: number;
  bleedPx?: number;
  targetBias?: { x: number; y: number };
  targetScreenPosition?: ScreenSpacePoint | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  delay: number;
  color: string;
  pull: number;
}

const colors = ['#ffffff', '#dbe8ff', '#9fd8ff', '#ffcfad'];

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

export function DissolveParticleOverlay({
  active,
  durationMs,
  particleCount = 260,
  bleedPx = 160,
  targetBias = { x: 1.2, y: -0.25 },
  targetScreenPosition = null,
}: DissolveParticleOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    const shellX = bleedPx;
    const shellY = bleedPx;
    const shellWidth = Math.max(1, width - bleedPx * 2);
    const shellHeight = Math.max(1, height - bleedPx * 2);
    const targetX = targetScreenPosition
      ? targetScreenPosition.x - rect.left
      : shellX + shellWidth * (0.5 + targetBias.x);
    const targetY = targetScreenPosition
      ? targetScreenPosition.y - rect.top
      : shellY + shellHeight * (0.5 + targetBias.y);

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles: Particle[] = Array.from({ length: particleCount }, (_, index) => {
      const edgeBias = index < particleCount * 0.42;
      const onVerticalEdge = index % 2 === 0;

      const x = edgeBias
        ? onVerticalEdge
          ? index % 4 === 0
            ? shellX
            : shellX + shellWidth
          : shellX + Math.random() * shellWidth
        : Math.random() * width;
      const y = edgeBias
        ? onVerticalEdge
          ? shellY + Math.random() * shellHeight
          : index % 3 === 0
            ? shellY
            : shellY + shellHeight
        : Math.random() * height;

      const direction = (x - width / 2) / Math.max(24, width / 2);
      const verticalLift = -0.7 - Math.random() * 0.8;

      return {
        x,
        y,
        vx: direction * (42 + Math.random() * 120) + (Math.random() - 0.5) * 56,
        vy: verticalLift * (34 + Math.random() * 86),
        size: 0.8 + Math.random() * 2.8,
        alpha: 0.42 + Math.random() * 0.56,
        delay: Math.random() * durationMs * 0.34,
        color: colors[index % colors.length],
        pull: 0.25 + Math.random() * 0.75,
      };
    });

    const start = performance.now();

    const draw = (now: number) => {
      const elapsed = now - start;
      const overall = Math.min(1, elapsed / durationMs);

      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      // Keep a visible card silhouette briefly so the breakup reads.
      const shellFade = Math.max(0, 1 - overall * 1.35);
      if (shellFade > 0) {
        context.save();
        context.fillStyle = `rgba(234, 242, 255, ${shellFade * 0.08})`;
        context.strokeStyle = `rgba(255, 255, 255, ${shellFade * 0.2})`;
        context.lineWidth = 1.2;
        roundRect(context, shellX, shellY, shellWidth, shellHeight, 24);
        context.fill();
        context.stroke();
        context.restore();
      }

      particles.forEach((particle) => {
        const localElapsed = elapsed - particle.delay;
        if (localElapsed <= 0) {
          return;
        }

        const progress = Math.min(1, localElapsed / (durationMs * 0.82));
        const eased = easeOutCubic(progress);
        const friction = 1 - progress * 0.32;
        const pullProgress = Math.pow(progress, 1.8) * particle.pull;
        const px =
          particle.x +
          particle.vx * eased * friction +
          (targetX - particle.x) * pullProgress;
        const py =
          particle.y +
          particle.vy * eased -
          progress * 24 +
          (targetY - particle.y) * pullProgress;
        const radius = particle.size * (1 + progress * 0.34);
        const alpha = particle.alpha * Math.max(0, 1 - progress * 1.04);
        const tailX = px - (particle.vx * 0.06 + (targetX - particle.x) * 0.02) * (1 - progress);
        const tailY = py - (particle.vy * 0.06 + (targetY - particle.y) * 0.02) * (1 - progress);

        if (alpha <= 0) {
          return;
        }

        context.save();
        context.strokeStyle = hexToRgba(particle.color, alpha * 0.32);
        context.lineWidth = Math.max(0.6, radius * 0.55);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(px, py);
        context.stroke();

        context.fillStyle = hexToRgba(particle.color, alpha);
        context.shadowColor = particle.color;
        context.shadowBlur = 12 + radius * 7;
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      if (overall < 1) {
        frameRef.current = window.requestAnimationFrame(draw);
      }
    };

    frameRef.current = window.requestAnimationFrame(draw);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      context.clearRect(0, 0, width, height);
    };
  }, [
    active,
    bleedPx,
    durationMs,
    particleCount,
    targetBias.x,
    targetBias.y,
    targetScreenPosition,
  ]);

  return (
    <canvas
      className="galaxy-search__particle-overlay"
      ref={canvasRef}
      style={
        {
          '--overlay-bleed': `${bleedPx}px`,
        } as CSSProperties
      }
    />
  );
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
