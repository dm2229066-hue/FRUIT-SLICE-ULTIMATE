import { Capacitor } from '@capacitor/core';
import {
  AdMob,
  AdMobBannerSize,
  AdmobConsentDebugGeography,
  AdmobConsentInfo,
  AdmobConsentStatus,
  BannerAdOptions,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  InterstitialAdPluginEvents,
  RewardAdPluginEvents,
} from '@capacitor-community/admob';

// Google AdMob configuration:
// Production App ID & Interstitial Ad Unit ID integrated; Banner/Rewarded remain sample test IDs until replaced.
export const ADMOB_CONFIG = {
  androidAppId: 'ca-app-pub-7496793317592044~5848952305',
  bannerId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialId: 'ca-app-pub-7496793317592044/5110585708',
  rewardedId: 'ca-app-pub-3940256099942544/5224354917',
};

const isSampleTestAdUnit = (adUnitId: string): boolean =>
  adUnitId.startsWith('ca-app-pub-3940256099942544/');

export interface ConsentSnapshot {
  checked: boolean;
  canRequestAds: boolean;
  status: AdmobConsentStatus;
  isConsentFormAvailable: boolean;
  privacyOptionsRequired: boolean;
  isNativeAndroid: boolean;
}

class AdMobService {
  private sdkInitialized = false;
  private bannerVisible = false;
  private bannerCreated = false;
  private bannerListenersBound = false;
  private bannerHeight = 0;
  private bannerSizeListeners = new Set<(height: number) => void>();
  private lastInterstitialAt = 0;
  private interstitialPrepared = false;
  private rewardedPrepared = false;
  private consentInFlight: Promise<ConsentSnapshot> | null = null;

  private consentSnapshot: ConsentSnapshot = {
    checked: false,
    canRequestAds: false,
    status: AdmobConsentStatus.UNKNOWN,
    isConsentFormAvailable: false,
    privacyOptionsRequired: false,
    isNativeAndroid: false,
  };

  public isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  public getConsentSnapshot(): ConsentSnapshot {
    return {
      ...this.consentSnapshot,
      isNativeAndroid: this.isNativeAndroid(),
    };
  }

  public canRequestAds(): boolean {
    return (
      this.isNativeAndroid() &&
      this.consentSnapshot.checked &&
      this.consentSnapshot.canRequestAds &&
      this.sdkInitialized
    );
  }

  private applyConsentInfo(info: AdmobConsentInfo): ConsentSnapshot {
    this.consentSnapshot = {
      checked: true,
      canRequestAds: Boolean(info.canRequestAds),
      status: info.status,
      isConsentFormAvailable: Boolean(info.isConsentFormAvailable),
      privacyOptionsRequired:
        String(info.privacyOptionsRequirementStatus) === 'REQUIRED',
      isNativeAndroid: this.isNativeAndroid(),
    };
    return this.getConsentSnapshot();
  }

  private async ensureSdkInitialized(): Promise<boolean> {
    if (!this.isNativeAndroid() || !this.consentSnapshot.canRequestAds) {
      return false;
    }
    if (this.sdkInitialized) return true;

    try {
      await AdMob.initialize({
        initializeForTesting: false,
      });
      this.sdkInitialized = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Formal Google User Messaging Platform (UMP) GDPR/CCPA consent flow.
   * Requests consent info, presents the UMP consent form when required,
   * and only initializes the Google Mobile Ads SDK if `canRequestAds` is true.
   */
  public async gatherConsent(options?: {
    tagForUnderAgeOfConsent?: boolean;
    debugGeography?: AdmobConsentDebugGeography;
    testDeviceIdentifiers?: string[];
  }): Promise<ConsentSnapshot> {
    if (!this.isNativeAndroid()) {
      this.consentSnapshot = {
        checked: true,
        canRequestAds: false,
        status: AdmobConsentStatus.NOT_REQUIRED,
        isConsentFormAvailable: false,
        privacyOptionsRequired: false,
        isNativeAndroid: false,
      };
      return this.getConsentSnapshot();
    }

    if (this.consentInFlight) {
      return this.consentInFlight;
    }

    this.consentInFlight = (async () => {
      try {
        let info = await AdMob.requestConsentInfo({
          tagForUnderAgeOfConsent: Boolean(options?.tagForUnderAgeOfConsent),
          ...(options?.debugGeography !== undefined
            ? { debugGeography: options.debugGeography }
            : {}),
          ...(options?.testDeviceIdentifiers?.length
            ? { testDeviceIdentifiers: options.testDeviceIdentifiers }
            : {}),
        });

        if (
          info.isConsentFormAvailable &&
          info.status === AdmobConsentStatus.REQUIRED
        ) {
          info = await AdMob.showConsentForm();
        }

        const snapshot = this.applyConsentInfo(info);
        if (snapshot.canRequestAds) {
          await this.ensureSdkInitialized();
        }
        return snapshot;
      } catch {
        // On transient UMP network error, fall back to any cached UMP canRequestAds state
        this.consentSnapshot = {
          ...this.consentSnapshot,
          checked: true,
          isNativeAndroid: true,
        };
        return this.getConsentSnapshot();
      } finally {
        this.consentInFlight = null;
      }
    })();

    return this.consentInFlight;
  }

  public async initializeWithConsent(options?: {
    tagForUnderAgeOfConsent?: boolean;
  }): Promise<ConsentSnapshot> {
    return this.gatherConsent(options);
  }

  /**
   * Opens Google's UMP Privacy Options form so EEA/UK/California users can
   * update or withdraw ad consent at any time from Settings.
   */
  public async showPrivacyOptionsForm(): Promise<ConsentSnapshot> {
    if (!this.isNativeAndroid()) {
      return this.getConsentSnapshot();
    }
    try {
      await AdMob.showPrivacyOptionsForm();
      const refreshed = await AdMob.requestConsentInfo();
      const snapshot = this.applyConsentInfo(refreshed);
      if (snapshot.canRequestAds) {
        await this.ensureSdkInitialized();
      } else if (this.bannerVisible) {
        await this.hideBanner();
      }
      return snapshot;
    } catch {
      return this.gatherConsent();
    }
  }

  public async resetConsentInfo(): Promise<ConsentSnapshot> {
    if (!this.isNativeAndroid()) {
      return this.getConsentSnapshot();
    }
    try {
      await AdMob.resetConsentInfo();
      this.sdkInitialized = false;
      this.rewardedPrepared = false;
      if (this.bannerVisible) {
        await this.hideBanner();
      }
    } catch {
      // Ignore reset errors
    }
    return this.gatherConsent();
  }

  private setBannerHeight(height: number) {
    const next = Math.max(0, Math.round(height));
    if (this.bannerHeight === next) return;
    this.bannerHeight = next;
    this.bannerSizeListeners.forEach((cb) => cb(next));
  }

  public subscribeBannerSize(listener: (height: number) => void): () => void {
    this.bannerSizeListeners.add(listener);
    listener(this.bannerHeight);
    return () => {
      this.bannerSizeListeners.delete(listener);
    };
  }

  private bindBannerListeners() {
    if (this.bannerListenersBound || !this.isNativeAndroid()) return;
    this.bannerListenersBound = true;

    void AdMob.addListener(
      BannerAdPluginEvents.SizeChanged,
      (size: AdMobBannerSize) => {
        this.setBannerHeight(this.bannerVisible ? size.height : 0);
      }
    );

    void AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => {
      this.bannerVisible = false;
      this.setBannerHeight(0);
    });
  }

  public async showMenuBanner(): Promise<void> {
    if (!this.canRequestAds() || this.bannerVisible) return;
    this.bindBannerListeners();
    try {
      if (this.bannerCreated) {
        await AdMob.resumeBanner();
        this.bannerVisible = true;
        return;
      }
      const options: BannerAdOptions = {
        adId: ADMOB_CONFIG.bannerId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: isSampleTestAdUnit(ADMOB_CONFIG.bannerId),
      };
      await AdMob.showBanner(options);
      this.bannerCreated = true;
      this.bannerVisible = true;
    } catch {
      this.bannerVisible = false;
      this.setBannerHeight(0);
    }
  }

  public async hideBanner(): Promise<void> {
    if (!this.isNativeAndroid() || !this.bannerVisible) return;
    try {
      await AdMob.hideBanner();
    } catch {
      // Ignore
    } finally {
      this.bannerVisible = false;
      this.setBannerHeight(0);
    }
  }

  // Preload production Interstitial Ad (ca-app-pub-7496793317592044/5110585708)
  public async prepareInterstitial(): Promise<void> {
    if (!this.canRequestAds() || this.interstitialPrepared) return;
    try {
      await AdMob.prepareInterstitial({
        adId: ADMOB_CONFIG.interstitialId,
        isTesting: isSampleTestAdUnit(ADMOB_CONFIG.interstitialId),
      });
      this.interstitialPrepared = true;
    } catch {
      this.interstitialPrepared = false;
    }
  }

  // Show production Interstitial Ad (ca-app-pub-7496793317592044/5110585708)
  public async showInterstitial(ignoreCooldown = false): Promise<void> {
    if (!this.canRequestAds()) return;
    const now = Date.now();
    if (!ignoreCooldown && now - this.lastInterstitialAt < 90_000) return;

    try {
      if (!this.interstitialPrepared) {
        await AdMob.prepareInterstitial({
          adId: ADMOB_CONFIG.interstitialId,
          isTesting: isSampleTestAdUnit(ADMOB_CONFIG.interstitialId),
        });
      }
      this.interstitialPrepared = false;

      await new Promise<void>((resolve) => {
        let done = false;
        const handles: Array<{ remove: () => Promise<void> }> = [];
        const finish = () => {
          if (done) return;
          done = true;
          handles.forEach((h) => void h.remove().catch(() => {}));
          resolve();
        };
        void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish).then((h) =>
          handles.push(h)
        );
        void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish).then((h) =>
          handles.push(h)
        );
        AdMob.showInterstitial().catch(finish);
      });
      this.lastInterstitialAt = Date.now();
      void this.prepareInterstitial();
    } catch {
      this.interstitialPrepared = false;
    }
  }

  // Strictly called ONLY after round ends — never during active gameplay
  public async showPostMatchInterstitial(): Promise<void> {
    await this.showInterstitial(false);
  }

  // Preload Rewarded Ad (ca-app-pub-3940256099942544/5224354917) only after consent permits ads
  public async prepareRewardedAd(): Promise<void> {
    if (!this.canRequestAds() || this.rewardedPrepared) return;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: ADMOB_CONFIG.rewardedId,
        isTesting: isSampleTestAdUnit(ADMOB_CONFIG.rewardedId),
      });
      this.rewardedPrepared = true;
    } catch {
      this.rewardedPrepared = false;
    }
  }

  // Genuine Rewarded Ad flow (ca-app-pub-3940256099942544/5224354917):
  // Enforces UMP consent check before requesting ads and NEVER grants fake rewards on Web preview.
  public async showRewardedAd(): Promise<{ rewarded: boolean; reason?: string }> {
    if (!this.isNativeAndroid()) {
      return {
        rewarded: false,
        reason:
          'Google AdMob Rewarded Ad (ca-app-pub-3940256099942544/5224354917) runs on the native Android APK build.',
      };
    }

    if (!this.consentSnapshot.checked || !this.consentSnapshot.canRequestAds) {
      const snapshot = await this.gatherConsent();
      if (!snapshot.canRequestAds) {
        return {
          rewarded: false,
          reason: 'Privacy consent is required before displaying AdMob ads.',
        };
      }
    }

    if (!(await this.ensureSdkInitialized())) {
      return {
        rewarded: false,
        reason: 'AdMob SDK is waiting for consent confirmation.',
      };
    }

    try {
      if (!this.rewardedPrepared) {
        await AdMob.prepareRewardVideoAd({
          adId: ADMOB_CONFIG.rewardedId,
          isTesting: isSampleTestAdUnit(ADMOB_CONFIG.rewardedId),
        });
      }
      this.rewardedPrepared = false;

      const result = await new Promise<{ rewarded: boolean; reason?: string }>((resolve) => {
        let earned = false;
        let settled = false;
        const handles: Array<{ remove: () => Promise<void> }> = [];

        const settle = (res: { rewarded: boolean; reason?: string }) => {
          if (settled) return;
          settled = true;
          handles.forEach((h) => void h.remove().catch(() => {}));
          resolve(res);
        };

        void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
          earned = true;
        }).then((h) => handles.push(h));

        void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
          settle(
            earned
              ? { rewarded: true }
              : { rewarded: false, reason: 'Video closed before reward was earned.' }
          );
        }).then((h) => handles.push(h));

        void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
          settle({ rewarded: false, reason: 'Rewarded video is temporarily unavailable.' });
        }).then((h) => handles.push(h));

        AdMob.showRewardVideoAd().catch(() => {
          settle({ rewarded: false, reason: 'Unable to display rewarded video.' });
        });
      });

      // Preload next level's rewarded ad in the background
      void this.prepareRewardedAd();
      return result;
    } catch {
      this.rewardedPrepared = false;
      return {
        rewarded: false,
        reason: 'Rewarded video failed to load.',
      };
    }
  }
}

export const adMobService = new AdMobService();
