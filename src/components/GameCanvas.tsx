import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Coins,
  Flame,
  Heart,
  Magnet,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Snowflake,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { audioEngine } from '../game/audio';
import { BACKGROUNDS, BLADES, FRUITS, FRUIT_LIST, LEVELS, POWER_UPS, POWER_UP_LIST } from '../game/constants';
import {
  ActiveEntity,
  FloatingText,
  JuiceSplatter,
  Particle,
  SlicedHalf,
  TrailPoint,
  drawBladeTrail,
  drawEntity,
  drawSlicedHalf,
  drawSplatter,
  segmentCircleIntersect,
} from '../game/fruitRenderer';
import { FruitType, GameMode, MatchSummary, PowerUpType, SaveData } from '../game/types';

interface GameCanvasProps {
  mode: GameMode;
  levelNumber?: number;
  saveData: SaveData;
  onConsumePowerUp: (type: PowerUpType) => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onMatchFinish: (summary: MatchSummary) => void;
  onExitToMenu: () => void;
}

interface HudSnapshot {
  score: number;
  coins: number;
  lives: number;
  maxLives: number;
  hasShield: boolean;
  timeLeft: number | null;
  fruitsSliced: number;
  comboCount: number;
  maxCombo: number;
  targetFruitCount: number;
  activePowerUps: Partial<Record<PowerUpType, number>>;
}

const PARTICLE_POOL_SIZE = 180;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  levelNumber = 1,
  saveData,
  onConsumePowerUp,
  onToggleSound,
  onToggleMusic,
  onMatchFinish,
  onExitToMenu,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);

  const levelConfig = mode === 'level' ? LEVELS[Math.max(0, Math.min(99, levelNumber - 1))] : null;
  const bladeSpec = BLADES.find((b) => b.id === saveData.selectedBlade) ?? BLADES[0];
  const bgSpec = BACKGROUNDS.find((b) => b.id === saveData.selectedBackground) ?? BACKGROUNDS[0];

  const initialTime =
    mode === 'timeAttack' || mode === 'arcade'
      ? 60
      : levelConfig?.timeLimitSec ?? null;

  const initialLives = mode === 'classic' || (mode === 'level' && levelConfig?.timeLimitSec === null) ? 3 : 0;

  const [hud, setHud] = useState<HudSnapshot>({
    score: 0,
    coins: 0,
    lives: initialLives,
    maxLives: 3,
    hasShield: false,
    timeLeft: initialTime,
    fruitsSliced: 0,
    comboCount: 0,
    maxCombo: 0,
    targetFruitCount: 0,
    activePowerUps: {},
  });

  // Keep latest inventory & callback refs accessible inside the 60fps loop without re-mounting
  const saveRef = useRef(saveData);
  saveRef.current = saveData;
  const finishRef = useRef(onMatchFinish);
  finishRef.current = onMatchFinish;
  const consumePowerUpRef = useRef(onConsumePowerUp);
  consumePowerUpRef.current = onConsumePowerUp;

  // Exposed imperative handle via ref so HUD buttons can trigger power-ups inside the canvas simulation
  const activatePowerUpFnRef = useRef<((type: PowerUpType, fromInventory: boolean) => void) | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Escape key toggles pause cleanly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPaused((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Simulation state
    let nextId = 1;
    const entities: ActiveEntity[] = [];
    const halves: SlicedHalf[] = [];
    const splatters: JuiceSplatter[] = [];
    const floatingTexts: FloatingText[] = [];
    const trail: TrailPoint[] = [];

    const particles: Particle[] = Array.from({ length: PARTICLE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 3,
      color: '#fff',
      alpha: 1,
      life: 0,
      maxLife: 0.5,
      gravity: 600,
    }));

    const spawnParticle = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      radius: number,
      color: string,
      maxLife: number,
      gravity = 700
    ) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) {
          p.active = true;
          p.x = x;
          p.y = y;
          p.vx = vx;
          p.vy = vy;
          p.radius = radius;
          p.color = color;
          p.alpha = 1;
          p.life = 0;
          p.maxLife = maxLife;
          p.gravity = gravity;
          return;
        }
      }
    };

    let score = 0;
    let coinsEarned = 0;
    let lives = initialLives;
    let hasShield = false;
    let timeLeft: number | null = initialTime;
    let elapsed = 0;
    let spawnTimer = 0.35;
    let fruitsSliced = 0;
    let comboCount = 0;
    let maxCombo = 0;
    let ended = false;
    let endedByBomb = false;

    const slicedByType: Partial<Record<FruitType, number>> = {};
    const activePowerUps: Partial<Record<PowerUpType, number>> = {};

    // Juice feel timers
    let hitstopTimer = 0;
    let shakeIntensity = 0;
    let flashAlpha = 0;
    let flashColor = '#ffffff';

    // Swipe combo tracker
    let isPointerDown = false;
    let prevPointer: { x: number; y: number } | null = null;
    let swipeComboFruits = 0;
    let swipeComboLastX = 0;
    let swipeComboLastY = 0;
    let swipeComboWindow = 0;

    const syncHud = () => {
      const targetFruitCount = levelConfig?.targetFruit
        ? slicedByType[levelConfig.targetFruit] || 0
        : 0;
      setHud({
        score,
        coins: coinsEarned,
        lives,
        maxLives: 4,
        hasShield,
        timeLeft: timeLeft !== null ? Math.max(0, timeLeft) : null,
        fruitsSliced,
        comboCount,
        maxCombo,
        targetFruitCount,
        activePowerUps: { ...activePowerUps },
      });
    };

    const activatePowerUp = (type: PowerUpType, fromInventory: boolean) => {
      if (ended) return;
      if (fromInventory) {
        if ((saveRef.current.powerUpInventory[type] || 0) <= 0) return;
        consumePowerUpRef.current(type);
      }
      audioEngine.playPowerUp();
      const spec = POWER_UPS[type];

      if (type === 'extraLife') {
        if (initialLives > 0) {
          lives = Math.min(4, lives + 1);
        } else {
          hasShield = true;
        }
        floatingTexts.push({
          x: width * 0.5,
          y: height * 0.35,
          vy: -45,
          text: initialLives > 0 ? '+1 LIFE!' : 'BOMB SHIELD!',
          color: spec.color,
          life: 0,
          maxLife: 1.1,
          scale: 1.15,
        });
      } else {
        activePowerUps[type] = spec.durationSec;
        floatingTexts.push({
          x: width * 0.5,
          y: height * 0.35,
          vy: -45,
          text: `${spec.name.toUpperCase()}!`,
          subText: `${spec.durationSec}s ACTIVE`,
          color: spec.color,
          life: 0,
          maxLife: 1.1,
          scale: 1.1,
        });
      }
      syncHud();
    };
    activatePowerUpFnRef.current = activatePowerUp;

    const finishGame = (bombHit: boolean) => {
      if (ended) return;
      ended = true;
      endedByBomb = bombHit;

      // Check level completion rules
      let levelPassed = false;
      let starsEarned = 0;

      if (mode === 'level' && levelConfig) {
        const hitScore = score >= levelConfig.targetScore;
        const hitFruit =
          !levelConfig.targetFruit ||
          (slicedByType[levelConfig.targetFruit] || 0) >= (levelConfig.targetFruitCount || 0);
        const hitCombos = !levelConfig.minCombos || comboCount >= levelConfig.minCombos;
        levelPassed = !bombHit && hitScore && hitFruit && hitCombos;

        if (levelPassed) {
          if (score >= levelConfig.starThresholds[2]) starsEarned = 3;
          else if (score >= levelConfig.starThresholds[1]) starsEarned = 2;
          else starsEarned = 1;
          coinsEarned += levelConfig.rewardCoins;
          audioEngine.playLevelComplete();
        } else {
          audioEngine.playGameOver();
        }
      } else {
        if (bombHit) {
          audioEngine.playGameOver();
        } else {
          audioEngine.playLevelComplete();
        }
      }

      const prevBest =
        mode === 'level'
          ? saveRef.current.levelBestScores[levelNumber] || 0
          : saveRef.current.highScores[mode];
      const isNewBest = score > prevBest && score > 0;
      const chestReady = saveRef.current.rewardChestProgress + fruitsSliced >= 100;

      setTimeout(() => {
        finishRef.current({
          mode,
          levelNumber: mode === 'level' ? levelNumber : undefined,
          score,
          coinsEarned,
          fruitsSliced,
          maxCombo,
          comboCount,
          starsEarned,
          levelPassed,
          endedByBomb,
          isNewBest,
          chestReady,
          slicedByType,
        });
      }, bombHit ? 520 : 280);
    };

    const spawnWave = () => {
      const difficultyRatio =
        mode === 'level' && levelConfig
          ? levelConfig.level / 100
          : Math.min(1, elapsed / 65);

      const maxWave =
        mode === 'level' && levelConfig
          ? levelConfig.maxWaveSize
          : Math.min(6, 2 + Math.floor(difficultyRatio * 4));

      const count = 1 + Math.floor(Math.random() * maxWave);
      const bombChance =
        mode === 'level' && levelConfig
          ? levelConfig.bombChance
          : mode === 'classic'
            ? Math.min(0.24, 0.06 + difficultyRatio * 0.16)
            : 0.12;

      const gravMultiplier =
        mode === 'level' && levelConfig ? levelConfig.gravityScale : 1 + difficultyRatio * 0.14;
      const gravity = 820 * gravMultiplier;

      for (let i = 0; i < count; i++) {
        const margin = Math.min(80, width * 0.15);
        const x = margin + Math.random() * Math.max(80, width - margin * 2);
        const y = height + 48 + i * 16;

        // Target peak height between 18% and 42% from top of screen
        const peakY = height * (0.14 + Math.random() * 0.28);
        const riseDist = Math.max(220, y - peakY);
        const vy = -Math.sqrt(2 * gravity * riseDist);

        // Aim slightly inward toward screen center so fruits stay sliceable on narrow Android portrait screens
        const centerBias = (width * 0.5 - x) * (0.35 + Math.random() * 0.45);
        const vx = centerBias + (Math.random() - 0.5) * 90;

        // Decide entity type: fruit, bomb, or occasional power-up orb
        const roll = Math.random();
        const powerUpChance = mode === 'arcade' ? 0.12 : mode === 'level' ? 0.06 : 0.04;

        if (roll < bombChance && elapsed > 1.8) {
          entities.push({
            id: nextId++,
            kind: 'bomb',
            x,
            y,
            vx,
            vy,
            radius: 33,
            rotation: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 3.5,
            sliced: false,
            enteredPlayfield: false,
            spawnTime: elapsed,
          });
        } else if (roll < bombChance + powerUpChance && elapsed > 3) {
          const pSpec = POWER_UP_LIST[Math.floor(Math.random() * POWER_UP_LIST.length)];
          entities.push({
            id: nextId++,
            kind: 'powerup',
            powerUpType: pSpec.id,
            x,
            y,
            vx,
            vy,
            radius: 30,
            rotation: 0,
            vr: 0,
            sliced: false,
            enteredPlayfield: false,
            spawnTime: elapsed,
          });
        } else {
          // Bias slightly toward level target fruit if this level requires a specific fruit
          let chosenFruit = FRUIT_LIST[Math.floor(Math.random() * FRUIT_LIST.length)];
          if (levelConfig?.targetFruit && Math.random() < 0.38) {
            chosenFruit = FRUITS[levelConfig.targetFruit];
          }
          entities.push({
            id: nextId++,
            kind: 'fruit',
            fruitType: chosenFruit.id,
            x,
            y,
            vx,
            vy,
            radius: chosenFruit.radius * (width < 430 ? 0.92 : 1),
            rotation: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 4.2,
            sliced: false,
            enteredPlayfield: false,
            spawnTime: elapsed,
          });
        }
      }
    };

    const resolveComboBonus = () => {
      if (swipeComboFruits >= 3) {
        comboCount += 1;
        if (swipeComboFruits > maxCombo) maxCombo = swipeComboFruits;

        const scoreMult = activePowerUps.doubleScore ? 2 : 1;
        const coinMult = activePowerUps.doubleCoins ? 2 : 1;
        const bonusPts = swipeComboFruits * 3 * scoreMult;
        const bonusCoins = swipeComboFruits * coinMult;

        score += bonusPts;
        coinsEarned += bonusCoins;

        hitstopTimer = Math.min(0.055, 0.025 + swipeComboFruits * 0.006);
        shakeIntensity = Math.min(10, 3 + swipeComboFruits * 1.4);
        audioEngine.playCombo(swipeComboFruits);

        floatingTexts.push({
          x: Math.max(85, Math.min(width - 85, swipeComboLastX)),
          y: Math.max(90, swipeComboLastY - 24),
          vy: -55,
          text: `${swipeComboFruits} FRUIT COMBO!`,
          subText: `+${bonusPts} PTS · +${bonusCoins} COINS`,
          color: '#fde047',
          life: 0,
          maxLife: 1.05,
          scale: 1.15,
        });
      }
      swipeComboFruits = 0;
      swipeComboWindow = 0;
    };

    const sliceEntity = (ent: ActiveEntity, cutAngle: number) => {
      ent.sliced = true;

      if (ent.kind === 'bomb') {
        if (hasShield) {
          hasShield = false;
          audioEngine.playPowerUp();
          shakeIntensity = 9;
          flashAlpha = 0.35;
          flashColor = '#38bdf8';
          floatingTexts.push({
            x: ent.x,
            y: ent.y,
            vy: -50,
            text: 'SHIELD BLOCKED BOMB!',
            color: '#38bdf8',
            life: 0,
            maxLife: 1.1,
            scale: 1.1,
          });
          syncHud();
          return;
        }

        audioEngine.playBombExplosion();
        shakeIntensity = 18;
        flashAlpha = 0.72;
        flashColor = '#ef4444';

        for (let i = 0; i < 36; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 140 + Math.random() * 440;
          spawnParticle(
            ent.x,
            ent.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            3 + Math.random() * 5,
            i % 2 === 0 ? '#f97316' : '#ef4444',
            0.55 + Math.random() * 0.35,
            260
          );
        }

        if (mode === 'classic' || (mode === 'level' && levelConfig?.timeLimitSec === null)) {
          lives = 0;
          syncHud();
          finishGame(true);
        } else {
          // Time Attack / Arcade / Timed Levels: bomb deducts points & shakes screen
          const penalty = mode === 'arcade' ? 15 : 10;
          score = Math.max(0, score - penalty);
          floatingTexts.push({
            x: ent.x,
            y: ent.y,
            vy: -45,
            text: `-${penalty} PTS`,
            subText: 'BOMB HIT!',
            color: '#f87171',
            life: 0,
            maxLife: 0.95,
            scale: 1.15,
          });
          syncHud();
        }
        return;
      }

      if (ent.kind === 'powerup' && ent.powerUpType) {
        activatePowerUp(ent.powerUpType, false);
        for (let i = 0; i < 18; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 120 + Math.random() * 240;
          spawnParticle(
            ent.x,
            ent.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            3.5,
            POWER_UPS[ent.powerUpType].color,
            0.55,
            180
          );
        }
        return;
      }

      if (ent.kind === 'fruit' && ent.fruitType) {
        const spec = FRUITS[ent.fruitType];
        const scoreMult = activePowerUps.doubleScore ? 2 : 1;
        const coinMult = activePowerUps.doubleCoins ? 2 : 1;

        const pts = spec.points * scoreMult;
        const coinGain = spec.coins * coinMult;

        score += pts;
        coinsEarned += coinGain;
        fruitsSliced += 1;
        slicedByType[ent.fruitType] = (slicedByType[ent.fruitType] || 0) + 1;

        audioEngine.playSlice(ent.radius);

        // Track swipe combo
        swipeComboFruits += 1;
        swipeComboLastX = ent.x;
        swipeComboLastY = ent.y;
        swipeComboWindow = 0.24;

        // Spawn two split halves perpendicular to slice angle
        const perpX = Math.cos(cutAngle + Math.PI / 2);
        const perpY = Math.sin(cutAngle + Math.PI / 2);
        const splitImpulse = 115;

        halves.push(
          {
            fruitType: ent.fruitType,
            x: ent.x - perpX * 6,
            y: ent.y - perpY * 6,
            vx: ent.vx - perpX * splitImpulse,
            vy: ent.vy - perpY * splitImpulse - 40,
            radius: ent.radius,
            rotation: ent.rotation,
            vr: ent.vr - 3.2,
            cutAngle: cutAngle - ent.rotation,
            side: -1,
            alpha: 1,
          },
          {
            fruitType: ent.fruitType,
            x: ent.x + perpX * 6,
            y: ent.y + perpY * 6,
            vx: ent.vx + perpX * splitImpulse,
            vy: ent.vy + perpY * splitImpulse - 40,
            radius: ent.radius,
            rotation: ent.rotation,
            vr: ent.vr + 3.2,
            cutAngle: cutAngle - ent.rotation,
            side: 1,
            alpha: 1,
          }
        );

        // Background juice splatter (capped at 14 active)
        if (splatters.length > 14) splatters.shift();
        splatters.push({
          x: ent.x,
          y: ent.y,
          radius: ent.radius * 0.72,
          color: spec.juiceColor,
          alpha: 1,
          blobs: Array.from({ length: 5 }, () => ({
            dx: (Math.random() - 0.5) * ent.radius * 1.9,
            dy: (Math.random() - 0.5) * ent.radius * 1.9,
            r: 5 + Math.random() * 11,
          })),
        });

        // Juice droplets & blade sparks
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 90 + Math.random() * 340;
          spawnParticle(
            ent.x,
            ent.y,
            Math.cos(a) * sp,
            Math.sin(a) * sp - 60,
            2.5 + Math.random() * 4.5,
            i % 4 === 0 ? bladeSpec.sparkColor : spec.juiceColor,
            0.42 + Math.random() * 0.35,
            780
          );
        }

        floatingTexts.push({
          x: ent.x,
          y: ent.y - 12,
          vy: -42,
          text: `+${pts}`,
          color: '#ffffff',
          life: 0,
          maxLife: 0.65,
          scale: 0.92,
        });

        // Check early win if level has no time limit and objectives are met!
        if (
          mode === 'level' &&
          levelConfig &&
          levelConfig.timeLimitSec === null &&
          score >= levelConfig.targetScore &&
          (!levelConfig.targetFruit ||
            (slicedByType[levelConfig.targetFruit] || 0) >= (levelConfig.targetFruitCount || 0)) &&
          (!levelConfig.minCombos || comboCount >= levelConfig.minCombos)
        ) {
          syncHud();
          finishGame(false);
          return;
        }

        syncHud();
      }
    };

    // Unified Pointer Events for Mouse & Android Touchscreen swiping
    const getCanvasPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isPausedRef.current || ended) return;
      audioEngine.unlock();
      isPointerDown = true;
      const pt = getCanvasPoint(e);
      prevPointer = pt;
      trail.push({ x: pt.x, y: pt.y, time: performance.now() });
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown || isPausedRef.current || ended) return;
      const pt = getCanvasPoint(e);
      const nowMs = performance.now();
      trail.push({ x: pt.x, y: pt.y, time: nowMs });
      if (trail.length > 24) trail.shift();

      if (prevPointer) {
        const dist = Math.hypot(pt.x - prevPointer.x, pt.y - prevPointer.y);
        if (dist > 4) {
          if (dist > 14) audioEngine.playSwipe();
          const cutAngle = Math.atan2(pt.y - prevPointer.y, pt.x - prevPointer.x);

          for (let i = 0; i < entities.length; i++) {
            const ent = entities[i];
            if (ent.sliced) continue;
            if (
              segmentCircleIntersect(
                prevPointer.x,
                prevPointer.y,
                pt.x,
                pt.y,
                ent.x,
                ent.y,
                ent.radius + 6
              )
            ) {
              sliceEntity(ent, cutAngle);
            }
          }
        }
      }
      prevPointer = pt;
    };

    const handlePointerUp = () => {
      isPointerDown = false;
      prevPointer = null;
      resolveComboBonus();
    };

    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('blur', handlePointerUp);

    let rafId = 0;
    let lastTime = performance.now();
    let hudTick = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);

      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const clampedDt = Math.min(rawDt, 0.05);

      if (isPausedRef.current) {
        return;
      }

      if (hitstopTimer > 0) {
        hitstopTimer -= clampedDt;
      }

      const simSpeed = hitstopTimer > 0 ? 0.15 : activePowerUps.slowMotion ? 0.45 : 1;
      const dt = clampedDt * simSpeed;

      if (!ended) {
        elapsed += clampedDt;

        // Power-up countdown timers
        let powerUpChanged = false;
        (Object.keys(activePowerUps) as PowerUpType[]).forEach((key) => {
          const rem = activePowerUps[key];
          if (rem !== undefined) {
            const nextRem = rem - clampedDt;
            if (nextRem <= 0) {
              delete activePowerUps[key];
              powerUpChanged = true;
            } else {
              activePowerUps[key] = nextRem;
            }
          }
        });

        // Mode countdown timer (frozen if Freeze Time is active)
        if (timeLeft !== null && !activePowerUps.freezeTime) {
          timeLeft -= clampedDt;
          if (timeLeft <= 0) {
            timeLeft = 0;
            syncHud();
            finishGame(false);
          }
        }

        // Swipe combo expiry
        if (swipeComboWindow > 0) {
          swipeComboWindow -= clampedDt;
          if (swipeComboWindow <= 0) {
            resolveComboBonus();
          }
        }

        // Wave spawning
        const spawnInterval = activePowerUps.freezeTime
          ? 2.1
          : mode === 'level' && levelConfig
            ? levelConfig.spawnIntervalSec
            : Math.max(0.65, 1.48 - elapsed * 0.011);

        spawnTimer -= clampedDt;
        if (spawnTimer <= 0) {
          spawnWave();
          spawnTimer = spawnInterval;
        }

        hudTick += clampedDt;
        if (hudTick >= 0.12 || powerUpChanged) {
          hudTick = 0;
          syncHud();
        }
      }

      const gravMultiplier = mode === 'level' && levelConfig ? levelConfig.gravityScale : 1;
      const gravity = 820 * gravMultiplier;

      // Update active entities
      for (let i = entities.length - 1; i >= 0; i--) {
        const ent = entities[i];
        if (ent.sliced) {
          entities.splice(i, 1);
          continue;
        }

        // Fruit Magnet gently pulls airborne fruits toward center slice zone
        if (activePowerUps.fruitMagnet && ent.kind === 'fruit') {
          ent.vx += (width * 0.5 - ent.x) * 2.4 * dt;
          ent.vy += (height * 0.42 - ent.y) * 1.1 * dt;
        }

        ent.x += ent.vx * dt;
        ent.y += ent.vy * dt;
        ent.vy += gravity * dt;
        ent.rotation += ent.vr * dt;

        // Soft wall bounce so fruits stay visible on narrow Android screens
        if (ent.x < ent.radius && ent.vx < 0) {
          ent.x = ent.radius;
          ent.vx *= -0.7;
        } else if (ent.x > width - ent.radius && ent.vx > 0) {
          ent.x = width - ent.radius;
          ent.vx *= -0.7;
        }

        if (ent.y < height - 20) {
          ent.enteredPlayfield = true;
        }

        // Check missed fruit falling off bottom
        if (ent.y > height + 85 && ent.vy > 0) {
          if (!ended && ent.enteredPlayfield && ent.kind === 'fruit' && initialLives > 0) {
            lives = Math.max(0, lives - 1);
            shakeIntensity = 7;
            flashAlpha = 0.25;
            flashColor = '#ef4444';
            floatingTexts.push({
              x: Math.max(55, Math.min(width - 55, ent.x)),
              y: height - 60,
              vy: -35,
              text: 'MISSED!',
              color: '#f87171',
              life: 0,
              maxLife: 0.85,
              scale: 0.95,
            });
            syncHud();
            if (lives <= 0) {
              finishGame(false);
            }
          }
          entities.splice(i, 1);
        }
      }

      // Update sliced halves
      for (let i = halves.length - 1; i >= 0; i--) {
        const h = halves[i];
        h.x += h.vx * dt;
        h.y += h.vy * dt;
        h.vy += gravity * dt;
        h.rotation += h.vr * dt;
        if (h.y > height + 90) {
          halves.splice(i, 1);
        }
      }

      // Update background juice splatters
      for (let i = splatters.length - 1; i >= 0; i--) {
        splatters[i].alpha -= clampedDt * 0.22;
        if (splatters[i].alpha <= 0) splatters.splice(i, 1);
      }

      // Update pooled particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life += clampedDt;
        if (p.life >= p.maxLife) {
          p.active = false;
          continue;
        }
        p.x += p.vx * clampedDt;
        p.y += p.vy * clampedDt;
        p.vy += p.gravity * clampedDt;
        p.alpha = 1 - p.life / p.maxLife;
      }

      // Update floating texts
      for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.life += clampedDt;
        ft.y += ft.vy * clampedDt;
        if (ft.life >= ft.maxLife) {
          floatingTexts.splice(i, 1);
        }
      }

      // Decay trail
      while (trail.length > 0 && now - trail[0].time > 180) {
        trail.shift();
      }

      // Decay screen shake & flash
      if (shakeIntensity > 0) {
        shakeIntensity = Math.max(0, shakeIntensity - clampedDt * 34);
      }
      if (flashAlpha > 0) {
        flashAlpha = Math.max(0, flashAlpha - clampedDt * 2.1);
      }

      // === RENDER FRAME ===
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      if (shakeIntensity > 0.2) {
        const sx = (Math.random() - 0.5) * shakeIntensity * 1.4;
        const sy = (Math.random() - 0.5) * shakeIntensity * 1.4;
        ctx.translate(sx, sy);
      }

      // Subtle active power-up tint rim
      if (activePowerUps.freezeTime) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(0, 0, width, height);
      } else if (activePowerUps.slowMotion) {
        ctx.fillStyle = 'rgba(167, 139, 250, 0.07)';
        ctx.fillRect(0, 0, width, height);
      }

      for (const s of splatters) {
        drawSplatter(ctx, s);
      }

      for (const h of halves) {
        drawSlicedHalf(ctx, h);
      }

      for (const ent of entities) {
        drawEntity(ctx, ent, elapsed);
      }

      // Draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (!p.active) continue;
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Blade slash ribbon
      drawBladeTrail(ctx, trail, bladeSpec, now);

      // Floating score/combo texts
      for (const ft of floatingTexts) {
        const progress = ft.life / ft.maxLife;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - Math.pow(progress, 1.8));
        ctx.translate(ft.x, ft.y);
        ctx.scale(ft.scale, ft.scale);
        ctx.textAlign = 'center';
        ctx.font = '800 22px Outfit, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(0,0,0,0.72)';
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        if (ft.subText) {
          ctx.font = '700 12px Plus Jakarta Sans, sans-serif';
          ctx.strokeText(ft.subText, 0, 18);
          ctx.fillStyle = '#fffbeb';
          ctx.fillText(ft.subText, 0, 18);
        }
        ctx.restore();
      }

      // Impact / bomb flash overlay
      if (flashAlpha > 0) {
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('blur', handlePointerUp);
    };
  }, [mode, levelNumber, bladeSpec, levelConfig, initialLives, initialTime]);

  const powerUpIcon = (type: PowerUpType) => {
    switch (type) {
      case 'freezeTime':
        return <Snowflake className="w-4 h-4" />;
      case 'doubleCoins':
        return <Coins className="w-4 h-4" />;
      case 'slowMotion':
        return <Clock className="w-4 h-4" />;
      case 'extraLife':
        return <Heart className="w-4 h-4" />;
      case 'fruitMagnet':
        return <Magnet className="w-4 h-4" />;
      case 'doubleScore':
        return <Flame className="w-4 h-4" />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{ background: bgSpec.fallbackGradient }}
    >
      {/* Dojo Background Layer */}
      {bgSpec.imageUrl && (
        <img
          src={bgSpec.imageUrl}
          alt={bgSpec.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 35%, rgba(0,0,0,0.08) 0%, rgba(10,5,2,0.58) 100%)',
        }}
      />

      {/* Active 60FPS Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none-canvas cursor-crosshair"
      />

      {/* Low-Occlusion Top Perimeter HUD */}
      <div className="absolute top-0 inset-x-0 z-10 pointer-events-none px-4 pt-3 flex items-start justify-between gap-3">
        {/* Left: Score & Coins */}
        <div className="flex flex-col gap-0.5 bg-black/45 border border-amber-500/20 rounded-xl px-3.5 py-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] uppercase tracking-wider text-amber-300/80 font-semibold">
              Score
            </span>
            <span className="font-display font-extrabold text-2xl sm:text-3xl text-amber-50 font-mono-tabular leading-none">
              {hud.score}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-amber-200/90 font-mono-tabular">
            <span className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              +{hud.coins}
            </span>
            {mode === 'level' && levelConfig && (
              <span className="text-amber-300/80">
                Goal {levelConfig.targetScore}
              </span>
            )}
          </div>
        </div>

        {/* Center: Mode / Level Objective Indicator */}
        <div className="hidden sm:flex flex-col items-center bg-black/40 border border-white/10 rounded-xl px-3.5 py-1.5 text-center">
          <span className="text-xs font-semibold text-amber-300">
            {mode === 'level' && levelConfig
              ? `Level ${levelConfig.level} · ${levelConfig.title}`
              : mode === 'classic'
                ? 'Classic Mode'
                : mode === 'timeAttack'
                  ? 'Time Attack'
                  : 'Arcade Mode'}
          </span>
          {mode === 'level' && levelConfig?.targetFruit && (
            <span className="text-[11px] text-amber-100/80 font-mono-tabular">
              {FRUITS[levelConfig.targetFruit].name}: {hud.targetFruitCount}/
              {levelConfig.targetFruitCount}
            </span>
          )}
          {mode === 'level' && levelConfig?.minCombos && (
            <span className="text-[11px] text-amber-100/80 font-mono-tabular">
              Combos: {hud.comboCount}/{levelConfig.minCombos}
            </span>
          )}
        </div>

        {/* Right: Lives / Timer + Pause Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {hud.timeLeft !== null ? (
            <div
              className={`bg-black/45 border rounded-xl px-3 py-2 flex items-center gap-1.5 font-mono-tabular font-bold text-lg ${
                hud.activePowerUps.freezeTime
                  ? 'border-sky-400/50 text-sky-300'
                  : hud.timeLeft <= 10
                    ? 'border-red-500/60 text-red-400'
                    : 'border-amber-500/20 text-amber-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{Math.ceil(hud.timeLeft)}s</span>
            </div>
          ) : (
            <div className="bg-black/45 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-1.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <Heart
                  key={idx}
                  className={`w-5 h-5 transition-transform ${
                    idx < hud.lives
                      ? 'text-rose-500 fill-rose-500 scale-100'
                      : 'text-zinc-600 scale-90'
                  }`}
                />
              ))}
              {hud.lives > 3 && (
                <span className="text-xs font-bold text-rose-400 font-mono-tabular">+1</span>
              )}
              {hud.hasShield && <Shield className="w-4 h-4 text-sky-400 ml-1" />}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setIsPaused(true);
            }}
            aria-label="Pause Game"
            className="w-11 h-11 rounded-xl bg-black/55 hover:bg-black/75 border border-white/15 flex items-center justify-center text-amber-50 transition-colors cursor-pointer"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Compact Mobile Objective Strip (when screen < sm) */}
      {mode === 'level' && levelConfig && (
        <div className="sm:hidden absolute top-16 inset-x-4 z-10 pointer-events-none flex justify-center">
          <div className="bg-black/45 border border-white/10 rounded-lg px-3 py-1 text-[11px] text-amber-200 font-medium text-center">
            L{levelConfig.level}: {levelConfig.objectiveText}
          </div>
        </div>
      )}

      {/* Active Power-Up Status Bars */}
      {Object.keys(hud.activePowerUps).length > 0 && (
        <div className="absolute top-20 right-4 z-10 pointer-events-none flex flex-col gap-1.5">
          {(Object.entries(hud.activePowerUps) as [PowerUpType, number][]).map(([key, secs]) => {
            const spec = POWER_UPS[key];
            return (
              <div
                key={key}
                className="flex items-center gap-2 bg-black/60 border border-white/15 rounded-lg px-2.5 py-1 text-xs font-semibold text-white font-mono-tabular"
              >
                <span style={{ color: spec.color }}>{powerUpIcon(key)}</span>
                <span>{spec.shortLabel}</span>
                <span className="text-amber-300">{secs.toFixed(1)}s</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Tactical Power-Up Buttons (Uses Player Inventory) */}
      <div className="absolute bottom-3 inset-x-0 z-10 pointer-events-none flex justify-center px-3">
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-black/55 border border-white/15 rounded-2xl p-1.5">
          {POWER_UP_LIST.map((p) => {
            const qty = saveData.powerUpInventory[p.id] || 0;
            const isActive = Boolean(hud.activePowerUps[p.id]);
            return (
              <button
                key={p.id}
                type="button"
                disabled={qty <= 0 || isPaused}
                onClick={() => activatePowerUpFnRef.current?.(p.id, true)}
                title={`${p.name}: ${p.description}`}
                className={`relative min-w-[46px] h-11 px-2 rounded-xl flex flex-col items-center justify-center transition-transform active:scale-95 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                  isActive
                    ? 'bg-amber-500/25 border border-amber-400'
                    : 'bg-white/5 hover:bg-white/15 border border-white/10'
                }`}
              >
                <span style={{ color: p.color }}>{powerUpIcon(p.id)}</span>
                <span className="text-[10px] font-bold text-amber-50 leading-none mt-0.5 font-mono-tabular">
                  x{qty}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pause Overlay Modal */}
      {isPaused && (
        <div className="absolute inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#24140c] border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-amber-50">
                  Game Paused
                </h2>
                <p className="text-xs text-amber-200/70 mt-0.5">
                  Score {hud.score} · +{hud.coins} coins earned
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setIsPaused(false);
                }}
                aria-label="Close Pause Menu"
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-amber-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onToggleSound();
                }}
                className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-sm font-medium text-amber-100 cursor-pointer"
              >
                {saveData.soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
                <span>SFX {saveData.soundEnabled ? 'On' : 'Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onToggleMusic();
                }}
                className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 text-sm font-medium text-amber-100 cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${saveData.musicEnabled ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>Music {saveData.musicEnabled ? 'On' : 'Off'}</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  setIsPaused(false);
                }}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1c0f08] font-display font-extrabold text-base flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onExitToMenu();
                }}
                className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/15 text-amber-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Quit to Menu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
