import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BadgeCheck,
  BellPlus,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Info,
  Sparkles,
  Stethoscope,
  Syringe,
  Video,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile, TONES } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot } from '@/features/doctors/time';
import { iconFor, MONTHS_SHORT } from '@/features/records/record-row';
import { type OpenRecord, type PrescriptionRecord } from '@/features/records/types';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { api } from '@/services/api';

/** "2026-10-06" -> "6 Oct 2026" */
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
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

/** The record's shape while it loads: header card, doctor and the list of lines. */
function RecordSkeleton() {
  return (
    <SkeletonGroup label="Opening this record" style={styles.stack}>
      <View style={[styles.headerCard, styles.skeletonHeader]}>
        <Skeleton width={52} height={52} radius={Radius.md + 2} />
        <Skeleton width={90} height={11} />
        <Skeleton width="85%" height={24} />
        <Skeleton width="55%" height={24} />
        <View style={styles.metaRow}>
          <Skeleton width={96} height={26} radius={Radius.pill} />
          <Skeleton width={120} height={26} radius={Radius.pill} />
        </View>
      </View>
      <Surface style={styles.doctor}>
        <SkeletonCircle size={48} />
        <View style={styles.flex}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={11} style={styles.skeletonGap} />
        </View>
      </Surface>
      <Skeleton width={170} height={18} />
      <SkeletonList rows={3} leading="circle" />
    </SkeletonGroup>
  );
}

/**
 * One record opened up: a prescription with every line on it, or a vaccine with its doses. Used
 * by the Records tab and, read-only, by a family member's page.
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
  const doctorName =
    record?.type === 'vaccination' ? record.vaccination.doctor?.name : record?.doctor?.name;

  return (
    <Screen
      onBack={onBack}
      backLabel={backLabel}
      barTitle={look?.kind ?? 'Record'}
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
        <View style={styles.stack}>
          {/* A tinted header card in the record type's colour. */}
          <View style={styles.headerCard}>
            <LinearGradient
              colors={[TONES[look!.tone].soft, Colors.backgroundElement]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <IconTile icon={look!.icon} tone={look!.tone} size={52} />
            <View style={styles.titleBlock}>
              <ThemedText style={[styles.kicker, { color: TONES[look!.tone].color }]}>
                {look!.kind}
              </ThemedText>
              <ThemedText style={styles.title} accessibilityRole="header">
                {record.title}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <View style={styles.meta}>
                <CalendarDays size={13} color={Colors.textSecondary} strokeWidth={2.3} />
                <ThemedText type="caption" style={styles.metaText}>
                  {record.type === 'vaccination' ? 'Prescribed ' : ''}
                  {formatDate(record.date)}
                </ThemedText>
              </View>
              {doctorName ? (
                <View style={styles.meta}>
                  <Stethoscope size={13} color={Colors.textSecondary} strokeWidth={2.3} />
                  <ThemedText type="caption" style={styles.metaText} numberOfLines={1}>
                    {doctorName}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            {record.type === 'prescription' && record.prescription.status === 'signed' ? (
              <Tag
                label={
                  readOnly ? 'Digitally signed by the doctor' : 'Digitally signed by your doctor'
                }
                tone="success"
                icon={BadgeCheck}
              />
            ) : null}
          </View>

          {record.type === 'vaccination' ? (
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
        </View>
      )}
    </Screen>
  );
}

/** The prescription itself: doctor, consult, every line, and any vaccines prescribed with it. */
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

  return (
    <>
      {record.doctor ? (
        <Surface style={styles.doctor}>
          <DoctorAvatar name={record.doctor.name} size={48} />
          <View style={styles.flex}>
            <ThemedText type="bodyBold" numberOfLines={1}>
              {record.doctor.name}
            </ThemedText>
            {record.doctor.qualifications ? (
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                {record.doctor.qualifications}
              </ThemedText>
            ) : null}
            <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
              Reg.{' '}
              {[record.doctor.registrationNumber, record.doctor.council]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
          <BadgeCheck size={20} color={Colors.success} strokeWidth={2.2} />
        </Surface>
      ) : null}

      {record.consult ? (
        <Surface style={styles.consult}>
          <View style={styles.consultTop}>
            <IconTile icon={Video} tone="neutral" size={40} />
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {record.consult.specialty ? specialtyLabel(record.consult.specialty) : 'Consult'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                Video consult · {formatSlot(record.consult.scheduledAt)}
              </ThemedText>
            </View>
          </View>
          {record.consult.reason ? (
            <View style={styles.reason}>
              <ThemedText type="caption" themeColor="textMuted" style={styles.reasonLabel}>
                {readOnly ? 'Reason for the consult' : 'You asked about'}
              </ThemedText>
              <ThemedText type="small">{record.consult.reason}</ThemedText>
            </View>
          ) : null}
        </Surface>
      ) : null}

      <View style={styles.section}>
        <SectionHeader
          title="Medicines and advice"
          meta={
            record.prescription.items.length
              ? `${record.prescription.items.length} ${record.prescription.items.length === 1 ? 'line' : 'lines'}`
              : undefined
          }
        />
        <Surface style={styles.items}>
          {record.prescription.items.length ? (
            record.prescription.items.map((item, index) => (
              <View key={`${index}-${item}`} style={[styles.item, index > 0 && styles.divider]}>
                <View style={styles.number}>
                  <ThemedText style={styles.numberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.itemText}>{item}</ThemedText>
                {readOnly ? null : (
                  <Pressable
                    onPress={() => remind(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set a reminder for ${item}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.remind, pressed && styles.pressed]}>
                    <BellPlus size={14} color={Colors.primary} strokeWidth={2.4} />
                    <ThemedText type="caption" themeColor="primary" style={styles.remindText}>
                      Remind
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={styles.noItems}>
              The doctor did not add any lines to this prescription.
            </ThemedText>
          )}
        </Surface>
      </View>

      {record.vaccines.length ? (
        <View style={styles.section}>
          <SectionHeader title="Vaccines on this prescription" />
          <Surface style={styles.items}>
            {record.vaccines.map((vaccine, index) => (
              <Pressable
                key={vaccine.id}
                onPress={() => openRecord(vaccine.id)}
                accessibilityRole="button"
                accessibilityLabel={`${vaccine.title}. Opens the vaccine record`}
                style={({ pressed }) => [
                  styles.vaccine,
                  index > 0 && styles.divider,
                  pressed && styles.pressed,
                ]}>
                <IconTile icon={Syringe} tone="primary" size={40} />
                <View style={styles.flex}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {vaccine.title}
                  </ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                    {vaccine.subtitle.split(' · ').slice(1).join(' · ') || vaccine.subtitle}
                  </ThemedText>
                </View>
                {vaccine.tag ? <Tag label={vaccine.tag.label} tone={vaccine.tag.tone} /> : null}
                <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
              </Pressable>
            ))}
          </Surface>
        </View>
      ) : null}

      <View style={styles.note}>
        <Info size={16} color={Colors.inkMid} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          Take medicines exactly as written. Ask your doctor before changing or stopping one.
        </ThemedText>
      </View>

      {readOnly ? null : (
        <View style={styles.actions}>
          {record.doctor ? (
            <View style={styles.flex}>
              <Button
                label="Book follow-up"
                icon={CalendarPlus}
                onPress={() =>
                  router.push({
                    pathname: '/care/book/[doctorId]',
                    params: {
                      doctorId: record.doctor!.id,
                      ...(record.consult?.specialty && { specialty: record.consult.specialty }),
                    },
                  })
                }
              />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Button
              label="Ask Ekaay"
              variant="soft"
              icon={Sparkles}
              onPress={() => router.navigate('/ekaay')}
            />
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  flex: {
    flex: 1,
  },
  headerCard: {
    gap: Spacing.three - 4,
    padding: Spacing.three + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  skeletonHeader: {
    boxShadow: Shadows.card,
  },
  titleBlock: {
    gap: 4,
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 25,
    lineHeight: 31,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  metaText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
  },
  skeletonGap: {
    marginTop: 8,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  consult: {
    gap: Spacing.three - 4,
  },
  consultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  reason: {
    gap: 2,
    padding: 12,
    borderRadius: Radius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primaryLight,
    backgroundColor: Colors.background,
  },
  reasonLabel: {
    fontFamily: Fonts.semibold,
  },
  section: {
    gap: Spacing.three - 4,
    marginTop: Spacing.one,
  },
  items: {
    paddingVertical: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.successSoft,
  },
  numberText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.success,
  },
  itemText: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  noItems: {
    paddingVertical: 12,
  },
  remind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primarySoft,
  },
  remindText: {
    fontFamily: Fonts.bold,
  },
  vaccine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: 12,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.backgroundSelected,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
