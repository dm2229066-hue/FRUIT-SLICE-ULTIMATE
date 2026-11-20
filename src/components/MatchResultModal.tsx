import React, { useState } from 'react';
import {
  ArrowRight,
  Coins,
  Home,
  PlayCircle,
  RotateCcw,
  Star,
  Trophy,
} from 'lucide-react';
import { adMobService } from '../game/admob';
import { audioEngine } from '../game/audio';
import { MatchSummary } from '../game/types';

interface MatchResultModalProps {
  summary: MatchSummary;
  autoAdStatus?: {
    busy: boolean;
    rewarded: boolean;
    message: string | null;
  };
  onReplay: () => void;
  onNextLevel?: () => void;
  onRewardedCoinsEarned: (amount: number) => void;
  onBackToMenu: () => void;
}

export const MatchResultModal: React.FC<MatchResultModalProps> = ({
  summary,
  autoAdStatus,
  onReplay,
  onNextLevel,
  onRewardedCoinsEarned,
  onBackToMenu,
}) => {
  const [adStatusMsg, setAdStatusMsg] = useState<string | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const effectiveBusy = adBusy || Boolean(autoAdStatus?.busy);
  const effectiveClaimed = rewardClaimed || Boolean(autoAdStatus?.rewarded);
  const effectiveMsg = adStatusMsg ?? autoAdStatus?.message ?? null;

  const isLevel = summary.mode === 'level';
  const titleText = isLevel
    ? summary.levelPassed
      ? `Level ${summary.levelNumber} Complete`
      : `Level ${summary.levelNumber} Failed`
    : summary.endedByBomb
      ? 'Bomb Detonated'
      : 'Round Complete';

  const handleWatchRewardedAd = async () => {
    if (effectiveBusy || effectiveClaimed) return;
    audioEngine.playClick();
    setAdBusy(true);
    setAdStatusMsg(null);
    const res = await adMobService.showRewardedAd();
    setAdBusy(false);

    if (res.rewarded) {
      setRewardClaimed(true);
      audioEngine.playCoin();
      onRewardedCoinsEarned(50);
      setAdStatusMsg('+50 Bonus Coins awarded via AdMob!');
    } else {
      setAdStatusMsg(res.reason || 'Rewarded video unavailable.');
    }
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#22130b] border border-amber-500/35 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Result Header */}
        <div className="text-center space-y-2">
          {isLevel && (
            <div className="flex items-center justify-center gap-2 mb-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-8 h-8 transition-transform ${
                    s <= summary.starsEarned
                      ? 'text-yellow-400 fill-yellow-400 scale-110'
                      : 'text-zinc-700'
                  }`}
                />
              ))}
            </div>
          )}
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-amber-50">
            {titleText}
          </h2>
          {summary.isNewBest && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-yellow-400">
              <Trophy className="w-4 h-4" />
              <span>New Personal Best</span>
            </div>
          )}
        </div>

        {/* Stat Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <div className="text-[11px] text-amber-200/70">Final Score</div>
            <div className="font-display font-extrabold text-2xl text-amber-50 font-mono-tabular">
              {summary.score}
            </div>
          </div>
          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <div className="text-[11px] text-amber-200/70">Coins Earned</div>
            <div className="font-display font-extrabold text-2xl text-yellow-400 font-mono-tabular flex items-center gap-1.5">
              <Coins className="w-5 h-5" />+{summary.coinsEarned}
            </div>
          </div>
          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <div className="text-[11px] text-amber-200/70">Fruits Sliced</div>
            <div className="font-mono-tabular font-bold text-lg text-amber-50">
              {summary.fruitsSliced}
            </div>
          </div>
          <div className="rounded-xl bg-black/40 border border-white/10 p-3">
            <div className="text-[11px] text-amber-200/70">Best Combo</div>
            <div className="font-mono-tabular font-bold text-lg text-amber-50">
              {summary.maxCombo > 0 ? `${summary.maxCombo}x` : '—'}
            </div>
          </div>
        </div>

        {/* AdMob Rewarded Video Status & Optional Re-Watch (Strictly real SDK callback, no fake web rewards) */}
        <div className="space-y-1.5">
          <button
            type="button"
            disabled={effectiveBusy || effectiveClaimed}
            onClick={handleWatchRewardedAd}
            className="w-full h-11 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4 text-sky-400" />
            <span>
              {effectiveClaimed
                ? 'AdMob Bonus Claimed (+50 Coins)'
                : effectiveBusy
                  ? 'Showing AdMob Rewarded Ad...'
                  : 'Watch AdMob Video for +50 Bonus Coins (Android APK)'}
            </span>
          </button>
          {effectiveMsg && (
            <p className="text-[11px] text-center text-amber-200/75">{effectiveMsg}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {isLevel && summary.levelPassed && summary.levelNumber && summary.levelNumber < 100 && onNextLevel && (
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onNextLevel();
              }}
              className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#052e16] font-display font-extrabold text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Next Level ({summary.levelNumber + 1})</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onReplay();
              }}
              className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#1c0f08] font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioEngine.playClick();
                onBackToMenu();
              }}
              className="h-11 rounded-xl bg-white/10 hover:bg-white/15 text-amber-100 font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>Main Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
