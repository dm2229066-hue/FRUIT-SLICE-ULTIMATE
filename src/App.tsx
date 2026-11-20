import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  Coins,
  Crown,
  Gift,
  Grid,
  Play,
  Settings,
  ShoppingBag,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameCanvas } from './components/GameCanvas';
import { MatchResultModal } from './components/MatchResultModal';
import {
  AchievementsScreen,
  DailyScreen,
  LeaderboardScreen,
  LevelsScreen,
  ModesScreen,
  SettingsScreen,
  ShopScreen,
} from './components/MenuModals';
import { adMobService, ConsentSnapshot } from './game/admob';
import { audioEngine } from './game/audio';
import {
  ACHIEVEMENTS,
  BACKGROUNDS,
  BLADES,
  DAILY_STREAK_REWARDS,
  POWER_UPS,
  POWER_UP_LIST,
} from './game/constants';
import {
  getTodayKey,
  loadSaveData,
  persistSaveData,
  resetSaveData,
} from './game/storage';
import {
  BackgroundId,
  BladeId,
  GameMode,
  MatchSummary,
  PowerUpType,
  SaveData,
  ScreenRoute,
} from './game/types';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const [route, setRoute] = useState<ScreenRoute>('menu');
  const [activeMode, setActiveMode] = useState<GameMode>('classic');
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [matchKey, setMatchKey] = useState<number>(1);
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [postLevelAdStatus, setPostLevelAdStatus] = useState<{
    busy: boolean;
    rewarded: boolean;
    message: string | null;
  }>({ busy: false, rewarded: false, message: null });

  const [consentState, setConsentState] = useState<ConsentSnapshot>(() =>
    adMobService.getConsentSnapshot()
  );
  const [bannerHeight, setBannerHeight] = useState<number>(0);

  useEffect(() => {
    return adMobService.subscribeBannerSize(setBannerHeight);
  }, []);

  // Persist save state automatically on every update
  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      return next;
    });
  }, []);

  // Sync audio settings
  useEffect(() => {
    audioEngine.setSettings(saveData.soundEnabled, saveData.musicEnabled);
  }, [saveData.soundEnabled, saveData.musicEnabled]);

  // Run formal UMP GDPR/CCPA consent check on startup before initializing AdMob or requesting ads
  useEffect(() => {
    let active = true;
    void adMobService.initializeWithConsent().then((snapshot) => {
      if (!active) return;
      setConsentState(snapshot);
      if (snapshot.isNativeAndroid) {
        updateSave((prev) =>
          prev.adConsentAccepted === snapshot.canRequestAds
            ? prev
            : { ...prev, adConsentAccepted: snapshot.canRequestAds }
        );
        if (snapshot.canRequestAds) {
          void adMobService.prepareRewardedAd();
          void adMobService.prepareInterstitial();
        }
      }
    });
    return () => {
      active = false;
    };
  }, [updateSave]);

  // Only show/request menu banner once UMP consent check completes and permits ads
  useEffect(() => {
    if (!consentState.checked || !consentState.canRequestAds) {
      void adMobService.hideBanner();
      return;
    }
    if (route === 'playing') {
      void adMobService.hideBanner();
    } else {
      void adMobService.showMenuBanner();
    }
  }, [route, consentState.checked, consentState.canRequestAds]);

  const startMatch = (mode: GameMode, levelNum = 1) => {
    audioEngine.unlock();
    setActiveMode(mode);
    setActiveLevel(levelNum);
    setMatchSummary(null);
    setPostLevelAdStatus({ busy: false, rewarded: false, message: null });
    setMatchKey((k) => k + 1);
    setRoute('playing');
    if (adMobService.canRequestAds()) {
      if (mode === 'level') {
        void adMobService.prepareRewardedAd();
      } else {
        void adMobService.prepareInterstitial();
      }
    }
  };

  const handleMatchFinish = (summary: MatchSummary) => {
    setMatchSummary(summary);

    updateSave((prev) => {
      const nextCoins = prev.coins + summary.coinsEarned;
      const nextTotalCoins = prev.totalCoinsEarned + summary.coinsEarned;
      const nextTotalSliced = prev.totalFruitsSliced + summary.fruitsSliced;
      const nextTotalCombos = prev.totalCombos + summary.comboCount;
      const nextBestCombo = Math.max(prev.bestCombo, summary.maxCombo);
      const nextBombsDodged = prev.bombsDodgedRuns + (summary.endedByBomb ? 0 : 1);

      const nextHighScores = { ...prev.highScores };
      if (summary.mode !== 'level' && summary.score > nextHighScores[summary.mode]) {
        nextHighScores[summary.mode] = summary.score;
      }

      const nextStars = { ...prev.levelStars };
      const nextLevelBests = { ...prev.levelBestScores };
      let nextUnlockedLevel = prev.unlockedLevel;

      if (summary.mode === 'level' && summary.levelNumber) {
        if (summary.score > (nextLevelBests[summary.levelNumber] || 0)) {
          nextLevelBests[summary.levelNumber] = summary.score;
        }
        if (summary.levelPassed) {
          nextStars[summary.levelNumber] = Math.max(
            nextStars[summary.levelNumber] || 0,
            summary.starsEarned
          );
          if (summary.levelNumber === prev.unlockedLevel && prev.unlockedLevel < 100) {
            nextUnlockedLevel = prev.unlockedLevel + 1;
          }
        }
      }

      // Daily challenge progress
      const targetFruit = prev.dailyChallenge.targetFruit;
      const targetSliced = summary.slicedByType[targetFruit] || 0;
      const nextDailyChallenge = {
        ...prev.dailyChallenge,
        progress: prev.dailyChallenge.progress + targetSliced,
      };

      // Leaderboard update
      const newEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: prev.playerName,
        score: summary.score,
        mode: summary.mode,
        level: summary.levelNumber,
        date: getTodayKey(),
      };
      const nextLeaderboard = [...prev.leaderboard, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      return {
        ...prev,
        coins: nextCoins,
        totalCoinsEarned: nextTotalCoins,
        highScores: nextHighScores,
        unlockedLevel: nextUnlockedLevel,
        levelStars: nextStars,
        levelBestScores: nextLevelBests,
        totalFruitsSliced: nextTotalSliced,
        totalCombos: nextTotalCombos,
        bestCombo: nextBestCombo,
        bombsDodgedRuns: nextBombsDodged,
        dailyChallenge: nextDailyChallenge,
        rewardChestProgress: Math.min(100, prev.rewardChestProgress + summary.fruitsSliced),
        leaderboard: nextLeaderboard,
      };
    });

    // After every level, trigger Google AdMob Rewarded Ad (ca-app-pub-3940256099942544/5224354917)
    // For non-level arcade modes, show post-match interstitial (never during active gameplay)
    if (summary.mode === 'level') {
      setPostLevelAdStatus({ busy: true, rewarded: false, message: null });
      void adMobService.showRewardedAd().then((res) => {
        if (res.rewarded) {
          audioEngine.playCoin();
          updateSave((p) => ({
            ...p,
            coins: p.coins + 50,
            totalCoinsEarned: p.totalCoinsEarned + 50,
          }));
          setPostLevelAdStatus({
            busy: false,
            rewarded: true,
            message: '+50 Bonus Coins awarded from post-level Rewarded Ad!',
          });
        } else {
          setPostLevelAdStatus({
            busy: false,
            rewarded: false,
            message: res.reason || null,
          });
        }
      });
    } else {
      void adMobService.showPostMatchInterstitial();
    }
  };

  const handleConsumePowerUp = (type: PowerUpType) => {
    updateSave((prev) => ({
      ...prev,
      powerUpInventory: {
        ...prev.powerUpInventory,
        [type]: Math.max(0, (prev.powerUpInventory[type] || 0) - 1),
      },
    }));
  };

  const handleBuyBlade = (id: BladeId) => {
    const blade = BLADES.find((b) => b.id === id);
    if (!blade) return;
    updateSave((prev) => {
      if (prev.unlockedBlades.includes(id) || prev.coins < blade.cost) return prev;
      return {
        ...prev,
        coins: prev.coins - blade.cost,
        unlockedBlades: [...prev.unlockedBlades, id],
        selectedBlade: id,
      };
    });
  };

  const handleBuyBackground = (id: BackgroundId) => {
    const bg = BACKGROUNDS.find((b) => b.id === id);
    if (!bg) return;
    updateSave((prev) => {
      if (prev.unlockedBackgrounds.includes(id) || prev.coins < bg.cost) return prev;
      return {
        ...prev,
        coins: prev.coins - bg.cost,
        unlockedBackgrounds: [...prev.unlockedBackgrounds, id],
        selectedBackground: id,
      };
    });
  };

  const handleBuyPowerUp = (id: PowerUpType) => {
    const spec = POWER_UPS[id];
    updateSave((prev) => {
      if (prev.coins < spec.shopCost) return prev;
      return {
        ...prev,
        coins: prev.coins - spec.shopCost,
        powerUpInventory: {
          ...prev.powerUpInventory,
          [id]: (prev.powerUpInventory[id] || 0) + 1,
        },
      };
    });
  };

  const handleClaimDailyLogin = () => {
    const today = getTodayKey();
    updateSave((prev) => {
      if (prev.lastDailyLoginDate === today) return prev;
      const nextStreak = prev.dailyStreak + 1;
      const reward = DAILY_STREAK_REWARDS[(nextStreak - 1) % DAILY_STREAK_REWARDS.length];
      return {
        ...prev,
        lastDailyLoginDate: today,
        dailyStreak: nextStreak,
        coins: prev.coins + reward,
        totalCoinsEarned: prev.totalCoinsEarned + reward,
      };
    });
  };

  const handleClaimDailyChallenge = () => {
    updateSave((prev) => {
      if (
        prev.dailyChallenge.claimed ||
        prev.dailyChallenge.progress < prev.dailyChallenge.targetCount
      ) {
        return prev;
      }
      const reward = prev.dailyChallenge.rewardCoins;
      return {
        ...prev,
        coins: prev.coins + reward,
        totalCoinsEarned: prev.totalCoinsEarned + reward,
        dailyChallenge: { ...prev.dailyChallenge, claimed: true },
      };
    });
  };

  const handleOpenRewardChest = (): number => {
    const coinReward = 65 + Math.floor(Math.random() * 55);
    const randomPower = POWER_UP_LIST[Math.floor(Math.random() * POWER_UP_LIST.length)].id;
    updateSave((prev) => {
      if (prev.rewardChestProgress < 100) return prev;
      return {
        ...prev,
        coins: prev.coins + coinReward,
        totalCoinsEarned: prev.totalCoinsEarned + coinReward,
        rewardChestProgress: 0,
        powerUpInventory: {
          ...prev.powerUpInventory,
          [randomPower]: (prev.powerUpInventory[randomPower] || 0) + 1,
        },
      };
    });
    return coinReward;
  };

  const handleClaimAchievement = (id: string) => {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return;
    updateSave((prev) => {
      if (prev.achievements[id]?.claimed) return prev;
      return {
        ...prev,
        coins: prev.coins + def.rewardCoins,
        totalCoinsEarned: prev.totalCoinsEarned + def.rewardCoins,
        achievements: {
          ...prev.achievements,
          [id]: { unlocked: true, claimed: true },
        },
      };
    });
  };

  // Count ready notifications
  const today = getTodayKey();
  const hasDailyReady =
    saveData.lastDailyLoginDate !== today ||
    saveData.rewardChestProgress >= 100 ||
    (saveData.dailyChallenge.progress >= saveData.dailyChallenge.targetCount &&
      !saveData.dailyChallenge.claimed);

  const selectedBg =
    BACKGROUNDS.find((b) => b.id === saveData.selectedBackground) ?? BACKGROUNDS[0];

  if (route === 'playing') {
    return (
      <div className="relative w-full h-full overflow-hidden">
        <GameCanvas
          key={matchKey}
          mode={activeMode}
          levelNumber={activeLevel}
          saveData={saveData}
          onConsumePowerUp={handleConsumePowerUp}
          onToggleSound={() =>
            updateSave((p) => ({ ...p, soundEnabled: !p.soundEnabled }))
          }
          onToggleMusic={() =>
            updateSave((p) => ({ ...p, musicEnabled: !p.musicEnabled }))
          }
          onMatchFinish={handleMatchFinish}
          onExitToMenu={() => {
            setMatchSummary(null);
            setRoute('menu');
          }}
        />
        {matchSummary && (
          <MatchResultModal
            summary={matchSummary}
            autoAdStatus={matchSummary.mode === 'level' ? postLevelAdStatus : undefined}
            onReplay={() => startMatch(activeMode, activeLevel)}
            onNextLevel={
              activeMode === 'level' && activeLevel < 100
                ? () => startMatch('level', activeLevel + 1)
                : undefined
            }
            onRewardedCoinsEarned={(amt) =>
              updateSave((p) => ({
                ...p,
                coins: p.coins + amt,
                totalCoinsEarned: p.totalCoinsEarned + amt,
              }))
            }
            onBackToMenu={() => {
              setMatchSummary(null);
              setRoute('menu');
            }}
          />
        )}
      </div>
    );
  }

  const wrapMenuScreen = (content: React.ReactNode) => (
    <div
      className="w-full h-full flex flex-col bg-[#140b06] overflow-hidden"
      style={{ paddingBottom: bannerHeight > 0 ? `${bannerHeight}px` : undefined }}
    >
      <div className="flex-1 min-h-0 w-full h-full">{content}</div>
    </div>
  );

  if (route === 'modes') {
    return wrapMenuScreen(
      <ModesScreen
        saveData={saveData}
        onSelectMode={(m) => startMatch(m)}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'levels') {
    return wrapMenuScreen(
      <LevelsScreen
        saveData={saveData}
        onSelectLevel={(lvl) => startMatch('level', lvl)}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'shop') {
    return wrapMenuScreen(
      <ShopScreen
        saveData={saveData}
        onBuyBlade={handleBuyBlade}
        onEquipBlade={(id) => updateSave((p) => ({ ...p, selectedBlade: id }))}
        onBuyBackground={handleBuyBackground}
        onEquipBackground={(id) => updateSave((p) => ({ ...p, selectedBackground: id }))}
        onBuyPowerUp={handleBuyPowerUp}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'daily') {
    return wrapMenuScreen(
      <DailyScreen
        saveData={saveData}
        onClaimDailyLogin={handleClaimDailyLogin}
        onClaimDailyChallenge={handleClaimDailyChallenge}
        onOpenRewardChest={handleOpenRewardChest}
        onGrantRewardedBonus={(kind) =>
          updateSave((p) =>
            kind === 'coins'
              ? {
                  ...p,
                  coins: p.coins + 50,
                  totalCoinsEarned: p.totalCoinsEarned + 50,
                }
              : {
                  ...p,
                  powerUpInventory: {
                    ...p.powerUpInventory,
                    extraLife: (p.powerUpInventory.extraLife || 0) + 1,
                  },
                }
          )
        }
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'achievements') {
    return wrapMenuScreen(
      <AchievementsScreen
        saveData={saveData}
        onClaimAchievement={handleClaimAchievement}
        onBack={() => setRoute('menu')}
      />
    );
  }

  if (route === 'leaderboard') {
    return wrapMenuScreen(
      <LeaderboardScreen saveData={saveData} onBack={() => setRoute('menu')} />
    );
  }

  if (route === 'settings') {
    return wrapMenuScreen(
      <SettingsScreen
        saveData={saveData}
        consentState={consentState}
        onUpdatePlayerName={(name) => updateSave((p) => ({ ...p, playerName: name }))}
        onToggleSound={() => updateSave((p) => ({ ...p, soundEnabled: !p.soundEnabled }))}
        onToggleMusic={() => updateSave((p) => ({ ...p, musicEnabled: !p.musicEnabled }))}
        onSetConsent={(accepted) => updateSave((p) => ({ ...p, adConsentAccepted: accepted }))}
        onOpenPrivacyOptions={async () => {
          const next = await adMobService.showPrivacyOptionsForm();
          setConsentState(next);
          if (next.isNativeAndroid) {
            updateSave((p) => ({ ...p, adConsentAccepted: next.canRequestAds }));
          }
        }}
        onRefreshConsent={async () => {
          const next = await adMobService.gatherConsent();
          setConsentState(next);
          if (next.isNativeAndroid) {
            updateSave((p) => ({ ...p, adConsentAccepted: next.canRequestAds }));
          }
        }}
        onResetProgress={() => setSaveData(resetSaveData())}
        onBack={() => setRoute('menu')}
      />
    );
  }

  /* ==================== MAIN MENU / GAME SHELL TITLE SCREEN ==================== */
  return (
    <div
      className="relative w-full h-full flex flex-col justify-between overflow-hidden"
      style={{
        background: selectedBg.fallbackGradient,
        paddingBottom: bannerHeight > 0 ? `${bannerHeight}px` : undefined,
      }}
      onPointerDown={() => audioEngine.unlock()}
    >
      {/* Dojo Atmospheric Backdrop */}
      {selectedBg.imageUrl && (
        <img
          src={selectedBg.imageUrl}
          alt={selectedBg.name}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85 pointer-events-none"
        />
      )}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(12,6,3,0.72) 0%, rgba(12,6,3,0.42) 45%, rgba(10,5,2,0.88) 100%)',
        }}
      />

      {/* Top Perimeter Status Strip */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 pt-4">
        <div className="flex items-center gap-2.5 bg-black/50 border border-amber-500/25 rounded-xl px-3.5 py-2">
          <Coins className="w-4 h-4 text-yellow-400" />
          <span className="font-mono-tabular font-bold text-sm text-amber-50">
            {saveData.coins}
          </span>
          <span className="text-xs text-amber-200/60 hidden sm:inline">
            · Level {saveData.unlockedLevel}/100
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              updateSave((p) => ({ ...p, soundEnabled: !p.soundEnabled }));
            }}
            aria-label="Toggle Sound"
            className="w-11 h-11 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-amber-100 cursor-pointer"
          >
            {saveData.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-zinc-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setRoute('settings');
            }}
            aria-label="Settings"
            className="w-11 h-11 rounded-xl bg-black/50 hover:bg-black/70 border border-white/15 flex items-center justify-center text-amber-100 cursor-pointer"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Center Hero Title Lockup + Primary Play CTA */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center max-w-2xl mx-auto w-full">
        {/* Bespoke Inline SVG Katana & Fruit Logo Lockup */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-2xl mb-4">
            <img
              src="/src/assets/images/app_icon_fruit_slice_1795183812179.jpg"
              alt="Fruit Slice Ultimate Emblem"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          <svg
            viewBox="0 0 460 112"
            className="w-full max-w-[380px] sm:max-w-[440px] drop-shadow-[0_8px_22px_rgba(0,0,0,0.85)]"
            aria-label="Fruit Slice Ultimate"
          >
            <defs>
              <linearGradient id="logoGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="katanaSlash" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="50%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#38bdf8" />
              </linearGradient>
            </defs>
            <text
              x="230"
              y="56"
              textAnchor="middle"
              fill="url(#logoGold)"
              fontFamily="Outfit, sans-serif"
              fontWeight="900"
              fontSize="48"
              letterSpacing="2"
            >
              FRUIT SLICE
            </text>
            {/* Dynamic Katana Slash Accent */}
            <path
              d="M36 66 L424 54 L408 61 L52 70 Z"
              fill="url(#katanaSlash)"
              opacity="0.92"
            />
            <text
              x="230"
              y="98"
              textAnchor="middle"
              fill="#fffbeb"
              fontFamily="Outfit, sans-serif"
              fontWeight="800"
              fontSize="21"
              letterSpacing="8"
            >
              ULTIMATE
            </text>
          </svg>
        </div>

        {/* Dominant Primary Play CTA + Level Shortcut */}
        <div className="w-full max-w-sm space-y-3">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              startMatch('level', saveData.unlockedLevel);
            }}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:brightness-110 text-[#1a0b04] font-display font-black text-lg tracking-wide shadow-xl flex items-center justify-center gap-2.5 transition-transform active:scale-98 cursor-pointer"
          >
            <Play className="w-6 h-6 fill-current" />
            <span>PLAY LEVEL {saveData.unlockedLevel}</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setRoute('modes');
              }}
              className="h-12 rounded-xl bg-black/55 hover:bg-black/75 border border-amber-500/30 text-amber-50 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Swords className="w-4 h-4 text-rose-400" />
              <span>Game Modes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                setRoute('levels');
              }}
              className="h-12 rounded-xl bg-black/55 hover:bg-black/75 border border-amber-500/30 text-amber-50 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Grid className="w-4 h-4 text-amber-400" />
              <span>100 Levels</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-amber-200/70 mt-4">
          Swipe across fruits to slice · Chain 3+ for combos · Avoid bombs
        </p>
      </main>

      {/* Bottom Dojo Navigation Bar */}
      <footer className="relative z-10 px-4 sm:px-6 pb-4">
        <div className="max-w-2xl mx-auto grid grid-cols-4 gap-2 bg-black/60 border border-white/15 rounded-2xl p-2">
          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setRoute('daily');
            }}
            className="relative h-12 rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-amber-100 cursor-pointer transition-colors"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-semibold whitespace-nowrap">Daily</span>
            {hasDailyReady && (
              <span className="text-[9px] font-bold text-emerald-300 leading-none">Ready</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setRoute('shop');
            }}
            className="h-12 rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-amber-100 cursor-pointer transition-colors"
          >
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            <span className="text-[11px] font-semibold whitespace-nowrap">Shop</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setRoute('achievements');
            }}
            className="h-12 rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-amber-100 cursor-pointer transition-colors"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-semibold whitespace-nowrap">Awards</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioEngine.playClick();
              setRoute('leaderboard');
            }}
            className="h-12 rounded-xl hover:bg-white/10 flex flex-col items-center justify-center gap-1 text-amber-100 cursor-pointer transition-colors"
          >
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-[11px] font-semibold whitespace-nowrap">Ranks</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
