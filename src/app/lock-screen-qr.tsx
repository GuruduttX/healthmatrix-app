import { router } from 'expo-router';
import { CircleCheck, Download, Info, Smartphone } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Gutter, Radius, Shadows, Spacing } from '@/constants/theme';
import { putQrOnLockScreen, takeQrOffLockScreen, useLockScreenQr } from '@/features/card/lock-screen-qr';
import { LockScreenWallpaperArt } from '@/features/card/lock-screen-wallpaper';
import { useEmergencyQr } from '@/features/card/use-emergency-qr';

/** iOS 16 and later: how to put a photo on the Lock Screen. */
const IOS_STEPS = [
  'Touch and hold your Lock Screen until Customise appears, then tap +.',
  'Tap Photos and choose the newest photo, your emergency QR.',
  'Tap Add, then Set as Wallpaper Pair or Customise Lock Screen.',
];

/** The preview never runs wider than this, so it reads as a phone on a tablet or the web. */
const MAX_PREVIEW = 360;

/**
 * Puts the emergency QR on this phone's lock screen as its wallpaper, so a responder can scan it
 * without unlocking. Android sets it straight away; iPhone saves it to Photos with the steps to
 * set it, since iOS lets no app change the wallpaper. The preview is the picture itself: what is
 * captured is exactly what is shown.
 */
export default function LockScreenQrScreen() {
  const { qr, error, refresh } = useEmergencyQr();
  const { on, mode } = useLockScreenQr();
  const window = useWindowDimensions();
  const art = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const width = Math.min(window.width - Gutter * 2, MAX_PREVIEW);
  // The phone's own shape, so the picture fills its lock screen without cropping the QR.
  const ratio = Math.max(window.height, window.width) / Math.min(window.height, window.width);

  const put = async () => {
    setBusy(true);
    setActionError(null);
    try {
      const uri = await captureRef(art, { format: 'png', quality: 1, result: 'tmpfile' });
      await putQrOnLockScreen(uri.startsWith('file://') ? uri : `file://${uri}`);
      setDone(true);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not put the QR on your lock screen.');
    } finally {
      setBusy(false);
    }
  };

  const takeOff = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await takeQrOffLockScreen();
      setDone(false);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not take the QR off your lock screen.');
    } finally {
      setBusy(false);
    }
  };

  const isOn = Boolean(on) || done;

  return (
    <Screen
      onBack={() => (router.canGoBack() ? router.back() : router.navigate('/card'))}
      backLabel="My card"
      barTitle="QR on lock screen"
      onRefresh={refresh}>
      <ThemedText style={styles.lead}>
        {mode === 'photos'
          ? 'Save this picture and set it as your Lock Screen. In an emergency, anyone can scan it with a phone camera, without unlocking yours.'
          : 'Your emergency QR becomes your lock screen picture. In an emergency, anyone can scan it with a phone camera, without unlocking yours.'}
      </ThemedText>

      <Section index={1}>
        <View style={styles.previewWrap}>
          {qr ? (
            <View style={[styles.preview, { width }]}>
              <LockScreenWallpaperArt ref={art} url={qr.url} width={width} ratio={ratio} />
            </View>
          ) : error ? (
            <ErrorState title="Couldn’t load your QR" message={error} onRetry={() => void refresh()} />
          ) : (
            <SkeletonGroup label="Loading your QR">
              <Skeleton width={width} height={width * ratio} radius={Radius.xl} />
            </SkeletonGroup>
          )}
        </View>
      </Section>

      {mode === 'unavailable' ? (
        <View style={styles.note}>
          <Info size={14} color={Colors.textFaint} strokeWidth={2.2} />
          <ThemedText style={[styles.noteText, styles.flex]}>
            Open HealthMatrix on your phone to put this on its lock screen.
          </ThemedText>
        </View>
      ) : (
        <View style={styles.actions}>
          {isOn ? (
            <View style={styles.status} accessibilityRole="alert">
              <CircleCheck size={16} color={Colors.good} strokeWidth={2.4} />
              <ThemedText style={[styles.statusText, styles.flex]}>
                {mode === 'automatic'
                  ? 'On your lock screen. Lock your phone to see it.'
                  : 'Saved to Photos. Follow the steps below to set it.'}
              </ThemedText>
            </View>
          ) : null}
          {actionError ? (
            <ThemedText style={styles.error} accessibilityRole="alert">
              {actionError}
            </ThemedText>
          ) : null}
          <Button
            label={
              mode === 'automatic'
                ? isOn
                  ? 'Update lock screen'
                  : 'Set as lock screen'
                : isOn
                  ? 'Save to Photos again'
                  : 'Save to Photos'
            }
            icon={mode === 'automatic' ? Smartphone : Download}
            loading={busy}
            disabled={!qr}
            onPress={() => void put()}
          />
          {isOn ? (
            <Button
              label={mode === 'automatic' ? 'Remove from lock screen' : 'Turn off'}
              variant="secondary"
              disabled={busy}
              onPress={() => void takeOff()}
            />
          ) : null}
        </View>
      )}

      {mode === 'photos' ? (
        <Section title="Set it on your iPhone" index={2}>
          <View style={styles.steps}>
            {IOS_STEPS.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={[styles.stepText, styles.flex]}>{step}</ThemedText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      <View style={styles.note}>
        <Info size={14} color={Colors.textFaint} strokeWidth={2.2} />
        <ThemedText style={[styles.noteText, styles.flex]}>
          {mode === 'automatic'
            ? 'Only the lock screen changes; your home screen stays as it is. Removing it brings back your home screen picture. Some phones use their own lock screen pictures; if it doesn’t show, check your phone’s lock screen settings.'
            : 'The picture shows no name or details. The QR opens only what you chose to show responders on your emergency profile.'}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  lead: {
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.textSoft,
  },
  previewWrap: {
    alignItems: 'center',
  },
  // Rounded like a phone screen; the shadow lifts it off the page.
  preview: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    boxShadow: Shadows.raised,
  },
  actions: {
    gap: Spacing.two,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  statusText: {
    fontFamily: Fonts.semibold,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.good,
  },
  error: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 19,
    color: Colors.high,
  },
  steps: {
    gap: Spacing.three - 4,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.ink,
  },
  stepNumberText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.onInk,
  },
  stepText: {
    paddingTop: 3,
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.text,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingHorizontal: Spacing.one,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
