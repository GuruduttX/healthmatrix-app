import { router } from 'expo-router';
import {
  AlertCircle,
  BadgeCheck,
  BellPlus,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  FlaskConical,
  Info,
  ListChecks,
  MessageSquareText,
  Video,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { HeaderIconButton } from '@/components/ui/stack-header';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Shadows, Spacing } from '@/constants/theme';
import { LinkButton, LinkRow, PillButton } from '@/features/doctors/consult-actions';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot } from '@/features/doctors/time';
import { iconFor, MONTHS_SHORT, RecordTag } from '@/features/records/record-row';
import {
  type OpenRecord,
  type PrescribedTest,
  type PrescriptionRecord,
  type RecordSummary,
} from '@/features/records/types';
import { ScreeningDetail } from '@/features/records/screening-detail';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { api } from '@/services/api';

/** Microsoft Fluent Emoji (MIT), as on Home's Today card; see assets/images/home/3d/LICENSE. */
const PILL = require('@/assets/images/home/3d/medicine.png');
const SYRINGE = require('@/assets/images/home/3d/syringe.png');

/** "2026-10-06" -> "6 Oct 2026" */
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
}

/**
 * A line that starts with a medicine and its strength ("Metformin 500 mg, twice daily…") reads as
 * the medicine, then how to take it. Anything else (advice, "Walk 30 minutes daily") stays whole.
 */
const STRENGTH = /\d[\d,.]*\s?(mg|mcg|µg|g|ml|iu|units?|%)\b/i;
function splitLine(item: string) {
  const comma = item.indexOf(', ');
  const head = comma > 0 ? item.slice(0, comma) : item;
  if (comma < 0 || !STRENGTH.test(head)) return { medicine: false, title: item };
  const rest = item.slice(comma + 2);
  return {
    medicine: true,
    title: head,
    how: rest ? rest[0]!.toUpperCase() + rest.slice(1) : undefined,
  };
}

const PROGRESS_ICONS: Record<NonNullable<PrescribedTest['booking']>['progress']['tone'], LucideIcon> = {
  neutral: Clock,
  success: Check,
  warning: Eye,
  danger: AlertCircle,
};

/**
 * Opens the pod finder with these tests chosen, linked to the prescription so the booking (and
 * its results) can go back to the doctor who ordered them.
 */
function bookAtPod(prescriptionId: string, tests: PrescribedTest[]) {
  const profiles = tests.filter((test) => test.kind === 'profile').map((test) => test.code);
  const singles = tests.filter((test) => test.kind === 'test').map((test) => test.code);
  router.push({
    pathname: '/care/pods',
    params: {
      rx: prescriptionId,
      ...(profiles.length && { profiles: profiles.join(',') }),
      ...(singles.length && { tests: singles.join(',') }),
    },
  });
}

/** "Health check · 2 tests" or "Lab test". */
function testLine(test: PrescribedTest) {
  if (test.kind === 'test') return 'Lab test';
  return `Health check · ${test.tests.length} ${test.tests.length === 1 ? 'test' : 'tests'}`;
}

/**
 * A vaccine's quiet line on this prescription: its subtitle without the doctor, who is named
 * above, or the word its flag already says: "Dr Ananya Iyer · 1 dose, every year" -> "1 dose,
 * every year".
 */
function vaccineLine(vaccine: RecordSummary, doctor?: string) {
  const flag = vaccine.tag?.label.toLowerCase();
  const parts = vaccine.subtitle
    .split(' · ')
    .filter((part) => part !== doctor && part.toLowerCase() !== flag);
  return parts.join(' · ') || vaccine.subtitle;
}

type RecordScreenProps = {
  /** Where the record loads from: `/records/<id>`, or a family member's `/family/<m>/records/<id>`. */
  endpoint: string;
  /** The screen Back returns to. */
  backLabel: string;
  onBack: () => void;
  /** Opens another record, e.g. a vaccine prescribed on this prescription. */
  openRecord: (id: string) => void;
  /**
   * A family member's record: nothing can be changed (no dose marking, reminders or booking),
   * and the wording is about them rather than "you".
   */
  readOnly?: boolean;
};

/** The record's shape while it loads: the title, the lines, then the consult. */
function RecordSkeleton() {
  return (
    <SkeletonGroup label="Opening this record" style={styles.stack}>
      <View style={styles.header}>
        <Skeleton width="60%" height={28} />
        <Skeleton width="75%" height={13} />
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={190} height={20} />
        <SkeletonList rows={3} leading="circle" trailing={false} />
      </View>
      <View style={styles.skeletonSection}>
        <Skeleton width={90} height={20} />
        <SkeletonList rows={2} leading="circle" trailing={false} />
      </View>
    </SkeletonGroup>
  );
}

/**
 * Who stands behind a prescription, and when: "Signed by Dr Ananya Iyer · 28 Sep 2026". A vaccine
 * names its doctor on its own card below, so it has no line here.
 */
function Provenance({ record }: { record: PrescriptionRecord }) {
  const date = formatDate(record.date);
  const doctor = record.doctor?.name;

  if (record.prescription.status !== 'signed') {
    return (
      <ThemedText style={styles.provenance} numberOfLines={2}>
        {doctor ? `${doctor} · ${date}` : date}
      </ThemedText>
    );
  }

  // Signed is a flag: its icon and word in the flag's colour, the rest quiet.
  return (
    <View style={styles.signedRow}>
      <BadgeCheck size={15} color={Colors.good} strokeWidth={2.4} />
      <ThemedText style={[styles.provenance, styles.flex]} numberOfLines={2}>
        <ThemedText style={styles.signed}>Signed</ThemedText>
        {doctor ? ` by ${doctor}` : ''} · {date}
      </ThemedText>
    </View>
  );
}

/**
 * One record opened up: a prescription with every line on it, a vaccine with its doses, or a pod
 * screening's readings. Used by the Records tab and, read-only, by a family member's page.
 */
export function RecordScreen({
  endpoint,
  backLabel,
  onBack,
  openRecord,
  readOnly,
}: RecordScreenProps) {
  const [record, setRecord] = useState<OpenRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** `isActive` drops the answer once another record is open. */
  const load = useCallback(
    (isActive: () => boolean) =>
      api<{ record: OpenRecord }>(endpoint)
        .then(({ record: next }) => {
          if (!isActive()) return;
          setRecord(next);
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Could not open this record');
        }),
    [endpoint],
  );

  useEffect(() => {
    let active = true;
    void load(() => active);
    return () => {
      active = false;
    };
  }, [load]);

  const look = record ? iconFor(record.type) : null;

  return (
    // As on the Care tab's vaccine page: the kind in the bar, the record's own title big below
    // (and the bar left empty when the title is the kind itself, a plain "Prescription").
    <Screen
      onBack={onBack}
      backLabel={backLabel}
      barTitle={look && record?.title !== look.kind ? look.kind : undefined}
      barRight={
        record?.type === 'prescription' && !readOnly ? (
          <HeaderIconButton
            icon={<EkaayMark size={20} />}
            label="Ask Ekaay"
            text="Ask Ekaay"
            onPress={() => router.navigate('/ekaay')}
          />
        ) : undefined
      }
      onRefresh={() => load(() => true)}>
      {!record ? (
        error ? (
          <ErrorState
            title="Couldn’t open this record"
            message={error}
            onRetry={() => void load(() => true)}
          />
        ) : (
          <RecordSkeleton />
        )
      ) : (
        <>
          <View style={styles.header}>
            <ThemedText style={styles.title} accessibilityRole="header">
              {record.title}
            </ThemedText>
            {record.type === 'prescription' ? <Provenance record={record} /> : null}
            {record.type === 'pod_screening' ? (
              <ThemedText style={styles.provenance} numberOfLines={2}>
                {record.screening.provider} · {formatDate(record.date)}
              </ThemedText>
            ) : null}
          </View>

          {record.type === 'pod_screening' ? (
            <ScreeningDetail record={record} readOnly={readOnly} />
          ) : record.type === 'vaccination' ? (
            <VaccineDetail
              vaccination={record.vaccination}
              readOnly={readOnly}
              onChange={(vaccination) =>
                setRecord({ ...record, vaccination, tag: vaccination.tag })
              }
            />
          ) : (
            <PrescriptionBody record={record} openRecord={openRecord} readOnly={readOnly} />
          )}
        </>
      )}
    </Screen>
  );
}

/**
 * A test the doctor ordered, on the prescription's card. A health check's "2 tests" opens and
 * closes the list of what it covers. Book sits at the right until it's booked; then the flag says
 * where the booking is and a link opens it, or its results. The row itself isn't a button, since
 * it holds its own.
 */
function PrescribedTestRow({
  test,
  readOnly,
  onBook,
}: {
  test: PrescribedTest;
  readOnly?: boolean;
  onBook: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { booking } = test;
  const isProfile = test.kind === 'profile' && test.testNames.length > 0;

  return (
    <ListRow
      leading={<IconTile icon={FlaskConical} size={LIST_LEAD} />}
      title={<ThemedText style={listText.title}>{test.name}</ThemedText>}
      subtitle={
        <View>
          {isProfile ? (
            <Pressable
              onPress={() => setOpen((value) => !value)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${test.name}: ${test.testNames.length} tests. ${open ? 'Hide' : 'Show'} them`}
              hitSlop={6}
              style={({ pressed }) => [styles.toggle, pressed && styles.togglePressed]}>
              <ThemedText style={listText.subtitle}>{testLine(test)}</ThemedText>
              {open ? (
                <ChevronUp size={15} color={Colors.textSoft} strokeWidth={2.4} />
              ) : (
                <ChevronDown size={15} color={Colors.textSoft} strokeWidth={2.4} />
              )}
            </Pressable>
          ) : (
            <ThemedText style={listText.subtitle}>{testLine(test)}</ThemedText>
          )}
          {isProfile && open ? (
            <View style={styles.included}>
              {test.testNames.map((name, index) => (
                <View key={`${test.tests[index]}-${index}`} style={styles.includedRow}>
                  <View style={styles.dot} />
                  <ThemedText style={[styles.includedText, styles.flex]}>{name}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
          {booking ? (
            <View style={styles.flag}>
              <Tag
                label={booking.progress.label}
                tone={booking.progress.tone}
                icon={PROGRESS_ICONS[booking.progress.tone]}
              />
            </View>
          ) : null}
          {booking && !readOnly ? (
            <LinkRow>
              <LinkButton
                label={booking.recordId ? 'See results' : 'View booking'}
                onPress={() =>
                  booking.recordId
                    ? router.push({ pathname: '/records/[id]', params: { id: booking.recordId } })
                    : router.push({
                        pathname: '/care/pod-bookings/[id]',
                        params: { id: booking.id },
                      })
                }
                accessibilityLabel={`${booking.recordId ? 'See the results of' : 'View the booking for'} ${test.name}`}
              />
            </LinkRow>
          ) : null}
        </View>
      }
      trailing={
        booking || readOnly ? null : (
          <PillButton
            label="Book"
            icon={CalendarPlus}
            onPress={onBook}
            accessibilityLabel={`Book ${test.name} at a pod`}
          />
        )
      }
      // With the tests listed, the icon sits by the name rather than in the middle.
      style={open ? styles.topAligned : undefined}
    />
  );
}

/**
 * The prescription itself: every line first, then any vaccines prescribed with it, then the doctor
 * and the consult it came from, with the way to book them again.
 */
function PrescriptionBody({
  record,
  openRecord,
  readOnly,
}: {
  record: PrescriptionRecord;
  openRecord: (id: string) => void;
  readOnly?: boolean;
}) {
  const remind = (item: string) =>
    router.push({ pathname: '/care/medicine/[id]', params: { id: 'new', name: item } });
  const { doctor, consult } = record;
  const items = record.prescription.items;
  const tests = record.prescription.tests ?? [];
  const lines = items.length + tests.length;
  const toBook = tests.filter((test) => !test.booking);

  return (
    <>
      <Section
        title="Medicines and advice"
        meta={lines ? `${lines} ${lines === 1 ? 'line' : 'lines'}` : undefined}
        index={1}>
        <ListCard>
          {items.length || tests.length ? (
            [
              ...items.map((item, index) => {
                const line = splitLine(item);
                return (
                  <ListRow
                    key={`${index}-${item}`}
                    leading={
                      line.medicine ? (
                        <ArtDish art={PILL} />
                      ) : (
                        <IconTile icon={ListChecks} size={LIST_LEAD} />
                      )
                    }
                    title={<ThemedText style={listText.title}>{line.title}</ThemedText>}
                    subtitle={
                      line.how ? (
                        <ThemedText style={listText.subtitle}>{line.how}</ThemedText>
                      ) : undefined
                    }
                    trailing={
                      readOnly ? null : (
                        <Pressable
                          onPress={() => remind(item)}
                          accessibilityRole="button"
                          accessibilityLabel={`Set a reminder for ${item}`}
                          hitSlop={6}
                          style={({ pressed }) => [styles.remind, pressed && styles.remindPressed]}>
                          <BellPlus size={16} color={Colors.primaryDeep} strokeWidth={2.4} />
                        </Pressable>
                      )
                    }
                  />
                );
              }),
              // Tests to book at a pod, under the medicines. A health check opens to list its tests.
              // Once booked, the line shows where the booking is, with a link to it or its results.
              ...tests.map((test) => (
                <PrescribedTestRow
                  key={`test-${test.code}`}
                  test={test}
                  readOnly={readOnly}
                  onBook={() => bookAtPod(record.id, [test])}
                />
              )),
              ...(toBook.length > 1 && !readOnly
                ? [
                    <ListRow
                      key="book-all"
                      leading={<IconTile icon={CalendarPlus} size={LIST_LEAD} />}
                      title={`Book all ${toBook.length} at a pod`}
                      subtitle="One visit for every test on this prescription"
                      trailing={<Chevron />}
                      onPress={() => bookAtPod(record.id, toBook)}
                    />,
                  ]
                : []),
            ]
          ) : (
            <ListRow
              leading={<IconTile icon={ListChecks} size={LIST_LEAD} tone="neutral" />}
              title={
                <ThemedText style={listText.subtitle}>
                  The doctor did not add any lines to this prescription.
                </ThemedText>
              }
            />
          )}
        </ListCard>
      </Section>

      {record.vaccines.length ? (
        <Section title="Vaccines on this prescription" index={2}>
          <ListCard>
            {record.vaccines.map((vaccine) => (
              <ListRow
                key={vaccine.id}
                leading={<ArtDish art={SYRINGE} artSize={21} />}
                title={vaccine.title}
                subtitle={
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    {vaccineLine(vaccine, doctor?.name)}
                  </ThemedText>
                }
                meta={vaccine.tag ? <RecordTag tag={vaccine.tag} /> : undefined}
                trailing={<Chevron />}
                onPress={() => openRecord(vaccine.id)}
                accessibilityLabel={`${vaccine.title}${vaccine.tag ? `, ${vaccine.tag.label}` : ''}. Opens the vaccine record`}
              />
            ))}
          </ListCard>
        </Section>
      ) : null}

      {/* Who wrote it and why, as on the vaccine page: hairline-divided lines on one card. */}
      {doctor || consult ? (
        <Section title={consult ? 'Consult' : 'Doctor'} index={3}>
          <ListCard>
            {doctor ? (
              <ListRow
                leading={<DoctorAvatar name={doctor.name} size={LIST_LEAD} />}
                title={doctor.name}
                subtitle={
                  <View>
                    <ThemedText style={listText.subtitle} numberOfLines={1}>
                      {[doctor.qualifications, `Reg. ${doctor.registrationNumber}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </ThemedText>
                    {doctor.council ? (
                      <ThemedText style={styles.faint} numberOfLines={1}>
                        {doctor.council}
                      </ThemedText>
                    ) : null}
                  </View>
                }
              />
            ) : null}
            {consult ? (
              <ListRow
                leading={<IconTile icon={Video} size={LIST_LEAD} />}
                title={consult.specialty ? specialtyLabel(consult.specialty) : 'Consult'}
                subtitle={
                  <ThemedText style={listText.subtitle} numberOfLines={1}>
                    Video consult · {formatSlot(consult.scheduledAt)}
                  </ThemedText>
                }
              />
            ) : null}
            {consult?.reason ? (
              <ListRow
                leading={<IconTile icon={MessageSquareText} size={LIST_LEAD} />}
                title={
                  <ThemedText style={styles.faint} numberOfLines={1}>
                    {readOnly ? 'Reason for the consult' : 'You asked about'}
                  </ThemedText>
                }
                subtitle={<ThemedText style={styles.reason}>{consult.reason}</ThemedText>}
              />
            ) : null}
            {doctor && !readOnly ? (
              <ListRow
                leading={<IconTile icon={CalendarPlus} size={LIST_LEAD} />}
                title="Book a follow-up"
                trailing={<Chevron />}
                onPress={() =>
                  router.push({
                    pathname: '/care/book/[doctorId]',
                    params: {
                      doctorId: doctor.id,
                      ...(consult?.specialty && { specialty: consult.specialty }),
                    },
                  })
                }
                accessibilityLabel={`Book a follow-up with ${doctor.name}`}
              />
            ) : null}
          </ListCard>
        </Section>
      ) : null}

      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <Info size={14} color={Colors.textFaint} strokeWidth={2.2} />
        </View>
        <ThemedText style={[styles.noteText, styles.flex]}>
          Take medicines exactly as written. Ask your doctor before changing or stopping one.
        </ThemedText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.four - 4,
  },
  flex: {
    flex: 1,
  },
  header: {
    gap: 3,
  },
  skeletonSection: {
    gap: Spacing.three - 2,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  provenance: {
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  signedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  // Nested in the provenance line, so it sets its own line height.
  signed: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.good,
  },
  faint: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  reason: {
    fontFamily: Fonts.semibold,
    fontSize: 14.5,
    lineHeight: 20,
    color: Colors.text,
  },
  // A white button with a peach edge and an orange bell, like Home's add button.
  remind: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryTintStrong,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  remindPressed: {
    backgroundColor: Colors.primaryTint,
    transform: [{ scale: 0.95 }],
  },
  // "Health check · 2 tests" with its chevron: the whole line opens the list.
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    minHeight: 24,
  },
  togglePressed: {
    opacity: 0.6,
  },
  included: {
    gap: 3,
    marginTop: 4,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textFaint,
  },
  includedText: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
  },
  topAligned: {
    alignItems: 'flex-start',
  },
  // Where the booking stands, under the tests, before its link.
  flag: {
    flexDirection: 'row',
    marginTop: 6,
  },
  // A quiet line on the page, like Home's privacy note: no box around it.
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingHorizontal: Spacing.one,
  },
  // Centred on the text's first line.
  noteIcon: {
    paddingTop: 1.5,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
