import { FRUITS, POWER_UPS } from './constants';
import { BladeSpec, FruitType, PowerUpType } from './types';

export interface ActiveEntity {
  id: number;
  kind: 'fruit' | 'bomb' | 'powerup';
  fruitType?: FruitType;
  powerUpType?: PowerUpType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vr: number;
  sliced: boolean;
  enteredPlayfield: boolean;
  spawnTime: number;
}

export interface SlicedHalf {
  fruitType: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  vr: number;
  cutAngle: number;
  side: -1 | 1;
  alpha: number;
}

export interface JuiceSplatter {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  blobs: { dx: number; dy: number; r: number }[];
}

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subText?: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

function drawSingleFruitBody(
  ctx: CanvasRenderingContext2D,
  fruitType: FruitType,
  r: number,
  showInteriorCut: boolean
) {
  const spec = FRUITS[fruitType];

  if (showInteriorCut) {
    // Exposed inner flesh + rind rim along the cut line
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = spec.outerColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fillStyle = spec.rindColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.fillStyle = spec.fleshColor;
    ctx.fill();

    // Inner seeds / segments detail
    ctx.fillStyle = spec.seedColor;
    if (fruitType === 'orange') {
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74);
        ctx.stroke();
      }
    } else if (fruitType === 'kiwi') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#ecfccb';
      ctx.fill();
      ctx.fillStyle = spec.seedColor;
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI * 2) / 12;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (fruitType === 'coconut') {
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2);
      ctx.fillStyle = '#e2e8f0';
      ctx.fill();
    } else {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + 0.3;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(a) * r * 0.42,
          Math.sin(a) * r * 0.42,
          2.2,
          3.6,
          a,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    return;
  }

  // Exterior whole-fruit art for each of the 10 fruits
  switch (fruitType) {
    case 'watermelon': {
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(0.65, spec.outerColor);
      grad.addColorStop(1, spec.outerSecondary);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Dark melon stripes
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = r * 0.14;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * r * 0.48, 0, r * 0.85, -0.8, 0.8);
        ctx.stroke();
      }
      break;
    }
    case 'apple': {
      const grad = ctx.createRadialGradient(-r * 0.28, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#f87171');
      grad.addColorStop(0.55, spec.outerColor);
      grad.addColorStop(1, spec.outerSecondary);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.78);
      ctx.bezierCurveTo(r * 0.95, -r * 1.05, r * 1.1, r * 0.65, 0, r * 0.95);
      ctx.bezierCurveTo(-r * 1.1, r * 0.65, -r * 0.95, -r * 1.05, 0, -r * 0.78);
      ctx.fillStyle = grad;
      ctx.fill();

      // Stem & leaf
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.74);
      ctx.quadraticCurveTo(3, -r * 1.05, 8, -r * 1.12);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(9, -r * 0.96, 8, 4, -0.45, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'banana': {
      ctx.save();
      ctx.rotate(-0.35);
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, '#fef08a');
      grad.addColorStop(0.55, '#facc15');
      grad.addColorStop(1, '#ca8a04');
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, -r * 0.25);
      ctx.quadraticCurveTo(0, r * 1.15, r * 0.95, -r * 0.25);
      ctx.quadraticCurveTo(0, r * 0.42, -r * 0.95, -r * 0.25);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Tips
      ctx.fillStyle = '#713f12';
      ctx.fillRect(-r * 0.98, -r * 0.3, 5, 5);
      ctx.fillRect(r * 0.91, -r * 0.3, 5, 5);
      ctx.restore();
      break;
    }
    case 'orange': {
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#fdba74');
      grad.addColorStop(0.55, spec.outerColor);
      grad.addColorStop(1, spec.outerSecondary);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Citrus dimples
      ctx.fillStyle = 'rgba(154, 52, 18, 0.25)';
      for (let i = 0; i < 10; i++) {
        const a = i * 0.628;
        const d = r * (0.45 + (i % 3) * 0.15);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Tiny green calyx
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(0, -r * 0.88, 4.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pineapple': {
      // Green spiky crown
      ctx.fillStyle = '#16a34a';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 6, -r * 0.72);
        ctx.lineTo(i * 10 - 5, -r * 1.28 + Math.abs(i) * 4);
        ctx.lineTo(i * 6 + 6, -r * 0.72);
        ctx.fill();
      }

      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.2, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.65, '#eab308');
      grad.addColorStop(1, '#a16207');
      ctx.beginPath();
      ctx.ellipse(0, r * 0.08, r * 0.76, r * 0.92, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Diamond cross-hatch
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 1.6;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.6, i * 11 - 10);
        ctx.lineTo(r * 0.6, i * 11 + 14);
        ctx.moveTo(r * 0.6, i * 11 - 10);
        ctx.lineTo(-r * 0.6, i * 11 + 14);
        ctx.stroke();
      }
      break;
    }
    case 'strawberry': {
      const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#fb7185');
      grad.addColorStop(0.6, '#e11d48');
      grad.addColorStop(1, '#9f1239');
      ctx.beginPath();
      ctx.moveTo(0, r * 0.98);
      ctx.bezierCurveTo(r * 0.95, r * 0.2, r * 0.95, -r * 0.85, 0, -r * 0.78);
      ctx.bezierCurveTo(-r * 0.95, -r * 0.85, -r * 0.95, r * 0.2, 0, r * 0.98);
      ctx.fillStyle = grad;
      ctx.fill();

      // Golden seeds
      ctx.fillStyle = '#fef08a';
      const seedOffsets = [
        [-7, -5],
        [7, -5],
        [0, 3],
        [-9, 8],
        [9, 8],
        [0, 14],
      ];
      for (const [sx, sy] of seedOffsets) {
        ctx.beginPath();
        ctx.ellipse(sx, sy, 1.4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Leafy cap
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.74, r * 0.55, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'kiwi': {
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#a1743b');
      grad.addColorStop(0.7, spec.outerColor);
      grad.addColorStop(1, spec.outerSecondary);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.92, r * 0.78, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Subtle green ring cue
      ctx.strokeStyle = 'rgba(132, 204, 22, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.72, r * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'mango': {
      const grad = ctx.createLinearGradient(-r, -r, r, r);
      grad.addColorStop(0, '#ef4444');
      grad.addColorStop(0.55, '#f59e0b');
      grad.addColorStop(1, '#84cc16');
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.82, r * 1.02, 0.25, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      break;
    }
    case 'grapes': {
      const berries = [
        [-10, -14],
        [10, -14],
        [0, -14],
        [-14, -2],
        [0, -2],
        [14, -2],
        [-8, 10],
        [8, 10],
        [0, 20],
      ];
      for (const [bx, by] of berries) {
        const g = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 11);
        g.addColorStop(0, '#c084fc');
        g.addColorStop(0.65, '#7e22ce');
        g.addColorStop(1, '#3b0764');
        ctx.beginPath();
        ctx.arc(bx, by, 10.5, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.lineTo(4, -33);
      ctx.stroke();
      break;
    }
    case 'coconut': {
      const grad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#855836');
      grad.addColorStop(0.6, spec.outerColor);
      grad.addColorStop(1, spec.outerSecondary);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Three coconut dimples
      ctx.fillStyle = '#29170b';
      for (const [dx, dy] of [
        [-7, -10],
        [7, -10],
        [0, -1],
      ]) {
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  // Glossy specular highlight on all whole fruits
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.34, r * 0.24, r * 0.11, -0.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.fill();
}

export function drawEntity(ctx: CanvasRenderingContext2D, entity: ActiveEntity, nowSec: number) {
  ctx.save();
  ctx.translate(entity.x, entity.y);

  if (entity.kind === 'fruit' && entity.fruitType) {
    ctx.rotate(entity.rotation);
    // Drop shadow for 2.5D depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 6;
    drawSingleFruitBody(ctx, entity.fruitType, entity.radius, false);
  } else if (entity.kind === 'bomb') {
    ctx.rotate(entity.rotation * 0.5);
    const pulse = 0.5 + 0.5 * Math.sin(nowSec * 14);

    // Warning red danger aura
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius + 7 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + pulse * 0.22})`;
    ctx.fill();

    // Iron bomb sphere
    const grad = ctx.createRadialGradient(-10, -10, 4, 0, 0, entity.radius);
    grad.addColorStop(0, '#52525b');
    grad.addColorStop(0.6, '#18181b');
    grad.addColorStop(1, '#09090b');
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Red X danger emblem
    ctx.strokeStyle = '#f87171';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(10, 10);
    ctx.moveTo(10, -10);
    ctx.lineTo(-10, 10);
    ctx.stroke();

    // Fuse & spark
    ctx.strokeStyle = '#d6d3d1';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(4, -entity.radius + 2);
    ctx.quadraticCurveTo(14, -entity.radius - 12, 22, -entity.radius - 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(22, -entity.radius - 6, 4 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = pulse > 0.5 ? '#fde047' : '#fb923c';
    ctx.fill();
  } else if (entity.kind === 'powerup' && entity.powerUpType) {
    const spec = POWER_UPS[entity.powerUpType];
    const pulse = 0.5 + 0.5 * Math.sin(nowSec * 8);

    // Outer radiant orb glow
    ctx.beginPath();
    ctx.arc(0, 0, entity.radius + 10 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = spec.glowColor;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.fillStyle = spec.color;
    ctx.font = '800 11px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(spec.shortLabel.toUpperCase(), 0, 1);
  }

  ctx.restore();
}

export function drawSlicedHalf(ctx: CanvasRenderingContext2D, half: SlicedHalf) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, half.alpha);
  ctx.translate(half.x, half.y);
  ctx.rotate(half.rotation);

  // Clip cleanly along cutAngle
  ctx.save();
  ctx.rotate(half.cutAngle);
  ctx.beginPath();
  if (half.side === -1) {
    ctx.rect(-half.radius * 1.6, -half.radius * 1.6, half.radius * 3.2, half.radius * 1.6);
  } else {
    ctx.rect(-half.radius * 1.6, 0, half.radius * 3.2, half.radius * 1.6);
  }
  ctx.clip();

  ctx.rotate(-half.cutAngle);
  drawSingleFruitBody(ctx, half.fruitType, half.radius, true);

  // Crisp highlight along cut edge
  ctx.rotate(half.cutAngle);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-half.radius, 0);
  ctx.lineTo(half.radius, 0);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

export function drawSplatter(ctx: CanvasRenderingContext2D, splat: JuiceSplatter) {
  ctx.save();
  ctx.globalAlpha = splat.alpha * 0.42;
  ctx.fillStyle = splat.color;

  ctx.beginPath();
  ctx.arc(splat.x, splat.y, splat.radius, 0, Math.PI * 2);
  ctx.fill();

  for (const b of splat.blobs) {
    ctx.beginPath();
    ctx.arc(splat.x + b.dx, splat.y + b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBladeTrail(
  ctx: CanvasRenderingContext2D,
  points: TrailPoint[],
  blade: BladeSpec,
  nowMs: number
) {
  if (points.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const age = (nowMs - p1.time) / 170; // 170ms trail lifetime
    if (age >= 1) continue;

    const strength = 1 - age;
    const width = 2 + strength * 12;

    // Outer glow
    ctx.strokeStyle = blade.glowColor;
    ctx.globalAlpha = strength * 0.45;
    ctx.lineWidth = width * 1.9;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Colored edge
    ctx.strokeStyle = blade.edgeColor;
    ctx.globalAlpha = strength * 0.85;
    ctx.lineWidth = width * 1.15;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    // Razor white core
    ctx.strokeStyle = blade.coreColor;
    ctx.globalAlpha = strength;
    ctx.lineWidth = Math.max(1.5, width * 0.48);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  ctx.restore();
}

export function segmentCircleIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return Math.hypot(cx - x1, cy - y1) <= r;
  }
  let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
  return distSq <= r * r;
}
