import { useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import {
  Activity,
  HeartPulse,
  type LucideIcon,
  MessageCircle,
  RotateCcw,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Sun,
  Wind,
} from 'lucide-react-native';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Glass } from '@/components/ui/glass';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { StatusChip } from '@/components/ui/status-chip';
import { Colors, Fonts, Gutter, Radius, Spacing } from '@/constants/theme';
import { KEEP_FACE_SCANS } from '@/features/face-scan/face-scan-api';
import { FRAME_ASPECT } from '@/features/face-scan/geometry';
import { ScanCamera, scanCameraAvailable } from '@/features/face-scan/scan-camera';
import { PulseTrace, ScanOverlay } from '@/features/face-scan/scan-visuals';
import { SCAN_SECONDS, useFaceScan } from '@/features/face-scan/use-face-scan';
import { scanWhen, useFaceScans } from '@/features/face-scan/use-face-scans';
import { VITALS, vitalFlag, type FaceScan, type VitalCode } from '@/features/face-scan/vitals';

/** The camera frame's widest, so the face isn't huge on a tablet. */
const FRAME_MAX = 360;

const VITAL_ICONS: Partial<Record<VitalCode, LucideIcon>> = {
  heart_rate: HeartPulse,
  breathing_rate: Wind,
  hrv: Activity,
};

/** What each vital means, in a line a member can follow. */
const VITAL_NOTES: Partial<Record<VitalCode, string>> = {
  heart_rate: 'Beats a minute at rest. 60 to 100 is usual for adults.',
  breathing_rate: 'Breaths a minute at rest. 12 to 20 is usual for adults.',
  hrv: 'How much the time between beats varies. Higher usually means more rested; it differs a lot between people, so compare with your own scans.',
};

/** Why a vital the scan tried for is missing. */
const MISSING_NOTES: Partial<Record<VitalCode, string>> = {
  breathing_rate: 'Not clear enough this time. Sit still and breathe normally next time.',
  hrv: 'Needs a very clean pulse. Try facing a bright window and keeping very still.',
};

const TIPS: { icon: LucideIcon; tone: Tone; title: string; body: string }[] = [
  { icon: Sun, tone: 'warning', title: 'Face the light', body: 'A window or lamp in front of you, not behind' },
  { icon: Smartphone, tone: 'primary', title: 'Hold still at eye level', body: 'Rest your elbows, or lean the phone on something' },
  { icon: Wind, tone: 'success', title: 'Breathe normally', body: 'Don’t talk or move for 40 seconds' },
];

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * Face scan: 40 seconds with the front camera measures heart rate, breathing rate and heart rate
 * variability from the skin's colour (remote photoplethysmography), all on the phone. Only the
 * results are kept, for the member's history and for Ekaay.
 */
export default function FaceScanScreen() {
  const scan = useFaceScan();
  const history = useFaceScans();
  const [permission, requestPermission] = useCameraPermissions();
  const { width: windowWidth } = useWindowDimensions();
  const frameWidth = Math.min(windowWidth - Gutter * 2, FRAME_MAX);

  const start = async () => {
    // The browser asks for the camera itself when the scan starts.
    if (Platform.OS !== 'web' && !permission?.granted) {
      const answer = await requestPermission();
      if (!answer.granted) {
        scan.onCameraError('Allow the camera in Settings to scan your face.');
        return;
      }
    }
    scan.start();
  };

  const scanning = scan.phase === 'scanning';

  return (
    <Screen
      onBack={scanning ? scan.cancel : goBack}
      backLabel={scanning ? 'Stop the scan' : 'Home'}
      barTitle="Face scan">
      {scanning ? (
        <View style={styles.scanning}>
          <View style={[styles.frame, { width: frameWidth, height: frameWidth / FRAME_ASPECT }]}>
            <ScanCamera
              active
              lockExposure={scan.lockExposure}
              onFrame={scan.onFrame}
              onError={scan.onCameraError}
            />
            <ScanOverlay width={frameWidth} faceInOval={scan.faceInOval} progress={scan.progress} />
          </View>

          <View style={styles.status} accessibilityLiveRegion="polite">
            <ThemedText style={styles.message}>{scan.message}</ThemedText>
            <ThemedText style={styles.seconds}>{scan.secondsLeft} s</ThemedText>
          </View>
          <PulseTrace wave={scan.wave} width={frameWidth} height={48} />

          <Button label="Stop" variant="secondary" onPress={scan.cancel} />
        </View>
      ) : scan.phase === 'result' && scan.result ? (
        <ScanResult
          result={scan.result}
          measures={scan.measures}
          saved={scan.saved}
          onRetrySave={scan.retrySave}
          onAgain={start}
        />
      ) : (
        <>
          {scan.phase === 'failed' && scan.failure ? (
            <Glass style={styles.failed}>
              <IconTile icon={ScanFace} tone="warning" size={LIST_LEAD} />
              <View style={styles.flex}>
                <ThemedText style={styles.cardTitle}>
                  {scan.failure.why === 'camera' ? 'The camera didn’t start' : 'Couldn’t read your pulse'}
                </ThemedText>
                <ThemedText style={styles.cardBody}>
                  {scan.failure.message ??
                    (scan.failure.why === 'short'
                      ? 'Your face wasn’t in the oval long enough. Try again, keeping still.'
                      : 'The signal was too unsteady. Face a bright window, keep still and try again.')}
                </ThemedText>
              </View>
            </Glass>
          ) : null}

          <Glass style={styles.intro}>
            <View style={styles.introIcon}>
              <IconTile icon={ScanFace} tone="primary" size={52} />
            </View>
            <ThemedText style={styles.introTitle}>Check your vitals with your camera</ThemedText>
            <ThemedText style={styles.cardBody}>
              In {SCAN_SECONDS} seconds your front camera reads the tiny changes in your skin’s
              colour with each heartbeat and works out your heart rate, breathing rate and heart
              rate variability.
            </ThemedText>
            {scanCameraAvailable ? (
              <Button
                label={scan.phase === 'failed' ? 'Try again' : 'Start face scan'}
                icon={scan.phase === 'failed' ? RotateCcw : ScanFace}
                onPress={() => void start()}
              />
            ) : (
              <ThemedText style={styles.unavailable}>
                Update HealthMatrix to the latest version to use face scan.
              </ThemedText>
            )}
          </Glass>

          <Section title="For a good reading" index={1}>
            <ListCard>
              {TIPS.map((tip) => (
                <ListRow
                  key={tip.title}
                  leading={<IconTile icon={tip.icon} tone={tip.tone} size={LIST_LEAD} />}
                  title={tip.title}
                  subtitle={tip.body}
                />
              ))}
              <ListRow
                leading={<IconTile icon={ShieldCheck} tone="neutral" size={LIST_LEAD} />}
                title="Private"
                subtitle={
                  KEEP_FACE_SCANS
                    ? 'The video stays on your phone. Only the results are saved.'
                    : 'The video stays on your phone, and nothing is saved.'
                }
              />
            </ListCard>
          </Section>

          <PastScans scans={history.scans} />

          <ThemedText style={styles.disclaimer}>
            A wellness estimate, not a diagnosis or a medical device. A face scan can’t measure blood
            pressure, oxygen or sugar: book a pod test for those. In an emergency, call 112.
          </ThemedText>
        </>
      )}
    </Screen>
  );
}

function ScanResult({
  result,
  measures,
  saved,
  onRetrySave,
  onAgain,
}: {
  result: FaceScan;
  measures: VitalCode[];
  saved: 'saving' | 'saved' | 'failed' | null;
  onRetrySave: () => void;
  onAgain: () => void;
}) {
  const missing = measures.filter((code) => !result.vitals.some((vital) => vital.code === code));

  return (
    <>
      <Section
        title="Your face scan"
        caption={`${scanWhen(result.measuredAt)} · ${result.quality === 'good' ? 'Good signal' : 'Fair signal'} · ${result.seconds} s`}
        index={0}>
        <ListCard>
          {result.vitals.map((vital) => {
            const { name, unit } = VITALS[vital.code];
            const flag = vitalFlag(vital);
            const Icon = VITAL_ICONS[vital.code] ?? Activity;
            return (
              <View key={vital.code} style={styles.vital}>
                <IconTile icon={Icon} tone="primary" size={LIST_LEAD} />
                <View style={styles.flex}>
                  <ThemedText style={styles.vitalName}>{name}</ThemedText>
                  <View style={styles.valueRow}>
                    <ThemedText style={styles.value}>{vital.value}</ThemedText>
                    <ThemedText style={styles.unit}>{unit}</ThemedText>
                    {flag ? <StatusChip flag={flag} /> : null}
                  </View>
                  <ThemedText style={styles.cardBody}>{VITAL_NOTES[vital.code]}</ThemedText>
                </View>
              </View>
            );
          })}
          {missing.map((code) => (
            <ListRow
              key={code}
              leading={<IconTile icon={VITAL_ICONS[code] ?? Activity} tone="neutral" size={LIST_LEAD} />}
              title={VITALS[code].name}
              subtitle={MISSING_NOTES[code] ?? 'Not measured this time.'}
            />
          ))}
        </ListCard>
        {saved === 'failed' ? (
          <ThemedText style={styles.saveNote} onPress={onRetrySave}>
            Couldn’t save this scan. Tap to try again.
          </ThemedText>
        ) : saved === 'saving' ? (
          <ThemedText style={styles.saveNote}>Saving…</ThemedText>
        ) : null}
      </Section>

      <View style={styles.actions}>
        <Button
          label="Ask Ekaay about this"
          icon={MessageCircle}
          onPress={() =>
            router.navigate({
              pathname: '/ekaay',
              // The readings go in the question too, so Ekaay has them even before the save
              // lands, or if it failed (or while KEEP_FACE_SCANS is off).
              params: {
                q: `Explain my face scan: ${result.vitals
                  .map(({ code, value }) => `${VITALS[code].name.toLowerCase()} ${value} ${VITALS[code].unit}`)
                  .join(', ')}`,
              },
            })
          }
        />
        <Button label="Scan again" variant="secondary" icon={RotateCcw} onPress={onAgain} />
      </View>

      <Section title="Not from a face scan" index={2}>
        <ListCard>
          <ListRow
            leading={<IconTile icon={Activity} tone="neutral" size={LIST_LEAD} />}
            title="Blood pressure, oxygen and sugar"
            subtitle="Measured properly at a HealthMatrix pod, with results in the app"
            trailing={<Chevron />}
            onPress={() => router.push('/care/pods')}
            accessibilityLabel="Book a pod test for blood pressure, oxygen and sugar"
          />
        </ListCard>
      </Section>

      <ThemedText style={styles.disclaimer}>
        A wellness estimate from your camera, not a diagnosis. If something feels wrong, talk to a
        doctor. In an emergency, call 112.
      </ThemedText>
    </>
  );
}

function PastScans({ scans }: { scans: FaceScan[] | null }) {
  if (!scans?.length) return null;
  return (
    <Section title="Past scans" meta={`${scans.length}`} index={2}>
      <ListCard>
        {scans.slice(0, 5).map((scan) => (
          <ListRow
            key={scan.id ?? scan.measuredAt}
            leading={<IconTile icon={HeartPulse} tone="neutral" size={LIST_LEAD} />}
            title={scan.vitals
              .map(({ code, value }) => `${value} ${VITALS[code].unit}`)
              .join(' · ')}
            subtitle={scanWhen(scan.measuredAt)}
          />
        ))}
      </ListCard>
    </Section>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minWidth: 0,
  },
  scanning: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  // The camera's 3:4 box: the frames the camera reads, cropped the same way.
  frame: {
    overflow: 'hidden',
    borderRadius: Radius.xl,
    backgroundColor: Colors.ink,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    alignSelf: 'stretch',
  },
  message: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
  },
  seconds: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  intro: {
    gap: Spacing.three - 4,
    padding: Spacing.four - 4,
  },
  introIcon: {
    alignSelf: 'flex-start',
  },
  introTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
  },
  failed: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    padding: Spacing.three,
  },
  cardTitle: {
    fontFamily: Fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.text,
  },
  cardBody: {
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  unavailable: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.watch,
  },
  vital: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.three - 4,
  },
  vitalName: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textSoft,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  value: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 30,
    lineHeight: 36,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    marginRight: 4,
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 19,
    color: Colors.textFaint,
  },
  saveNote: {
    marginTop: Spacing.two,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textFaint,
  },
  actions: {
    gap: Spacing.two,
  },
  disclaimer: {
    paddingHorizontal: Spacing.two,
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 18,
    color: Colors.textFaint,
  },
});
