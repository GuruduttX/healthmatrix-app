import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarClock,
  FileText,
  HeartPulse,
  Pill,
  Syringe,
  TriangleAlert,
  UserMinus,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { ArtDish } from '@/components/ui/dish';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Gutter, Radius, Spacing } from '@/constants/theme';
import { formatMemberId } from '@/features/card/sample-data';
import { DoctorAvatar } from '@/features/doctors/doctor-avatar';
import { specialtyLabel } from '@/features/doctors/specialties';
import { formatSlot } from '@/features/doctors/time';
import { type Appointment } from '@/features/doctors/types';
import { confirmRemove } from '@/features/family/confirm';
import { aboutLine } from '@/features/family/relations';
import { type FamilyOverview } from '@/features/family/types';
import { useFamily } from '@/features/family/use-family';
import { MemberAvatar } from '@/features/profile/member-avatar';
import { RecordRow, RecordTag } from '@/features/records/record-row';
import { describeDose, describeRepeat, formatTime } from '@/features/reminders/schedule';
import { api } from '@/services/api';

type Tab = 'records' | 'vaccines' | 'medicines' | 'consults';

/** Microsoft Fluent Emoji (MIT), as on Home's Today card; see assets/images/home/3d/LICENSE. */
const PILL = require('@/assets/images/home/3d/medicine.png');
const SYRINGE = require('@/assets/images/home/3d/syringe.png');

const PHOTO = 60;

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** A short note in place of an empty list. */
function Empty({ icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Surface style={styles.empty}>
      <IconTile icon={icon} tone="neutral" size={LIST_LEAD} />
      <ThemedText style={[listText.subtitle, styles.flex]}>{text}</ThemedText>
    </Surface>
  );
}

function ConsultRow({ consult }: { consult: Appointment }) {
  const doctor = consult.doctor?.name ?? 'Doctor';
  const ran =
    consult.startedAt && consult.endedAt
      ? Math.max(
          1,
          Math.round((Date.parse(consult.endedAt) - Date.parse(consult.startedAt)) / 60_000),
        )
      : null;
  const about = [specialtyLabel(consult.specialty), consult.reason].filter(Boolean).join(' · ');
  const when = `${formatSlot(consult.scheduledAt)}${ran ? ` · ${ran} min` : ''}`;

  return (
    <ListRow
      leading={<DoctorAvatar name={doctor} photoUrl={consult.doctor?.photoUrl} size={LIST_LEAD} />}
      title={doctor}
      subtitle={
        <View>
          <ThemedText style={listText.subtitle} numberOfLines={1}>
            {about}
          </ThemedText>
          <ThemedText style={styles.faint} numberOfLines={1}>
            {when}
          </ThemedText>
        </View>
      }
    />
  );
}

/** The page's shape while it loads: the member card, the tabs and a list. */
function MemberSkeleton() {
  return (
    <SkeletonGroup label="Loading their records" style={styles.skeleton}>
      <Surface style={styles.skeletonHeader}>
        <SkeletonCircle size={PHOTO} />
        <View style={[styles.flex, styles.skeletonText]}>
          <Skeleton width="65%" height={20} />
          <Skeleton width="45%" height={12} />
          <Skeleton width="50%" height={11} />
        </View>
      </Surface>
      <View style={styles.skeletonTabs}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={i ? 112 : 96} height={38} radius={Radius.pill} />
        ))}
      </View>
      <SkeletonList rows={3} leading="tile" trailing={false} />
    </SkeletonGroup>
  );
}

/**
 * A family member's health, read-only: who they are, allergies and conditions, then their
 * records, vaccines, medicines and consults on tabs. Opened from Family on the Card tab.
 */
export default function FamilyMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { removeLink } = useFamily();
  const [overview, setOverview] = useState<FamilyOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('records');
  const [removing, setRemoving] = useState(false);

  const load = useCallback(
    (isActive: () => boolean) =>
      api<FamilyOverview>(`/family/${id}`)
        .then((next) => {
          if (!isActive()) return;
          setOverview(next);
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Could not load their records');
        }),
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/card'));
  const openRecord = (recordId: string) =>
    router.push({ pathname: '/family/[id]/record/[recordId]', params: { id, recordId } });

  if (!overview) {
    return (
      <Screen onBack={back} backLabel="My card" barTitle="Family">
        {error ? (
          <ErrorState
            title="Couldn’t open this page"
            message={error}
            onRetry={() => void load(() => true)}
          />
        ) : (
          <MemberSkeleton />
        )}
      </Screen>
    );
  }

  const { member, health, records, vaccinations, medicines, consults } = overview;
  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const consultCount = consults.upcoming.length + consults.past.length;
  // The counts live on the tabs only, so no number shows twice.
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'records', label: 'Records', count: records.length },
    { id: 'vaccines', label: 'Vaccines', count: vaccinations.length },
    { id: 'medicines', label: 'Medicines', count: medicines.length },
    { id: 'consults', label: 'Consults', count: consultCount },
  ];
  const flags = [
    { label: 'Allergies', items: health.allergies, tone: 'danger', icon: TriangleAlert },
    { label: 'Conditions', items: health.conditions, tone: 'warning', icon: HeartPulse },
  ] as const;

  const remove = async () => {
    const ok = await confirmRemove(
      `Remove ${firstName} from your family?`,
      `You won’t see ${firstName}’s records any more. To add them again, they’ll need to share a new code.`,
      'Remove',
    );
    if (!ok) return;
    setRemoving(true);
    try {
      await removeLink(member.linkId);
      back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove them. Try again.');
      setRemoving(false);
    }
  };

  return (
    <Screen onRefresh={() => load(() => true)} onBack={back} backLabel="My card" barTitle="Family">
      {/* Who they are, and what anyone treating them should know first. */}
      <Surface style={styles.member}>
        <View style={styles.who}>
          <View style={styles.photoRing}>
            <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={PHOTO} />
          </View>
          <View style={styles.flex}>
            <ThemedText style={styles.name} accessibilityRole="header" numberOfLines={2}>
              {member.name}
            </ThemedText>
            <ThemedText style={styles.about} numberOfLines={1}>
              {aboutLine(member)}
            </ThemedText>
            <ThemedText style={styles.memberId} numberOfLines={1}>
              {formatMemberId(member.memberId)}
            </ThemedText>
          </View>
        </View>

        {flags.map(({ label, items, tone, icon }) =>
          items.length ? (
            <View key={label}>
              <View style={styles.rule} />
              <View style={styles.flagRow}>
                <ThemedText style={styles.flagLabel}>{label}</ThemedText>
                <View style={styles.flags}>
                  {items.map((item) => (
                    <Tag key={item} label={item} tone={tone} icon={icon} />
                  ))}
                </View>
              </View>
            </View>
          ) : null,
        )}
      </Surface>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabs}
        contentContainerStyle={styles.tabsContent}
        accessibilityRole="tablist">
        {tabs.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            count={item.count}
            selected={tab === item.id}
            onPress={() => setTab(item.id)}
          />
        ))}
      </ScrollView>

      {tab === 'records' ? (
        records.length ? (
          <ListCard>
            {records.map((record) => (
              <RecordRow key={record.id} record={record} onPress={() => openRecord(record.id)} />
            ))}
          </ListCard>
        ) : (
          <Empty
            icon={FileText}
            text={`No prescriptions or reports yet. They show up here when a doctor writes one for ${firstName}.`}
          />
        )
      ) : tab === 'vaccines' ? (
        vaccinations.length ? (
          <ListCard>
            {vaccinations.map((vaccination) => (
              <ListRow
                key={vaccination.id}
                leading={<ArtDish art={SYRINGE} artSize={21} />}
                title={vaccineTitle(vaccination.name)}
                subtitle={`${vaccination.givenDoses} of ${vaccination.totalDoses} given`}
                meta={<RecordTag tag={vaccination.tag} />}
                trailing={<Chevron />}
                onPress={() => openRecord(vaccination.id)}
                accessibilityLabel={`${vaccineTitle(vaccination.name)}, ${vaccination.givenDoses} of ${vaccination.totalDoses} given. ${vaccination.tag.label}. Opens the vaccine record.`}
              />
            ))}
          </ListCard>
        ) : (
          <Empty icon={Syringe} text={`No vaccines prescribed for ${firstName} yet.`} />
        )
      ) : tab === 'medicines' ? (
        medicines.length ? (
          <ListCard>
            {medicines.map((medicine) => (
              <ListRow
                key={medicine.id}
                leading={<ArtDish art={PILL} />}
                title={medicine.name}
                subtitle={
                  <View>
                    {describeDose(medicine) ? (
                      <ThemedText style={listText.subtitle} numberOfLines={1}>
                        {describeDose(medicine)}
                      </ThemedText>
                    ) : null}
                    <ThemedText style={styles.faint} numberOfLines={1}>
                      {describeRepeat(medicine)} · {medicine.times.map(formatTime).join(', ')}
                    </ThemedText>
                  </View>
                }
              />
            ))}
          </ListCard>
        ) : (
          <Empty icon={Pill} text={`${firstName} has no medicine reminders set.`} />
        )
      ) : consultCount ? (
        <>
          {consults.upcoming.length ? (
            <Section title="Upcoming">
              <ListCard>
                {consults.upcoming.map((consult) => (
                  <ConsultRow key={consult.id} consult={consult} />
                ))}
              </ListCard>
            </Section>
          ) : null}
          {consults.past.length ? (
            <Section title="Past" index={1}>
              <ListCard>
                {consults.past.map((consult) => (
                  <ConsultRow key={consult.id} consult={consult} />
                ))}
              </ListCard>
            </Section>
          ) : null}
        </>
      ) : (
        <Empty icon={CalendarClock} text={`${firstName} hasn’t had a video consult yet.`} />
      )}

      {/* Quiet, at the very end: removing someone is rare and never the page's point. */}
      <View style={styles.removeWrap}>
        <Pressable
          onPress={remove}
          disabled={removing}
          accessibilityRole="button"
          accessibilityState={{ disabled: removing, busy: removing }}
          hitSlop={6}
          style={({ pressed }) => [styles.remove, pressed && styles.removePressed]}>
          {removing ? (
            <ActivityIndicator size="small" color={Colors.high} />
          ) : (
            <UserMinus size={16} color={Colors.high} strokeWidth={2.3} />
          )}
          <ThemedText style={styles.removeText}>Remove {firstName} from your family</ThemedText>
        </Pressable>
        {error ? (
          <ThemedText style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </ThemedText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  member: {
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three - 2,
  },
  who: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
  },
  // A hairline ring around the photo, as on Home's family strip.
  photoRing: {
    padding: 2,
    borderRadius: PHOTO / 2 + 3,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  name: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: Colors.text,
  },
  about: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.textSoft,
  },
  memberId: {
    marginTop: 2,
    fontFamily: Fonts.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  // Runs edge to edge across the card, like the rule under Home's Today header.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.three - 4,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: Colors.hairline,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingTop: Spacing.three - 4,
  },
  flagLabel: {
    width: 84,
    paddingTop: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  flags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  // Bleeds to the screen edges so the chips scroll under the page's gutters; the vertical padding
  // leaves room for the chips' shadows, which the scroll view would otherwise clip.
  tabs: {
    flexGrow: 0,
    marginHorizontal: -Gutter,
    marginVertical: -Spacing.one - 2,
  },
  tabsContent: {
    gap: Spacing.two,
    paddingHorizontal: Gutter,
    paddingVertical: Spacing.one + 2,
  },
  faint: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three - 2,
  },
  removeWrap: {
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  removePressed: {
    backgroundColor: Colors.highSoft,
  },
  removeText: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.high,
  },
  error: {
    textAlign: 'center',
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.high,
  },
  skeleton: {
    gap: Spacing.four - 4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
  },
  skeletonText: {
    gap: 8,
  },
  skeletonTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
