import { createLocalStorageStore } from './storage-utils';

const WELCOME_BANNER_KEY = 'welcomeBannerDismissed';

// Create storage instance for welcome banner dismissal state
const welcomeBannerStore = createLocalStorageStore<boolean>({
  key: WELCOME_BANNER_KEY,
  defaultValue: false,
});

export function isWelcomeBannerDismissed(): boolean {
  return welcomeBannerStore.get() ?? false;
}

export function dismissWelcomeBanner(): void {
  welcomeBannerStore.set(true);
}

export function resetWelcomeBanner(): void {
  welcomeBannerStore.remove();
}
