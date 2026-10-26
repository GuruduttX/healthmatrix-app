import { router } from 'expo-router';
import { CircleCheck, Download, Info, Smartphone } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { Glass, glassSurface } from '@/components/ui/glass';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Glass as GlassTokens, Spacing } from '@/constants/theme';
import { putQrOnLockScreen, takeQrOffLockScreen, useLockScreenQr } from '@/features/card/lock-screen-qr';
import { LockScreenWallpaperArt } from '@/features/card/lock-screen-wallpaper';
import { useEmergencyQr } from '@/features/card/use-emergency-qr';

/** iOS 16 and later: how to put a photo on the Lock Screen. */
const IOS_STEPS = [
  'Touch and hold your Lock Screen until Customise appears, then tap +.',
  'Tap Photos and choose the newest photo, your emergency QR.',
  'Tap Add, then Set as Wallpaper Pair or Customise Lock Screen.',
];

/**
 * The preview's height: about half the screen, so the words above it and the button below it
 * fit on one screen with it. Its width follows the phone's shape.
 */
const previewHeightFor = (windowHeight: number) =>
  Math.round(Math.min(Math.max(windowHeight * 0.48, 300), 470));
/** The glass frame around the preview, like a phone's edge. */
const BEZEL = 6;
const SCREEN_RADIUS = 28;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
  const art = useRef<ViewInstance>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The picture is drawn at the phone's own size and shape, so the saved wallpaper is sharp and
  // fills the lock screen without cropping the QR. The preview shows it scaled down.
  const short = Math.min(window.height, window.width);
  const ratio = Math.max(window.height, window.width) / short;
  const artWidth = short;
  const previewHeight = previewHeightFor(window.height);
  const previewWidth = Math.round(previewHeight / ratio);
  const scale = previewWidth / artWidth;

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
          ? 'Save this picture and set it as your Lock Screen. Anyone can scan it in an emergency, without unlocking your phone.'
          : 'Your emergency QR as your lock screen picture. Anyone can scan it in an emergency, without unlocking your phone.'}
      </ThemedText>

      <View style={styles.previewWrap}>
        {qr ? (
          <Glass variant="small" radius={SCREEN_RADIUS + BEZEL} style={styles.bezel}>
            <View style={[styles.preview, { width: previewWidth, height: previewHeight }]}>
              {/* Full size, shrunk to fit: only the picture inside is saved, at full size. */}
              <View
                style={{
                  width: artWidth,
                  height: artWidth * ratio,
                  transformOrigin: 'top left',
                  transform: [{ scale }],
                }}>
                <LockScreenWallpaperArt ref={art} url={qr.url} width={artWidth} ratio={ratio} />
              </View>
              <LockScreenClock height={previewHeight} />
            </View>
          </Glass>
        ) : error ? (
          <ErrorState title="Couldn’t load your QR" message={error} onRetry={() => void refresh()} />
        ) : (
          <SkeletonGroup label="Loading your QR">
            <Skeleton width={previewWidth} height={previewHeight} radius={SCREEN_RADIUS} />
          </SkeletonGroup>
        )}
      </View>

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
              size="sm"
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
                <View style={[glassSurface.small, styles.stepNumber]}>
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
            ? 'Only your lock screen changes. If it doesn’t show, your phone may use its own lock screen pictures: check its lock screen settings.'
            : 'The picture shows no name or details. The QR opens only what you chose to show responders.'}
        </ThemedText>
      </View>
    </Screen>
  );
}

/**
 * The time and date over the preview, as a lock screen shows them, so the picture reads as the
 * phone's lock screen. Not part of the saved picture: the phone draws its own.
 */
function LockScreenClock({ height }: { height: number }) {
  const now = new Date();
  const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`;
  const date = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
  return (
    <View style={[styles.clock, { top: height * 0.07 }]} pointerEvents="none">
      <ThemedText
        style={[styles.clockDate, { fontSize: height * 0.032, lineHeight: height * 0.042 }]}>
        {date}
      </ThemedText>
      <ThemedText
        style={[styles.clockTime, { fontSize: height * 0.13, lineHeight: height * 0.15 }]}>
        {time}
      </ThemedText>
    </View>
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
  bezel: {
    padding: BEZEL,
  },
  // Rounded like a phone screen, set into its frame.
  preview: {
    borderRadius: SCREEN_RADIUS,
    overflow: 'hidden',
    boxShadow: GlassTokens.shadowFlat,
  },
  clock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  clockDate: {
    fontFamily: Fonts.semibold,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  clockTime: {
    fontFamily: Fonts.semibold,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
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
  // A small round of glass.
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.text,
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
