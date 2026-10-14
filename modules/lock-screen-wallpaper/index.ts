import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type LockScreenWallpaperModule = {
  isSupported(): boolean;
  setLockScreen(uri: string): Promise<void>;
  clearLockScreen(): Promise<void>;
};

/**
 * Android only: sets or clears the lock screen wallpaper. Null on iOS and the web, where apps can't
 * change the wallpaper, and in a build made before this module was added.
 */
export const LockScreenWallpaper =
  Platform.OS === 'android'
    ? requireOptionalNativeModule<LockScreenWallpaperModule>('LockScreenWallpaper')
    : null;
