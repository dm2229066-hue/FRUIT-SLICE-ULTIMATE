import {
  AchievementDef,
  BackgroundSpec,
  BladeSpec,
  FruitSpec,
  FruitType,
  LevelConfig,
  PowerUpSpec,
  PowerUpType,
} from './types';

export const FRUITS: Record<FruitType, FruitSpec> = {
  watermelon: {
    id: 'watermelon',
    name: 'Watermelon',
    radius: 44,
    points: 15,
    coins: 2,
    outerColor: '#15803d',
    outerSecondary: '#052e16',
    rindColor: '#dcfce7',
    fleshColor: '#ef4444',
    seedColor: '#1c1917',
    juiceColor: '#f87171',
    description: 'Heavy melon with deep crimson flesh and crisp rind.',
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    radius: 32,
    points: 10,
    coins: 1,
    outerColor: '#dc2626',
    outerSecondary: '#991b1b',
    rindColor: '#fef2f2',
    fleshColor: '#fef9c3',
    seedColor: '#451a03',
    juiceColor: '#fca5a5',
    description: 'Crisp orchard apple with sweet golden-cream core.',
  },
  banana: {
    id: 'banana',
    name: 'Banana',
    radius: 33,
    points: 12,
    coins: 1,
    outerColor: '#facc15',
    outerSecondary: '#ca8a04',
    rindColor: '#fef08a',
    fleshColor: '#fefce8',
    seedColor: '#a16207',
    juiceColor: '#fde047',
    description: 'Curved golden fruit that spins rapidly across the arc.',
  },
  orange: {
    id: 'orange',
    name: 'Orange',
    radius: 33,
    points: 10,
    coins: 1,
    outerColor: '#f97316',
    outerSecondary: '#c2410c',
    rindColor: '#ffedd5',
    fleshColor: '#fb923c',
    seedColor: '#fff7ed',
    juiceColor: '#fdba74',
    description: 'Zesty citrus burst packed with tangy juice.',
  },
  pineapple: {
    id: 'pineapple',
    name: 'Pineapple',
    radius: 42,
    points: 25,
    coins: 3,
    outerColor: '#eab308',
    outerSecondary: '#a16207',
    rindColor: '#fef08a',
    fleshColor: '#fde047',
    seedColor: '#b45309',
    juiceColor: '#fef08a',
    description: 'Crowned tropical prize yielding high points and coins.',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Strawberry',
    radius: 26,
    points: 14,
    coins: 2,
    outerColor: '#e11d48',
    outerSecondary: '#9f1239',
    rindColor: '#fecdd3',
    fleshColor: '#fb7185',
    seedColor: '#fef08a',
    juiceColor: '#f43f5e',
    description: 'Small, fast berry target requiring sharp blade precision.',
  },
  kiwi: {
    id: 'kiwi',
    name: 'Kiwi',
    radius: 29,
    points: 12,
    coins: 2,
    outerColor: '#78552b',
    outerSecondary: '#4a3216',
    rindColor: '#bef264',
    fleshColor: '#84cc16',
    seedColor: '#18181b',
    juiceColor: '#a3e635',
    description: 'Velvety brown shell hiding vivid emerald kiwi flesh.',
  },
  mango: {
    id: 'mango',
    name: 'Mango',
    radius: 35,
    points: 18,
    coins: 2,
    outerColor: '#f59e0b',
    outerSecondary: '#dc2626',
    rindColor: '#fde68a',
    fleshColor: '#fbbf24',
    seedColor: '#fef3c7',
    juiceColor: '#fcd34d',
    description: 'Sun-blushed tropical fruit with rich amber nectar.',
  },
  grapes: {
    id: 'grapes',
    name: 'Grapes',
    radius: 34,
    points: 16,
    coins: 2,
    outerColor: '#7e22ce',
    outerSecondary: '#4c1d95',
    rindColor: '#e9d5ff',
    fleshColor: '#a855f7',
    seedColor: '#3b0764',
    juiceColor: '#c084fc',
    description: 'Sweet purple cluster that bursts into violet droplets.',
  },
  coconut: {
    id: 'coconut',
    name: 'Coconut',
    radius: 38,
    points: 30,
    coins: 4,
    outerColor: '#5c3a21',
    outerSecondary: '#3b2313',
    rindColor: '#7c4d2b',
    fleshColor: '#f8fafc',
    seedColor: '#cbd5e1',
    juiceColor: '#f1f5f9',
    description: 'Armored shell that splits cleanly for top coin payout.',
  },
};

export const FRUIT_LIST: FruitSpec[] = Object.values(FRUITS);

export const POWER_UPS: Record<PowerUpType, PowerUpSpec> = {
  freezeTime: {
    id: 'freezeTime',
    name: 'Freeze Time',
    shortLabel: 'Freeze',
    description: 'Pauses the countdown timer and chills wave launches for 6s.',
    durationSec: 6,
    color: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.55)',
    shopCost: 45,
  },
  doubleCoins: {
    id: 'doubleCoins',
    name: 'Double Coins',
    shortLabel: '2x Coins',
    description: 'Doubles every coin earned from slices and combos for 10s.',
    durationSec: 10,
    color: '#facc15',
    glowColor: 'rgba(250, 204, 21, 0.55)',
    shopCost: 50,
  },
  slowMotion: {
    id: 'slowMotion',
    name: 'Slow Motion',
    shortLabel: 'Slow Mo',
    description: 'Slows airborne fruit physics to 45% speed for 6s.',
    durationSec: 6,
    color: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.55)',
    shopCost: 40,
  },
  extraLife: {
    id: 'extraLife',
    name: 'Extra Life',
    shortLabel: '+1 Life',
    description: 'Restores +1 life or adds a one-hit bomb deflection shield.',
    durationSec: 0,
    color: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.55)',
    shopCost: 65,
  },
  fruitMagnet: {
    id: 'fruitMagnet',
    name: 'Fruit Magnet',
    shortLabel: 'Magnet',
    description: 'Draws launched fruits toward the center slice zone for 8s.',
    durationSec: 8,
    color: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.55)',
    shopCost: 55,
  },
  doubleScore: {
    id: 'doubleScore',
    name: 'Double Score',
    shortLabel: '2x Score',
    description: 'Doubles all fruit and combo points for 10s.',
    durationSec: 10,
    color: '#fb923c',
    glowColor: 'rgba(251, 146, 60, 0.55)',
    shopCost: 60,
  },
};

export const POWER_UP_LIST: PowerUpSpec[] = Object.values(POWER_UPS);

export const BLADES: BladeSpec[] = [
  {
    id: 'steel',
    name: 'Steel Katana',
    description: 'Balanced silver edge forged for crisp clean cuts.',
    cost: 0,
    coreColor: '#ffffff',
    edgeColor: '#bae6fd',
    glowColor: '#38bdf8',
    sparkColor: '#e0f2fe',
  },
  {
    id: 'crimson',
    name: 'Crimson Ember',
    description: 'Blazing scarlet trail that ignites flying embers.',
    cost: 120,
    coreColor: '#fff1f2',
    edgeColor: '#f43f5e',
    glowColor: '#e11d48',
    sparkColor: '#fb923c',
  },
  {
    id: 'jade',
    name: 'Jade Wind',
    description: 'Emerald bamboo blade leaving sweeping wind ribbons.',
    cost: 220,
    coreColor: '#ecfdf5',
    edgeColor: '#34d399',
    glowColor: '#10b981',
    sparkColor: '#a7f3d0',
  },
  {
    id: 'gold',
    name: 'Imperial Gold',
    description: 'Gilded ceremonial blade shimmering with golden dust.',
    cost: 350,
    coreColor: '#fefce8',
    edgeColor: '#facc15',
    glowColor: '#eab308',
    sparkColor: '#fde047',
  },
  {
    id: 'frost',
    name: 'Glacier Fang',
    description: 'Crystalline frost arc leaving icy mist droplets.',
    cost: 480,
    coreColor: '#f0f9ff',
    edgeColor: '#38bdf8',
    glowColor: '#0284c7',
    sparkColor: '#bae6fd',
  },
  {
    id: 'shadow',
    name: 'Shadow Void',
    description: 'Obsidian midnight slash edged with violet lightning.',
    cost: 680,
    coreColor: '#f5f3ff',
    edgeColor: '#a855f7',
    glowColor: '#7e22ce',
    sparkColor: '#c084fc',
  },
];

export const BACKGROUNDS: BackgroundSpec[] = [
  {
    id: 'dojoWood',
    name: 'Hinoki Dojo',
    description: 'Classic warm lantern-lit hardwood dojo planks.',
    cost: 0,
    imageUrl: '/src/assets/images/dojo_wood_backdrop_1795183812223.jpg',
    fallbackGradient: 'linear-gradient(180deg, #3b1e0e 0%, #231107 55%, #120804 100%)',
    accentTint: 'rgba(245, 158, 11, 0.08)',
  },
  {
    id: 'sakuraNight',
    name: 'Sakura Courtyard',
    description: 'Moonlit bamboo courtyard with drifting sakura blossoms.',
    cost: 250,
    imageUrl: '/src/assets/images/sakura_night_backdrop_1795183812460.jpg',
    fallbackGradient: 'linear-gradient(180deg, #172554 0%, #1e1b4b 50%, #0f172a 100%)',
    accentTint: 'rgba(244, 114, 182, 0.08)',
  },
  {
    id: 'bambooSun',
    name: 'Emerald Grove',
    description: 'Sunlit cedar and mossy bamboo sanctuary.',
    cost: 400,
    fallbackGradient: 'linear-gradient(180deg, #14532d 0%, #064e3b 50%, #052e16 100%)',
    accentTint: 'rgba(52, 211, 153, 0.1)',
  },
  {
    id: 'midnightSteel',
    name: 'Obsidian Forge',
    description: 'Dark slate training hall lit by forge embers.',
    cost: 550,
    fallbackGradient: 'linear-gradient(180deg, #27272a 0%, #18181b 55%, #09090b 100%)',
    accentTint: 'rgba(249, 115, 22, 0.1)',
  },
];

const LEVEL_TITLES = [
  'First Cut',
  'Orchard Warmup',
  'Citrus Volley',
  'Melon Split',
  'Bamboo Precision',
  'Tropical Rush',
  'Double Arc',
  'Berry Reflex',
  'Combo Trial',
  'Dojo Initiate',
];

const FRUIT_ROTATION: FruitType[] = [
  'watermelon',
  'apple',
  'banana',
  'orange',
  'pineapple',
  'strawberry',
  'kiwi',
  'mango',
  'grapes',
  'coconut',
];

export const LEVELS: LevelConfig[] = Array.from({ length: 100 }, (_, idx) => {
  const level = idx + 1;
  const tier = Math.floor(idx / 10);
  const titleBase = LEVEL_TITLES[idx % LEVEL_TITLES.length];
  const title = level <= 10 ? titleBase : `${titleBase} ${tier + 1}`;

  // Gradual difficulty scaling from Level 1 to Level 100
  const targetScore = Math.round(70 + level * 18 + Math.pow(level, 1.12) * 3);
  const isTimed = level % 3 !== 0; // Mix of timed sprints & 3-life precision runs
  const timeLimitSec = isTimed ? Math.max(35, 58 - Math.floor(level * 0.18)) : null;

  // Special challenges every few levels
  const hasFruitObjective = level % 2 === 0 && level >= 4;
  const targetFruit = hasFruitObjective ? FRUIT_ROTATION[level % FRUIT_ROTATION.length] : undefined;
  const targetFruitCount = hasFruitObjective ? Math.min(18, 3 + Math.floor(level / 8)) : undefined;

  const hasComboObjective = level % 5 === 0;
  const minCombos = hasComboObjective ? Math.min(8, 1 + Math.floor(level / 15)) : undefined;

  const bombChance = level === 1 ? 0 : Math.min(0.26, 0.04 + level * 0.0021);
  const spawnIntervalSec = Math.max(0.62, 1.55 - level * 0.0085);
  const maxWaveSize = Math.min(7, 2 + Math.floor(level / 16));
  const gravityScale = Math.min(1.28, 0.92 + level * 0.0032);
  const rewardCoins = 18 + level * 2;

  const objectiveParts: string[] = [`Score ${targetScore}`];
  if (targetFruit && targetFruitCount) {
    objectiveParts.push(`Slice ${targetFruitCount} ${FRUITS[targetFruit].name}s`);
  }
  if (minCombos) {
    objectiveParts.push(`${minCombos}+ Combos`);
  }
  if (timeLimitSec) {
    objectiveParts.push(`within ${timeLimitSec}s`);
  } else {
    objectiveParts.push('with 3 Lives');
  }

  return {
    level,
    title,
    objectiveText: objectiveParts.join(' · '),
    targetScore,
    timeLimitSec,
    targetFruit,
    targetFruitCount,
    minCombos,
    bombChance,
    spawnIntervalSec,
    maxWaveSize,
    gravityScale,
    rewardCoins,
    starThresholds: [
      targetScore,
      Math.round(targetScore * 1.3),
      Math.round(targetScore * 1.65),
    ],
  };
});

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_slice',
    title: 'First Steel',
    description: 'Slice your first 25 fruits across any mode.',
    target: 25,
    rewardCoins: 30,
    statKey: 'totalFruitsSliced',
  },
  {
    id: 'fruit_harvester',
    title: 'Orchard Master',
    description: 'Slice 250 total fruits.',
    target: 250,
    rewardCoins: 90,
    statKey: 'totalFruitsSliced',
  },
  {
    id: 'century_slicer',
    title: 'Thousand Cuts',
    description: 'Slice 1,000 total fruits.',
    target: 1000,
    rewardCoins: 250,
    statKey: 'totalFruitsSliced',
  },
  {
    id: 'combo_starter',
    title: 'Triple Thread',
    description: 'Land 10 multi-fruit combos.',
    target: 10,
    rewardCoins: 50,
    statKey: 'totalCombos',
  },
  {
    id: 'combo_legend',
    title: 'Blademaster Flow',
    description: 'Land 60 multi-fruit combos.',
    target: 60,
    rewardCoins: 180,
    statKey: 'totalCombos',
  },
  {
    id: 'big_swipe',
    title: 'Five-Fold Slash',
    description: 'Slice 5 fruits in a single combo swipe.',
    target: 5,
    rewardCoins: 120,
    statKey: 'bestCombo',
  },
  {
    id: 'level_10',
    title: 'Apprentice Rank',
    description: 'Reach Level 10 in the Dojo Campaign.',
    target: 10,
    rewardCoins: 75,
    statKey: 'unlockedLevel',
  },
  {
    id: 'level_50',
    title: 'Master Rank',
    description: 'Reach Level 50 in the Dojo Campaign.',
    target: 50,
    rewardCoins: 220,
    statKey: 'unlockedLevel',
  },
  {
    id: 'level_100',
    title: 'Grandmaster 100',
    description: 'Unlock Level 100 in the Dojo Campaign.',
    target: 100,
    rewardCoins: 500,
    statKey: 'unlockedLevel',
  },
  {
    id: 'score_500',
    title: 'High Score Hunter',
    description: 'Reach 500 points in Classic, Time Attack, or Arcade.',
    target: 500,
    rewardCoins: 110,
    statKey: 'highScoreMax',
  },
  {
    id: 'blade_collector',
    title: 'Armory Collector',
    description: 'Own 3 different blades.',
    target: 3,
    rewardCoins: 100,
    statKey: 'bladesOwned',
  },
  {
    id: 'bomb_survivor',
    title: 'Steady Hand',
    description: 'Complete 15 matches without hitting a single bomb.',
    target: 15,
    rewardCoins: 130,
    statKey: 'bombsDodgedRuns',
  },
];

export const DAILY_STREAK_REWARDS = [25, 40, 60, 85, 110, 150, 250];
