import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  CalendarCheck,
  CalendarClock,
  ChevronRight,
  HeartPulse,
  Pill,
  Syringe,
  TriangleAlert,
  UserMinus,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ErrorState } from '@/components/ui/empty-state';
import { HeroBackground } from '@/components/ui/hero-background';
import { IconTile } from '@/components/ui/icon-tile';
import { Skeleton, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
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
import { RecordRow } from '@/features/records/record-row';
import { describeDose, describeRepeat, formatTime } from '@/features/reminders/schedule';
import { api } from '@/services/api';

type Tab = 'records' | 'vaccines' | 'medicines' | 'consults';

const vaccineTitle = (name: string) => (/vaccin/i.test(name) ? name : `${name} vaccine`);

/** A short note in place of an empty list. */
function Empty({ icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Surface style={styles.empty}>
      <IconTile icon={icon} tone="neutral" />
      <ThemedText type="small" themeColor="textSecondary" style={styles.flex}>
        {text}
      </ThemedText>
    </Surface>
  );
}

/** A tappable row inside a list card. */
function Row({
  first,
  onPress,
  children,
}: {
  first: boolean;
  onPress?: () => void;
  children: ReactNode;
}) {
  const body = <View style={[styles.row, !first && styles.divider]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  );
}

function ConsultRow({ consult, first }: { consult: Appointment; first: boolean }) {
  const doctor = consult.doctor?.name ?? 'Doctor';
  const ran =
    consult.startedAt && consult.endedAt
      ? Math.max(
          1,
          Math.round((Date.parse(consult.endedAt) - Date.parse(consult.startedAt)) / 60_000),
        )
      : null;
  return (
    <Row first={first}>
      <DoctorAvatar name={doctor} photoUrl={consult.doctor?.photoUrl} size={40} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {doctor}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {specialtyLabel(consult.specialty)}
          {consult.reason ? ` · ${consult.reason}` : ''}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted">
          {formatSlot(consult.scheduledAt)}
          {ran ? ` · ${ran} min` : ''}
        </ThemedText>
      </View>
    </Row>
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
          <SkeletonGroup label="Loading their records" style={styles.stack}>
            <Skeleton height={190} radius={Radius.xl} />
            <View style={styles.skeletonTabs}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} width={104} height={38} radius={Radius.pill} />
              ))}
            </View>
            <SkeletonList rows={3} leading="tile" />
          </SkeletonGroup>
        )}
      </Screen>
    );
  }

  const { member, health, records, vaccinations, medicines, consults } = overview;
  const firstName = member.name.split(/\s+/)[0] ?? member.name;
  const consultCount = consults.upcoming.length + consults.past.length;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'records', label: 'Records', count: records.length },
    { id: 'vaccines', label: 'Vaccines', count: vaccinations.length },
    { id: 'medicines', label: 'Medicines', count: medicines.length },
    { id: 'consults', label: 'Consults', count: consultCount },
  ];

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
    <Screen
      onRefresh={() => load(() => true)}
      onBack={back}
      backLabel="My card"
      barTitle={firstName}>
      <View style={styles.stack}>
        {/* The same dark card as the tabs' headers: a View clips, the gradient is a layer. */}
        <View style={styles.hero}>
          <HeroBackground />
          <View style={styles.heroTop}>
            <View style={styles.avatarRing}>
              <MemberAvatar name={member.name} photoUrl={member.photoUrl} size={68} />
            </View>
            <View style={styles.flex}>
              <ThemedText style={styles.heroName} numberOfLines={2}>
                {member.name}
              </ThemedText>
              <ThemedText type="small" style={styles.heroMuted}>
                {aboutLine(member)}
              </ThemedText>
              <ThemedText type="caption" style={styles.heroFaint}>
                {formatMemberId(member.memberId)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.stats}>
            {tabs.map((item) => (
              <View key={item.id} style={styles.stat}>
                <ThemedText style={styles.statValue}>{item.count}</ThemedText>
                <ThemedText style={styles.statLabel}>{item.label}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {health.allergies.length || health.conditions.length ? (
          <Surface style={styles.health}>
            {health.allergies.length ? (
              <View style={styles.healthRow}>
                <TriangleAlert size={15} color={Colors.danger} strokeWidth={2.4} />
                <ThemedText type="smallBold" style={styles.healthLabel}>
                  Allergies
                </ThemedText>
                <View style={styles.tags}>
                  {health.allergies.map((allergy) => (
                    <Tag key={allergy} label={allergy} tone="danger" />
                  ))}
                </View>
              </View>
            ) : null}
            {health.conditions.length ? (
              <View style={styles.healthRow}>
                <HeartPulse size={15} color={Colors.warning} strokeWidth={2.4} />
                <ThemedText type="smallBold" style={styles.healthLabel}>
                  Conditions
                </ThemedText>
                <View style={styles.tags}>
                  {health.conditions.map((condition) => (
                    <Tag key={condition} label={condition} tone="warning" />
                  ))}
                </View>
              </View>
            ) : null}
          </Surface>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
          accessibilityRole="tablist">
          {tabs.map((item) => (
            <Chip
              key={item.id}
              label={item.count ? `${item.label} · ${item.count}` : item.label}
              selected={tab === item.id}
              onPress={() => setTab(item.id)}
            />
          ))}
        </ScrollView>

        {tab === 'records' ? (
          records.length ? (
            <View>
              {records.map((record, index) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  isLast={index === records.length - 1}
                  onPress={() => openRecord(record.id)}
                />
              ))}
            </View>
          ) : (
            <Empty
              icon={Pill}
              text={`No prescriptions or reports yet. They show up here when a doctor writes one for ${firstName}.`}
            />
          )
        ) : tab === 'vaccines' ? (
          vaccinations.length ? (
            <Surface style={styles.list}>
              {vaccinations.map((vaccination, index) => {
                const next = vaccination.doses.find((dose) => dose.status !== 'given');
                return (
                  <Row
                    key={vaccination.id}
                    first={index === 0}
                    onPress={() => openRecord(vaccination.id)}>
                    <IconTile
                      icon={Syringe}
                      tone={next?.status === 'overdue' ? 'danger' : next ? 'primary' : 'success'}
                      size={40}
                    />
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {vaccineTitle(vaccination.name)}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        {vaccination.givenDoses} of {vaccination.totalDoses} given
                      </ThemedText>
                      <View style={styles.rowTag}>
                        <Tag label={vaccination.tag.label} tone={vaccination.tag.tone} />
                      </View>
                    </View>
                    <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
                  </Row>
                );
              })}
            </Surface>
          ) : (
            <Empty icon={Syringe} text={`No vaccines prescribed for ${firstName} yet.`} />
          )
        ) : tab === 'medicines' ? (
          medicines.length ? (
            <Surface style={styles.list}>
              {medicines.map((medicine, index) => (
                <Row key={medicine.id} first={index === 0}>
                  <IconTile icon={Pill} tone="success" size={40} />
                  <View style={styles.flex}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {medicine.name}
                    </ThemedText>
                    {describeDose(medicine) ? (
                      <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
                        {describeDose(medicine)}
                      </ThemedText>
                    ) : null}
                    <ThemedText type="caption" themeColor="textMuted" numberOfLines={2}>
                      {describeRepeat(medicine)} · {medicine.times.map(formatTime).join(', ')}
                    </ThemedText>
                  </View>
                </Row>
              ))}
            </Surface>
          ) : (
            <Empty icon={Pill} text={`${firstName} has no medicine reminders set.`} />
          )
        ) : consultCount ? (
          <View style={styles.consults}>
            {consults.upcoming.length ? (
              <View style={styles.group}>
                <View style={styles.groupTitle}>
                  <CalendarClock size={14} color={Colors.primary} strokeWidth={2.4} />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Upcoming
                  </ThemedText>
                </View>
                <Surface style={styles.list}>
                  {consults.upcoming.map((consult, index) => (
                    <ConsultRow key={consult.id} consult={consult} first={index === 0} />
                  ))}
                </Surface>
              </View>
            ) : null}
            {consults.past.length ? (
              <View style={styles.group}>
                <View style={styles.groupTitle}>
                  <CalendarCheck size={14} color={Colors.success} strokeWidth={2.4} />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Past
                  </ThemedText>
                </View>
                <Surface style={styles.list}>
                  {consults.past.map((consult, index) => (
                    <ConsultRow key={consult.id} consult={consult} first={index === 0} />
                  ))}
                </Surface>
              </View>
            ) : null}
          </View>
        ) : (
          <Empty icon={CalendarClock} text={`${firstName} hasn’t had a video consult yet.`} />
        )}

        <View style={styles.removeWrap}>
          <Button
            label={`Remove ${firstName} from your family`}
            variant="danger"
            icon={UserMinus}
            loading={removing}
            onPress={remove}
          />
        </View>
        {error ? (
          <ThemedText type="caption" themeColor="danger" style={styles.center}>
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
  center: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  stack: {
    gap: Spacing.three,
  },
  skeletonTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hero: {
    gap: Spacing.three,
    padding: Spacing.three + 2,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.ink,
  },
  removeWrap: {
    marginTop: Spacing.three,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroName: {
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 27,
    color: Colors.onInk,
  },
  heroMuted: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroFaint: {
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  stats: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: Spacing.two + 2,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 24,
    color: Colors.onInk,
  },
  statLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  health: {
    gap: Spacing.two + 2,
  },
  healthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  healthLabel: {
    width: 76,
  },
  tags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tabs: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 12,
  },
  rowTag: {
    marginTop: 4,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  consults: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  groupTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
