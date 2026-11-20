export type FruitType =
  | 'watermelon'
  | 'apple'
  | 'banana'
  | 'orange'
  | 'pineapple'
  | 'strawberry'
  | 'kiwi'
  | 'mango'
  | 'grapes'
  | 'coconut';

export type PowerUpType =
  | 'freezeTime'
  | 'doubleCoins'
  | 'slowMotion'
  | 'extraLife'
  | 'fruitMagnet'
  | 'doubleScore';

export type GameMode = 'classic' | 'timeAttack' | 'arcade' | 'level';

export type BladeId = 'steel' | 'crimson' | 'jade' | 'gold' | 'frost' | 'shadow';

export type BackgroundId = 'dojoWood' | 'sakuraNight' | 'bambooSun' | 'midnightSteel';

export type ScreenRoute =
  | 'menu'
  | 'modes'
  | 'levels'
  | 'playing'
  | 'shop'
  | 'daily'
  | 'achievements'
  | 'leaderboard'
  | 'settings';

export interface FruitSpec {
  id: FruitType;
  name: string;
  radius: number;
  points: number;
  coins: number;
  outerColor: string;
  outerSecondary: string;
  rindColor: string;
  fleshColor: string;
  seedColor: string;
  juiceColor: string;
  description: string;
}

export interface PowerUpSpec {
  id: PowerUpType;
  name: string;
  shortLabel: string;
  description: string;
  durationSec: number;
  color: string;
  glowColor: string;
  shopCost: number;
}

export interface BladeSpec {
  id: BladeId;
  name: string;
  description: string;
  cost: number;
  coreColor: string;
  edgeColor: string;
  glowColor: string;
  sparkColor: string;
}

export interface BackgroundSpec {
  id: BackgroundId;
  name: string;
  description: string;
  cost: number;
  imageUrl?: string;
  fallbackGradient: string;
  accentTint: string;
}

export interface LevelConfig {
  level: number;
  title: string;
  objectiveText: string;
  targetScore: number;
  timeLimitSec: number | null; // null = 3 lives survival-to-target, number = timed challenge
  targetFruit?: FruitType;
  targetFruitCount?: number;
  minCombos?: number;
  bombChance: number;
  spawnIntervalSec: number;
  maxWaveSize: number;
  gravityScale: number;
  rewardCoins: number;
  starThresholds: [number, number, number];
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  statKey:
    | 'totalFruitsSliced'
    | 'totalCombos'
    | 'bestCombo'
    | 'unlockedLevel'
    | 'highScoreMax'
    | 'totalCoinsEarned'
    | 'bladesOwned'
    | 'bombsDodgedRuns';
}

export interface AchievementState {
  unlocked: boolean;
  claimed: boolean;
}

export interface DailyChallengeState {
  date: string;
  targetFruit: FruitType;
  targetCount: number;
  progress: number;
  claimed: boolean;
  rewardCoins: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  mode: GameMode;
  level?: number;
  date: string;
}

export interface SaveData {
  playerName: string;
  coins: number;
  totalCoinsEarned: number;
  highScores: {
    classic: number;
    timeAttack: number;
    arcade: number;
  };
  unlockedLevel: number;
  levelStars: Record<number, number>;
  levelBestScores: Record<number, number>;
  selectedBlade: BladeId;
  unlockedBlades: BladeId[];
  selectedBackground: BackgroundId;
  unlockedBackgrounds: BackgroundId[];
  achievements: Record<string, AchievementState>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  lastDailyLoginDate: string | null;
  dailyStreak: number;
  dailyChallenge: DailyChallengeState;
  totalFruitsSliced: number;
  totalCombos: number;
  bestCombo: number;
  bombsDodgedRuns: number;
  powerUpInventory: Record<PowerUpType, number>;
  rewardChestProgress: number; // 0..100
  adConsentAccepted: boolean | null;
  leaderboard: LeaderboardEntry[];
}

export interface MatchSummary {
  mode: GameMode;
  levelNumber?: number;
  score: number;
  coinsEarned: number;
  fruitsSliced: number;
  maxCombo: number;
  comboCount: number;
  starsEarned: number;
  levelPassed: boolean;
  endedByBomb: boolean;
  isNewBest: boolean;
  chestReady: boolean;
  slicedByType: Partial<Record<FruitType, number>>;
}
