import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Coins,
  Crown,
  Flame,
  Gift,
  Heart,
  Lock,
  Music,
  Play,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { adMobService, ConsentSnapshot } from '../game/admob';
import { audioEngine } from '../game/audio';
import {
  ACHIEVEMENTS,
  BACKGROUNDS,
  BLADES,
  DAILY_STREAK_REWARDS,
  FRUITS,
  LEVELS,
  POWER_UP_LIST,
} from '../game/constants';
import { getTodayKey } from '../game/storage';
import {
  BackgroundId,
  BladeId,
  GameMode,
  PowerUpType,
  SaveData,
} from '../game/types';

interface BackHeaderProps {
  title: string;
  subtitle?: string;
  coins: number;
  onBack: () => void;
}

const ScreenHeader: React.FC<BackHeaderProps> = ({ title, subtitle, coins, onBack }) => (
  <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-amber-500/15 bg-[#1a0e07]/90 shrink-0">
    <div className="flex items-center gap-3 min-w-0">
      <button
        type="button"
        onClick={() => {
          audioEngine.playClick();
          onBack();
        }}
        aria-label="Back to Main Menu"
        className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-amber-100 shrink-0 cursor-pointer transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="min-w-0">
        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-amber-50 truncate">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-amber-200/70 truncate">{subtitle}</p>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 bg-black/45 border border-amber-500/25 rounded-xl px-3.5 py-2 shrink-0">
      <Coins className="w-4 h-4 text-yellow-400" />
      <span className="font-mono-tabular font-bold text-sm text-amber-50">{coins}</span>
    </div>
  </div>
);

/* ==================== GAME MODES SCREEN ==================== */
export const ModesScreen: React.FC<{
  saveData: SaveData;
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
}> = ({ saveData, onSelectMode, onBack }) => {
  const modes: {
    id: GameMode;
    title: string;
    subtitle: string;
    rules: string;
    best: number;
    accent: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: 'classic',
      title: 'Classic Mode',
      subtitle: '3 Lives · Pure Precision',
      rules: 'Slice every fruit cleanly. Missing 3 fruits or hitting 1 bomb ends your run.',
      best: saveData.highScores.classic,
      accent: 'from-rose-600/25 to-orange-600/10 border-rose-500/35',
      icon: <Heart className="w-6 h-6 text-rose-400" />,
    },
    {
      id: 'timeAttack',
      title: 'Time Attack',
      subtitle: '60 Seconds · Rapid Blitz',
      rules: 'Score as many points as possible in 60s. Bombs deduct 10 points instead of ending play.',
      best: saveData.highScores.timeAttack,
      accent: 'from-sky-600/25 to-indigo-600/10 border-sky-500/35',
      icon: <Timer className="w-6 h-6 text-sky-400" />,
    },
    {
      id: 'arcade',
      title: 'Arcade Mode',
      subtitle: '60s · Power-Ups & Combos',
      rules: 'Frequent airborne Freeze, Slow-Mo, 2x Score & Magnet orbs with explosive combos.',
      best: saveData.highScores.arcade,
      accent: 'from-amber-500/25 to-yellow-600/10 border-amber-500/35',
      icon: <Zap className="w-6 h-6 text-amber-400" />,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Game Modes"
        subtitle="Choose an arcade challenge"
        coins={saveData.coins}
        onBack={onBack}
      />
      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl bg-gradient-to-b ${m.accent} border p-5 flex flex-col justify-between gap-5`}
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center">
                  {m.icon}
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xl text-amber-50">{m.title}</h3>
                  <p className="text-xs font-medium text-amber-300/85 mt-0.5">{m.subtitle}</p>
                </div>
                <p className="text-sm text-amber-100/75 leading-relaxed">{m.rules}</p>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between text-xs text-amber-200/80">
                  <span>Best Score</span>
                  <span className="font-mono-tabular font-bold text-base text-amber-50">
                    {m.best}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    onSelectMode(m.id);
                  }}
                  className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1c0f08] font-display font-extrabold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play {m.title.split(' ')[0]}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ==================== 100 LEVELS SCREEN ==================== */
export const LevelsScreen: React.FC<{
  saveData: SaveData;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}> = ({ saveData, onSelectLevel, onBack }) => {
  const [tier, setTier] = useState(0); // 0: 1-25, 1: 26-50, 2: 51-75, 3: 76-100
  const tiers = [
    { label: 'Levels 1–25', start: 1, end: 25 },
    { label: 'Levels 26–50', start: 26, end: 50 },
    { label: 'Levels 51–75', start: 51, end: 75 },
    { label: 'Levels 76–100', start: 76, end: 100 },
  ];

  const currentRange = tiers[tier];
  const visibleLevels = LEVELS.slice(currentRange.start - 1, currentRange.end);
  const totalStars = Object.values(saveData.levelStars).reduce((acc, s) => acc + s, 0);

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="100 Dojo Levels"
        subtitle={`Unlocked ${saveData.unlockedLevel}/100 · ${totalStars}/300 Stars`}
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-[#1a0e07]/50 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-1.5 overflow-x-auto pb-1">
          {tiers.map((t, idx) => (
            <button
              key={t.label}
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setTier(idx);
              }}
              className={`px-3.5 h-10 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tier === idx
                  ? 'bg-amber-500 text-[#1c0f08]'
                  : 'bg-white/5 hover:bg-white/10 text-amber-100/80'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {visibleLevels.map((lvl) => {
            const unlocked = lvl.level <= saveData.unlockedLevel;
            const stars = saveData.levelStars[lvl.level] || 0;
            return (
              <button
                key={lvl.level}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  audioEngine.playClick();
                  onSelectLevel(lvl.level);
                }}
                className={`rounded-2xl border p-3.5 text-left flex flex-col justify-between gap-2.5 min-h-[124px] transition-transform ${
                  unlocked
                    ? 'bg-[#26160d] hover:bg-[#311d11] border-amber-500/30 active:scale-95 cursor-pointer'
                    : 'bg-black/35 border-white/5 opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-extrabold text-lg text-amber-50 font-mono-tabular">
                    {lvl.level}
                  </span>
                  {unlocked ? (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${
                            s <= stars
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-zinc-600'
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <Lock className="w-4 h-4 text-zinc-500" />
                  )}
                </div>

                <div>
                  <div className="text-xs font-bold text-amber-200 truncate">{lvl.title}</div>
                  <div className="text-[11px] text-amber-100/65 line-clamp-2 mt-0.5">
                    {lvl.objectiveText}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== SHOP SCREEN ==================== */
export const ShopScreen: React.FC<{
  saveData: SaveData;
  onBuyBlade: (id: BladeId) => void;
  onEquipBlade: (id: BladeId) => void;
  onBuyBackground: (id: BackgroundId) => void;
  onEquipBackground: (id: BackgroundId) => void;
  onBuyPowerUp: (id: PowerUpType) => void;
  onBack: () => void;
}> = ({
  saveData,
  onBuyBlade,
  onEquipBlade,
  onBuyBackground,
  onEquipBackground,
  onBuyPowerUp,
  onBack,
}) => {
  const [tab, setTab] = useState<'blades' | 'themes' | 'powerups'>('blades');

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Dojo Armory & Shop"
        subtitle="Unlock blades, backgrounds & power-ups"
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/5 bg-[#1a0e07]/50 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {(
            [
              ['blades', 'Blades'],
              ['themes', 'Dojo Themes'],
              ['powerups', 'Power-Ups'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setTab(id);
              }}
              className={`px-4 h-10 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                tab === id
                  ? 'bg-amber-500 text-[#1c0f08]'
                  : 'bg-white/5 hover:bg-white/10 text-amber-100/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tab === 'blades' &&
            BLADES.map((blade) => {
              const owned = saveData.unlockedBlades.includes(blade.id);
              const equipped = saveData.selectedBlade === blade.id;
              const canAfford = saveData.coins >= blade.cost;

              return (
                <div
                  key={blade.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-4 ${
                    equipped
                      ? 'bg-[#2b190f] border-amber-400/60'
                      : 'bg-[#21120a] border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="h-14 rounded-xl bg-black/45 border border-white/5 flex items-center justify-center overflow-hidden px-4">
                      <div
                        className="w-full h-2.5 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${blade.edgeColor}, ${blade.coreColor})`,
                          boxShadow: `0 0 14px ${blade.glowColor}`,
                        }}
                      />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-amber-50">
                        {blade.name}
                      </h3>
                      <p className="text-xs text-amber-100/70 mt-1">{blade.description}</p>
                    </div>
                  </div>

                  {owned ? (
                    <button
                      type="button"
                      disabled={equipped}
                      onClick={() => {
                        audioEngine.playClick();
                        onEquipBlade(blade.id);
                      }}
                      className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                        equipped
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-white/10 hover:bg-white/15 text-amber-50'
                      }`}
                    >
                      {equipped && <Check className="w-4 h-4" />}
                      <span>{equipped ? 'Equipped' : 'Equip Blade'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        audioEngine.playCoin();
                        onBuyBlade(blade.id);
                      }}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-zinc-500 text-[#1c0f08] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Unlock · {blade.cost}</span>
                    </button>
                  )}
                </div>
              );
            })}

          {tab === 'themes' &&
            BACKGROUNDS.map((bg) => {
              const owned = saveData.unlockedBackgrounds.includes(bg.id);
              const equipped = saveData.selectedBackground === bg.id;
              const canAfford = saveData.coins >= bg.cost;

              return (
                <div
                  key={bg.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-4 ${
                    equipped
                      ? 'bg-[#2b190f] border-amber-400/60'
                      : 'bg-[#21120a] border-white/10'
                  }`}
                >
                  <div className="space-y-3">
                    <div
                      className="h-24 rounded-xl border border-white/10 overflow-hidden relative"
                      style={{ background: bg.fallbackGradient }}
                    >
                      {bg.imageUrl && (
                        <img
                          src={bg.imageUrl}
                          alt={bg.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-amber-50">{bg.name}</h3>
                      <p className="text-xs text-amber-100/70 mt-1">{bg.description}</p>
                    </div>
                  </div>

                  {owned ? (
                    <button
                      type="button"
                      disabled={equipped}
                      onClick={() => {
                        audioEngine.playClick();
                        onEquipBackground(bg.id);
                      }}
                      className={`w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer ${
                        equipped
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-white/10 hover:bg-white/15 text-amber-50'
                      }`}
                    >
                      {equipped && <Check className="w-4 h-4" />}
                      <span>{equipped ? 'Equipped' : 'Equip Theme'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        audioEngine.playCoin();
                        onBuyBackground(bg.id);
                      }}
                      className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-zinc-500 text-[#1c0f08] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Coins className="w-4 h-4" />
                      <span>Unlock · {bg.cost}</span>
                    </button>
                  )}
                </div>
              );
            })}

          {tab === 'powerups' &&
            POWER_UP_LIST.map((p) => {
              const ownedQty = saveData.powerUpInventory[p.id] || 0;
              const canAfford = saveData.coins >= p.shopCost;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-white/10 bg-[#21120a] p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-display font-bold text-lg"
                        style={{ color: p.color }}
                      >
                        {p.name}
                      </span>
                      <span className="text-xs font-mono-tabular text-amber-200/80">
                        Owned: {ownedQty}
                      </span>
                    </div>
                    <p className="text-xs text-amber-100/75 leading-relaxed">{p.description}</p>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      audioEngine.playCoin();
                      onBuyPowerUp(p.id);
                    }}
                    className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-zinc-500 text-[#1c0f08] font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy +1 · {p.shopCost}</span>
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

/* ==================== DAILY REWARDS & CHEST SCREEN ==================== */
export const DailyScreen: React.FC<{
  saveData: SaveData;
  onClaimDailyLogin: () => void;
  onClaimDailyChallenge: () => void;
  onOpenRewardChest: () => number;
  onGrantRewardedBonus: (kind: 'coins' | 'extraLife') => void;
  onBack: () => void;
}> = ({
  saveData,
  onClaimDailyLogin,
  onClaimDailyChallenge,
  onOpenRewardChest,
  onGrantRewardedBonus,
  onBack,
}) => {
  const [chestRewardMsg, setChestRewardMsg] = useState<string | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const today = getTodayKey();
  const loginClaimedToday = saveData.lastDailyLoginDate === today;
  const challengeReady =
    saveData.dailyChallenge.progress >= saveData.dailyChallenge.targetCount &&
    !saveData.dailyChallenge.claimed;
  const chestReady = saveData.rewardChestProgress >= 100;
  const targetFruit = FRUITS[saveData.dailyChallenge.targetFruit];

  const handleRewardedVideo = async (kind: 'coins' | 'extraLife') => {
    if (adBusy) return;
    audioEngine.playClick();
    setAdBusy(true);
    setAdMessage(null);
    const res = await adMobService.showRewardedAd();
    setAdBusy(false);
    if (res.rewarded) {
      audioEngine.playCoin();
      onGrantRewardedBonus(kind);
      setAdMessage(
        kind === 'coins'
          ? 'Rewarded Ad completed: +50 Coins added!'
          : 'Rewarded Ad completed: +1 Extra Life added to inventory!'
      );
    } else {
      setAdMessage(res.reason || 'Rewarded video unavailable.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Daily Rewards & Chests"
        subtitle={`Login Streak: ${saveData.dailyStreak} days`}
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 7-Day Login Streak */}
          <div className="rounded-2xl bg-[#21120a] border border-amber-500/20 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display font-bold text-lg text-amber-50">
                  Daily Login Bonus
                </h3>
                <p className="text-xs text-amber-200/70">
                  Return every day to build a 7-day bonus streak.
                </p>
              </div>
              <button
                type="button"
                disabled={loginClaimedToday}
                onClick={() => {
                  audioEngine.playCoin();
                  onClaimDailyLogin();
                }}
                className="h-11 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-zinc-400 text-[#1c0f08] font-display font-bold text-sm cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loginClaimedToday ? 'Claimed Today' : 'Claim Today'}
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {DAILY_STREAK_REWARDS.map((reward, idx) => {
                const dayNum = idx + 1;
                const claimed = idx < (saveData.dailyStreak % 7 || (loginClaimedToday ? 7 : 0));
                return (
                  <div
                    key={dayNum}
                    className={`rounded-xl border p-2.5 text-center space-y-1 ${
                      claimed
                        ? 'bg-emerald-500/15 border-emerald-500/40'
                        : 'bg-black/35 border-white/10'
                    }`}
                  >
                    <div className="text-[11px] text-amber-200/70">Day {dayNum}</div>
                    <div className="font-mono-tabular font-bold text-sm text-yellow-400">
                      +{reward}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Challenge & Reward Chest */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-[#21120a] border border-white/10 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-amber-50">
                    Daily Challenge
                  </h3>
                  <span className="font-mono-tabular text-xs font-bold text-yellow-400">
                    +{saveData.dailyChallenge.rewardCoins} Coins
                  </span>
                </div>
                <p className="text-sm text-amber-100/80">
                  Slice {saveData.dailyChallenge.targetCount} {targetFruit.name}s today across any mode.
                </p>
                <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-amber-500 transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (saveData.dailyChallenge.progress / saveData.dailyChallenge.targetCount) * 100
                      )}%`,
                    }}
                  />
                </div>
                <div className="text-xs font-mono-tabular text-amber-200/70">
                  {Math.min(saveData.dailyChallenge.progress, saveData.dailyChallenge.targetCount)} /{' '}
                  {saveData.dailyChallenge.targetCount} sliced
                </div>
              </div>

              <button
                type="button"
                disabled={!challengeReady}
                onClick={() => {
                  audioEngine.playCoin();
                  onClaimDailyChallenge();
                }}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/10 disabled:text-zinc-400 text-[#1c0f08] font-display font-bold text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {saveData.dailyChallenge.claimed
                  ? 'Challenge Claimed'
                  : challengeReady
                    ? 'Claim Challenge Reward'
                    : 'Keep Slicing to Unlock'}
              </button>
            </div>

            <div className="rounded-2xl bg-[#21120a] border border-white/10 p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg text-amber-50">
                    Dojo Reward Chest
                  </h3>
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-sm text-amber-100/80">
                  Fill the meter by slicing 100 fruits to unlock a bonus coin & power-up chest.
                </p>
                <div className="w-full h-2.5 bg-black/50 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${Math.min(100, saveData.rewardChestProgress)}%` }}
                  />
                </div>
                <div className="text-xs font-mono-tabular text-amber-200/70">
                  {Math.min(100, saveData.rewardChestProgress)} / 100 fruits
                </div>
                {chestRewardMsg && (
                  <p className="text-xs font-semibold text-emerald-300 pt-1">{chestRewardMsg}</p>
                )}
              </div>

              <button
                type="button"
                disabled={!chestReady}
                onClick={() => {
                  audioEngine.playChestOpen();
                  const gained = onOpenRewardChest();
                  setChestRewardMsg(`Opened! Received +${gained} coins & +1 random power-up.`);
                }}
                className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-zinc-400 text-[#052e16] font-display font-bold text-sm cursor-pointer disabled:cursor-not-allowed"
              >
                {chestReady ? 'Open Reward Chest' : 'Slice More Fruits to Fill'}
              </button>
            </div>
          </div>

          {/* AdMob Rewarded Video Bonus Section */}
          <div className="rounded-2xl bg-[#21120a] border border-sky-500/25 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display font-bold text-lg text-amber-50">
                  Bonus Video Rewards
                </h3>
                <p className="text-xs text-amber-200/70">
                  Watch an optional AdMob Rewarded Video for bonus coins or an Extra Life power-up.
                </p>
              </div>
              <PlayCircle className="w-5 h-5 text-sky-400" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={adBusy}
                onClick={() => handleRewardedVideo('coins')}
                className="h-11 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>{adBusy ? 'Loading Ad...' : 'Watch Ad · +50 Coins'}</span>
              </button>
              <button
                type="button"
                disabled={adBusy}
                onClick={() => handleRewardedVideo('extraLife')}
                className="h-11 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Heart className="w-4 h-4 text-rose-400" />
                <span>{adBusy ? 'Loading Ad...' : 'Watch Ad · +1 Extra Life'}</span>
              </button>
            </div>
            {adMessage && (
              <p className="text-xs text-amber-200/80">{adMessage}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== ACHIEVEMENTS SCREEN ==================== */
export const AchievementsScreen: React.FC<{
  saveData: SaveData;
  onClaimAchievement: (id: string) => void;
  onBack: () => void;
}> = ({ saveData, onClaimAchievement, onBack }) => {
  const getStatValue = (key: (typeof ACHIEVEMENTS)[number]['statKey']): number => {
    switch (key) {
      case 'totalFruitsSliced':
        return saveData.totalFruitsSliced;
      case 'totalCombos':
        return saveData.totalCombos;
      case 'bestCombo':
        return saveData.bestCombo;
      case 'unlockedLevel':
        return saveData.unlockedLevel;
      case 'highScoreMax':
        return Math.max(
          saveData.highScores.classic,
          saveData.highScores.timeAttack,
          saveData.highScores.arcade
        );
      case 'totalCoinsEarned':
        return saveData.totalCoinsEarned;
      case 'bladesOwned':
        return saveData.unlockedBlades.length;
      case 'bombsDodgedRuns':
        return saveData.bombsDodgedRuns;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Achievements"
        subtitle="Complete milestones for coin bounties"
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {ACHIEVEMENTS.map((ach) => {
            const val = getStatValue(ach.statKey);
            const state = saveData.achievements[ach.id] || { unlocked: false, claimed: false };
            const ready = val >= ach.target && !state.claimed;
            const pct = Math.min(100, (val / ach.target) * 100);

            return (
              <div
                key={ach.id}
                className="rounded-2xl bg-[#21120a] border border-white/10 p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-amber-50">{ach.title}</h3>
                    <p className="text-xs text-amber-100/70 mt-0.5">{ach.description}</p>
                  </div>
                  <div className="text-xs font-mono-tabular font-bold text-yellow-400 shrink-0">
                    +{ach.rewardCoins}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        state.claimed ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-amber-200/70">
                    <span>
                      {Math.min(val, ach.target)} / {ach.target}
                    </span>
                    {state.claimed ? (
                      <span className="text-emerald-400 font-semibold">Claimed</span>
                    ) : ready ? (
                      <button
                        type="button"
                        onClick={() => {
                          audioEngine.playCoin();
                          onClaimAchievement(ach.id);
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#1c0f08] font-bold cursor-pointer"
                      >
                        Claim +{ach.rewardCoins}
                      </button>
                    ) : (
                      <span>In Progress</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ==================== LEADERBOARD SCREEN ==================== */
export const LeaderboardScreen: React.FC<{
  saveData: SaveData;
  onBack: () => void;
}> = ({ saveData, onBack }) => {
  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Dojo Leaderboard"
        subtitle="Personal bests & recorded runs"
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ['Classic Best', saveData.highScores.classic],
                ['Time Attack Best', saveData.highScores.timeAttack],
                ['Arcade Best', saveData.highScores.arcade],
              ] as const
            ).map(([label, val]) => (
              <div
                key={label}
                className="rounded-2xl bg-[#21120a] border border-amber-500/20 p-4 text-center"
              >
                <div className="text-xs text-amber-200/70">{label}</div>
                <div className="font-display font-extrabold text-2xl text-amber-50 font-mono-tabular mt-1">
                  {val}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-[#21120a] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="font-display font-bold text-sm text-amber-100">
                Top Recorded Runs
              </span>
              <Trophy className="w-4 h-4 text-yellow-400" />
            </div>

            {saveData.leaderboard.length === 0 ? (
              <div className="p-8 text-center text-sm text-amber-200/60">
                Complete a match in any mode to record your score on the leaderboard.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {saveData.leaderboard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 text-center font-mono-tabular font-bold text-amber-400">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-amber-50 truncate">{entry.name}</div>
                        <div className="text-xs text-amber-200/60">
                          {entry.mode === 'level'
                            ? `Level ${entry.level}`
                            : entry.mode === 'timeAttack'
                              ? 'Time Attack'
                              : entry.mode === 'arcade'
                                ? 'Arcade'
                                : 'Classic'}{' '}
                          · {entry.date}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono-tabular font-bold text-base text-amber-100">
                      {entry.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ==================== SETTINGS SCREEN ==================== */
export const SettingsScreen: React.FC<{
  saveData: SaveData;
  consentState: ConsentSnapshot;
  onUpdatePlayerName: (name: string) => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onSetConsent: (accepted: boolean) => void;
  onOpenPrivacyOptions: () => Promise<void>;
  onRefreshConsent: () => Promise<void>;
  onResetProgress: () => void;
  onBack: () => void;
}> = ({
  saveData,
  consentState,
  onUpdatePlayerName,
  onToggleSound,
  onToggleMusic,
  onSetConsent,
  onOpenPrivacyOptions,
  onRefreshConsent,
  onResetProgress,
  onBack,
}) => {
  const [nameInput, setNameInput] = useState(saveData.playerName);
  const [confirmReset, setConfirmReset] = useState(false);
  const [umpBusy, setUmpBusy] = useState(false);

  return (
    <div className="w-full h-full flex flex-col bg-[#140b06]">
      <ScreenHeader
        title="Settings"
        subtitle="Profile, Audio & Privacy"
        coins={saveData.coins}
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto dojo-scroll p-4 sm:p-6">
        <div className="max-w-xl mx-auto space-y-4">
          {/* Player Profile */}
          <div className="rounded-2xl bg-[#21120a] border border-white/10 p-5 space-y-3">
            <label
              htmlFor="player-name-input"
              className="block text-sm font-semibold text-amber-100"
            >
              Player Name
            </label>
            <div className="flex gap-2">
              <input
                id="player-name-input"
                type="text"
                maxLength={20}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 h-11 rounded-xl bg-black/45 border border-white/15 px-3.5 text-sm text-amber-50 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => {
                  audioEngine.playClick();
                  onUpdatePlayerName(nameInput.trim() || 'Blade Runner');
                }}
                className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1c0f08] font-bold text-sm cursor-pointer whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>

          {/* Independent Audio Toggles */}
          <div className="rounded-2xl bg-[#21120a] border border-white/10 p-5 space-y-3">
            <h3 className="font-display font-bold text-base text-amber-50">Audio</h3>

            <button
              type="button"
              onClick={() => {
                onToggleSound();
              }}
              className="w-full h-12 rounded-xl bg-black/35 hover:bg-black/50 border border-white/10 px-4 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-amber-100">
                {saveData.soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-400" />
                )}
                <span>Sound Effects</span>
              </span>
              <span
                className={`text-xs font-bold ${
                  saveData.soundEnabled ? 'text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {saveData.soundEnabled ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onToggleMusic();
              }}
              className="w-full h-12 rounded-xl bg-black/35 hover:bg-black/50 border border-white/10 px-4 flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-amber-100">
                <Music
                  className={`w-5 h-5 ${
                    saveData.musicEnabled ? 'text-amber-400' : 'text-zinc-400'
                  }`}
                />
                <span>Dojo Music</span>
              </span>
              <span
                className={`text-xs font-bold ${
                  saveData.musicEnabled ? 'text-amber-400' : 'text-zinc-400'
                }`}
              >
                {saveData.musicEnabled ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* AdMob UMP GDPR/CCPA Consent & Privacy */}
          <div className="rounded-2xl bg-[#21120a] border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-sky-400" />
                <h3 className="font-display font-bold text-base text-amber-50">
                  Privacy &amp; Ad Consent (UMP)
                </h3>
              </div>
              <span className="text-[11px] font-mono-tabular text-sky-300">
                {consentState.status}
              </span>
            </div>
            <p className="text-xs text-amber-100/70 leading-relaxed">
              Google User Messaging Platform (UMP) manages EEA/UK GDPR and US CCPA consent before any AdMob requests run. Ads never appear during active gameplay.
            </p>
            <div className="text-[11px] font-mono-tabular text-amber-200/75 flex flex-wrap gap-x-3 gap-y-1">
              <span>Can Request Ads: {consentState.canRequestAds ? 'Yes' : 'No'}</span>
              <span>·</span>
              <span>
                Privacy Options: {consentState.privacyOptionsRequired ? 'Required' : 'Optional'}
              </span>
            </div>

            {consentState.isNativeAndroid ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={umpBusy}
                  onClick={async () => {
                    audioEngine.playClick();
                    setUmpBusy(true);
                    await onOpenPrivacyOptions();
                    setUmpBusy(false);
                  }}
                  className="flex-1 h-10 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {umpBusy ? 'Opening UMP...' : 'Manage Privacy Options'}
                </button>
                <button
                  type="button"
                  disabled={umpBusy}
                  onClick={async () => {
                    audioEngine.playClick();
                    setUmpBusy(true);
                    await onRefreshConsent();
                    setUmpBusy(false);
                  }}
                  className="h-10 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-amber-100 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Refresh Status
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    onSetConsent(true);
                  }}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                    saveData.adConsentAccepted === true
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-white/5 border-white/10 text-amber-100/75'
                  }`}
                >
                  Personalized Ads
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioEngine.playClick();
                    onSetConsent(false);
                  }}
                  className={`flex-1 h-10 rounded-xl text-xs font-semibold border cursor-pointer ${
                    saveData.adConsentAccepted === false
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-white/5 border-white/10 text-amber-100/75'
                  }`}
                >
                  Non-Personalized
                </button>
              </div>
            )}
          </div>

          {/* Reset Save */}
          <div className="rounded-2xl bg-[#21120a] border border-rose-500/20 p-5 space-y-3">
            <h3 className="font-display font-bold text-base text-rose-300">Reset Progress</h3>
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="h-11 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-200 text-sm font-semibold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Erase Local Save Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="h-11 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold cursor-pointer"
                >
                  Confirm Erase
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-11 px-4 rounded-xl bg-white/10 text-amber-100 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
