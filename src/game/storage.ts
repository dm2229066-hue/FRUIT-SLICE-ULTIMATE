import { ACHIEVEMENTS, FRUIT_LIST } from './constants';
import { DailyChallengeState, FruitType, PowerUpType, SaveData } from './types';

const STORAGE_KEY = 'fruit_slice_ultimate_save_v1';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDailyChallenge(dateKey: string): DailyChallengeState {
  // Deterministic fruit selection based on date string
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 997;
  }
  const fruit = FRUIT_LIST[hash % FRUIT_LIST.length].id as FruitType;
  const targetCount = 15 + (hash % 15);
  return {
    date: dateKey,
    targetFruit: fruit,
    targetCount,
    progress: 0,
    claimed: false,
    rewardCoins: 75 + (hash % 6) * 10,
  };
}

export function createDefaultSaveData(): SaveData {
  const today = getTodayKey();
  const achievements: SaveData['achievements'] = {};
  for (const a of ACHIEVEMENTS) {
    achievements[a.id] = { unlocked: false, claimed: false };
  }

  return {
    playerName: 'Blade Runner',
    coins: 100,
    totalCoinsEarned: 100,
    highScores: {
      classic: 0,
      timeAttack: 0,
      arcade: 0,
    },
    unlockedLevel: 1,
    levelStars: {},
    levelBestScores: {},
    selectedBlade: 'steel',
    unlockedBlades: ['steel'],
    selectedBackground: 'dojoWood',
    unlockedBackgrounds: ['dojoWood'],
    achievements,
    soundEnabled: true,
    musicEnabled: true,
    lastDailyLoginDate: null,
    dailyStreak: 0,
    dailyChallenge: createDailyChallenge(today),
    totalFruitsSliced: 0,
    totalCombos: 0,
    bestCombo: 0,
    bombsDodgedRuns: 0,
    powerUpInventory: {
      freezeTime: 2,
      doubleCoins: 2,
      slowMotion: 2,
      extraLife: 1,
      fruitMagnet: 1,
      doubleScore: 1,
    },
    rewardChestProgress: 0,
    adConsentAccepted: null,
    leaderboard: [],
  };
}

export function loadSaveData(): SaveData {
  const defaults = createDefaultSaveData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const today = getTodayKey();

    const mergedPowerUps: Record<PowerUpType, number> = {
      ...defaults.powerUpInventory,
      ...(parsed.powerUpInventory || {}),
    };

    const mergedAchievements = { ...defaults.achievements };
    if (parsed.achievements) {
      for (const [k, v] of Object.entries(parsed.achievements)) {
        if (mergedAchievements[k]) {
          mergedAchievements[k] = v;
        }
      }
    }

    const dailyChallenge =
      parsed.dailyChallenge && parsed.dailyChallenge.date === today
        ? parsed.dailyChallenge
        : createDailyChallenge(today);

    return {
      ...defaults,
      ...parsed,
      highScores: {
        ...defaults.highScores,
        ...(parsed.highScores || {}),
      },
      powerUpInventory: mergedPowerUps,
      achievements: mergedAchievements,
      dailyChallenge,
      unlockedBlades: parsed.unlockedBlades?.length ? parsed.unlockedBlades : ['steel'],
      unlockedBackgrounds: parsed.unlockedBackgrounds?.length ? parsed.unlockedBackgrounds : ['dojoWood'],
      unlockedLevel: Math.max(1, Math.min(100, parsed.unlockedLevel ?? 1)),
      leaderboard: Array.isArray(parsed.leaderboard) ? parsed.leaderboard : [],
    };
  } catch {
    return defaults;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function resetSaveData(): SaveData {
  const fresh = createDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}
