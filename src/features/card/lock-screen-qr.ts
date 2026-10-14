import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { storage } from '@/services/storage';

import { LockScreenWallpaper } from '../../../modules/lock-screen-wallpaper';

/**
 * How the emergency QR reaches this phone's lock screen. Android: set as the lock screen wallpaper
 * by the app (`automatic`). iPhone: saved to Photos for the member to set, since iOS lets no app
 * change the wallpaper (`photos`). The web, or an Android build made before the native module was
 * added: not possible here (`unavailable`).
 */
export type LockScreenMode = 'automatic' | 'photos' | 'unavailable';

export function lockScreenMode(): LockScreenMode {
  if (Platform.OS === 'ios') return 'photos';
  if (Platform.OS === 'android') {
    try {
      return LockScreenWallpaper?.isSupported() ? 'automatic' : 'unavailable';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}

// Whether the QR is on this phone's lock screen. Per phone, so it lives on the device, not the
// account: another phone signed in as the same member has its own lock screen.
const KEY = 'healthmatrix.lockScreenQr';
let on: boolean | null = null;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function remember(value: boolean) {
  on = value;
  listeners.forEach((listener) => listener());
  await (value ? storage.set(KEY, '1') : storage.remove(KEY));
}

function load() {
  loading ??= storage
    .get(KEY)
    .then((value) => {
      on = value === '1';
      listeners.forEach((listener) => listener());
    })
    .catch(() => {
      on = false;
    });
  return loading;
}

/**
 * Puts the wallpaper image at `uri` (a file:// PNG) on the lock screen: sets it on Android, saves
 * it to Photos on iPhone. Throws with words a member can act on.
 */
export async function putQrOnLockScreen(uri: string) {
  const mode = lockScreenMode();
  if (mode === 'automatic') {
    await LockScreenWallpaper!.setLockScreen(uri);
  } else if (mode === 'photos') {
    // Loaded only here: on the web its module can't even be imported.
    const { Asset, requestPermissionsAsync } = await import('expo-media-library');
    const { granted } = await requestPermissionsAsync(true);
    if (!granted) {
      throw new Error('HealthMatrix needs permission to save to Photos. Allow it in Settings.');
    }
    await Asset.create(uri);
  } else {
    throw new Error('This works in the HealthMatrix app on your phone.');
  }
  await remember(true);
}

/**
 * Takes the QR off: on Android the lock screen goes back to the home screen wallpaper. On iPhone
 * the app can't change it, so only the setting is turned off; the member picks another wallpaper.
 */
export async function takeQrOffLockScreen() {
  if (lockScreenMode() === 'automatic') await LockScreenWallpaper!.clearLockScreen();
  await remember(false);
}

/** Whether the QR is on this phone's lock screen; null until read from the device. */
export function useLockScreenQr() {
  const value = useSyncExternalStore(subscribe, () => on);
  useEffect(() => {
    void load();
  }, []);
  return { on: value, mode: lockScreenMode() };
}
