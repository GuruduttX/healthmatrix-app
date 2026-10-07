import { router, useLocalSearchParams } from 'expo-router';
import {
  BadgeCheck,
  BellPlus,
  CalendarPlus,
  ChevronLeft,
  Info,
  Sparkles,
  Stethoscope,
  Syringe,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot } from '@/features/doctors/time';
import { MONTHS_SHORT } from '@/features/records/record-row';
import { type OpenRecord, type PrescriptionRecord } from '@/features/records/types';
import { VaccineDetail } from '@/features/vaccines/vaccine-detail';
import { api } from '@/services/api';

/** "2026-10-06" -> "6 Oct 2026" */
function formatDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
}

/** One record opened up: a prescription with every line on it, or a vaccine with its doses. */
export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<OpenRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api<{ record: OpenRecord }>(`/records/${id}`)
      .then(({ record: next }) => {
        if (active) setRecord(next);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not open this record');
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <Screen>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/records'))}
        accessibilityRole="button"
        accessibilityLabel="Back to Records"
        hitSlop={10}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <ChevronLeft size={16} color={Colors.textSecondary} strokeWidth={2.2} />
        <ThemedText type="small" themeColor="textSecondary">
          Records
        </ThemedText>
      </Pressable>

      {!record ? (
        <View style={styles.missing}>
          {error ? (
            <>
              <ThemedText type="bodyBold">Record not found</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            </>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
          )}
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              {record.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {record.type === 'vaccination' ? 'Prescribed ' : ''}
              {formatDate(record.date)}
              {record.type === 'vaccination'
                ? record.vaccination.doctor
                  ? ` · ${record.vaccination.doctor.name}`
                  : ''
                : record.doctor
                  ? ` · ${record.doctor.name}`
                  : ''}
            </ThemedText>
            {record.type === 'prescription' && record.prescription.status === 'signed' ? (
              <Tag label="Digitally signed by your doctor" tone="success" icon={BadgeCheck} />
            ) : null}
          </View>

          {record.type === 'vaccination' ? (
            <VaccineDetail
              vaccination={record.vaccination}
              onChange={(vaccination) =>
                setRecord({ ...record, vaccination, tag: vaccination.tag })
              }
            />
          ) : (
            <PrescriptionBody record={record} />
          )}
        </>
      )}
    </Screen>
  );
}

/** The prescription itself: doctor, consult, every line, and any vaccines prescribed with it. */
function PrescriptionBody({ record }: { record: PrescriptionRecord }) {
  const remind = (item: string) =>
    router.push({ pathname: '/care/medicine/[id]', params: { id: 'new', name: item } });

  return (
    <>
      {record.doctor ? (
        <Surface style={styles.doctor}>
          <DoctorAvatar name={record.doctor.name} size={48} />
          <View style={styles.flex}>
            <ThemedText type="bodyBold">{record.doctor.name}</ThemedText>
            {record.doctor.qualifications ? (
              <ThemedText type="caption" themeColor="textSecondary">
                {record.doctor.qualifications}
              </ThemedText>
            ) : null}
            <ThemedText type="caption" themeColor="textMuted">
              Reg.{' '}
              {[record.doctor.registrationNumber, record.doctor.council]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
          </View>
        </Surface>
      ) : null}

      {record.consult ? (
        <Surface style={styles.consult}>
          <View style={styles.consultRow}>
            <Stethoscope size={16} color={Colors.textSecondary} strokeWidth={2.2} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
              {record.consult.specialty ? specialtyLabel(record.consult.specialty) : 'Consult'} ·
              video consult
            </ThemedText>
          </View>
          <ThemedText type="smallBold">{formatSlot(record.consult.scheduledAt)}</ThemedText>
          {record.consult.reason ? (
            <ThemedText type="small" themeColor="textSecondary">
              You asked about: {record.consult.reason}
            </ThemedText>
          ) : null}
        </Surface>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Medicines and advice
        </ThemedText>
        <Surface style={styles.items}>
          {record.prescription.items.length ? (
            record.prescription.items.map((item, index) => (
              <View key={`${index}-${item}`} style={[styles.item, index > 0 && styles.divider]}>
                <View style={styles.number}>
                  <ThemedText style={styles.numberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.itemText}>{item}</ThemedText>
                <Pressable
                  onPress={() => remind(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`Set a reminder for ${item}`}
                  hitSlop={6}
                  style={({ pressed }) => [styles.remind, pressed && styles.pressed]}>
                  <BellPlus size={15} color={Colors.primary} strokeWidth={2.2} />
                  <ThemedText type="caption" themeColor="primary" style={styles.remindText}>
                    Remind me
                  </ThemedText>
                </Pressable>
              </View>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              The doctor did not add any lines to this prescription.
            </ThemedText>
          )}
        </Surface>
      </View>

      {record.vaccines.length ? (
        <View style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Vaccines on this prescription
          </ThemedText>
          {record.vaccines.map((vaccine) => (
            <Pressable
              key={vaccine.id}
              onPress={() => router.push({ pathname: '/records/[id]', params: { id: vaccine.id } })}
              accessibilityRole="button"
              style={({ pressed }) => pressed && styles.pressed}>
              <Surface style={styles.vaccine}>
                <IconTile icon={Syringe} tone="primary" />
                <View style={styles.flex}>
                  <ThemedText type="smallBold">{vaccine.title}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {vaccine.subtitle.split(' · ').slice(1).join(' · ') || vaccine.subtitle}
                  </ThemedText>
                </View>
                {vaccine.tag ? <Tag label={vaccine.tag.label} tone={vaccine.tag.tone} /> : null}
              </Surface>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.note}>
        <Info size={15} color={Colors.textSecondary} strokeWidth={2.2} />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.flex}>
          Take medicines exactly as written. Ask your doctor before changing or stopping one.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        {record.doctor ? (
          <Button
            label="Book a follow-up"
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
        ) : null}
        <Button
          label="Ask Ekaay"
          variant="secondary"
          icon={Sparkles}
          onPress={() => router.navigate('/ekaay')}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
  flex: {
    flex: 1,
  },
  header: {
    gap: Spacing.one + 2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    marginTop: Spacing.one,
  },
  consult: {
    gap: 4,
  },
  consultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  items: {
    paddingVertical: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 12,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  number: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  remind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primarySoft,
  },
  remindText: {
    fontFamily: Fonts.bold,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  vaccine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  missing: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
  },
});
