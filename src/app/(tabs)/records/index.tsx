import { router, useFocusEffect } from 'expo-router';
import { FileText, Search, SearchX, Stethoscope, X } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Chip } from '@/components/ui/chip';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { ListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton';
import { Colors, Fonts, Gutter, Radius, Shadows, Spacing } from '@/constants/theme';
import { RecordRow, RecordRowSkeleton } from '@/features/records/record-row';
import { type RecordSummary } from '@/features/records/types';
import { api } from '@/services/api';
import { type RecordType } from '@/types';

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

const FILTERS: { id: string; label: string; types: RecordType[] | null; empty: string }[] = [
  {
    id: 'all',
    label: 'All',
    types: null,
    empty: 'Prescriptions from your doctors will appear here after each consult.',
  },
  {
    id: 'reports',
    label: 'Reports',
    types: ['pod_screening', 'lab_report'],
    empty: 'Lab and pod reports will appear here soon.',
  },
  {
    id: 'prescriptions',
    label: 'Prescriptions',
    types: ['prescription'],
    empty: 'Prescriptions from your doctors will appear here after each consult.',
  },
  {
    id: 'vaccines',
    label: 'Vaccines',
    types: ['vaccination'],
    empty: 'Vaccination records will appear here soon.',
  },
];

/** Newest first, grouped under "September 2026" style headings. */
function groupByMonth(records: RecordSummary[]) {
  const groups: { heading: string; records: RecordSummary[] }[] = [];
  for (const record of [...records].sort((a, b) => b.at.localeCompare(a.at))) {
    const [year, month] = record.date.split('-').map(Number);
    const heading = `${MONTHS[(month ?? 1) - 1]} ${year}`;
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.records.push(record);
    else groups.push({ heading, records: [record] });
  }
  return groups;
}

/** The timeline's shape while it loads: a month heading and a card of four rows. */
function TimelineSkeleton() {
  return (
    <SkeletonGroup label="Loading your records" style={styles.group}>
      <Skeleton width={150} height={20} />
      <ListCard>
        {[0, 1, 2, 3].map((i) => (
          <RecordRowSkeleton key={i} wide={i % 2 === 0} />
        ))}
      </ListCard>
    </SkeletonGroup>
  );
}

/** The member's records timeline: prescriptions for now; reports and vaccines are coming. */
export default function RecordsScreen() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [filterId, setFilterId] = useState('all');
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** `isActive` drops the answer once the screen has moved on. */
  const load = useCallback(
    (isActive: () => boolean) =>
      api<{ records: RecordSummary[] }>('/records')
        .then(({ records: list }) => {
          if (!isActive()) return;
          setRecords(list);
          setError(null);
        })
        .catch((e: unknown) => {
          if (isActive()) setError(e instanceof Error ? e.message : 'Could not load your records');
        }),
    [],
  );

  // Every visit picks up what doctors have added since.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load(() => active);
      return () => {
        active = false;
      };
    }, [load]),
  );

  const filter = FILTERS.find((item) => item.id === filterId) ?? FILTERS[0]!;
  const needle = query.trim().toLowerCase();
  const visible = (records ?? []).filter(
    (record) =>
      (!filter.types || filter.types.includes(record.type)) &&
      (!needle ||
        `${record.title} ${record.subtitle} ${record.keywords}`.toLowerCase().includes(needle)),
  );
  const groups = groupByMonth(visible);
  const countOf = (types: RecordType[] | null) =>
    (records ?? []).filter((record) => !types || types.includes(record.type)).length;

  const reset = () => {
    setQuery('');
    setFilterId('all');
  };

  let body: ReactNode;
  if (!records) {
    body = error ? (
      <ErrorState
        title="Couldn’t load your records"
        message={error}
        onRetry={() => void load(() => true)}
      />
    ) : (
      <TimelineSkeleton />
    );
  } else if (!records.length) {
    body = (
      <EmptyState
        icon={FileText}
        title="No records yet"
        body={FILTERS[0]!.empty}
        action={{ label: 'Find a doctor', icon: Stethoscope, onPress: () => router.navigate('/care') }}
      />
    );
  } else if (!groups.length) {
    body = needle ? (
      <EmptyState
        icon={SearchX}
        tone="neutral"
        title={`Nothing matches “${query.trim()}”`}
        body="Try another word, like a doctor’s name or a medicine."
        action={{ label: 'Clear search', icon: X, onPress: reset }}
      />
    ) : (
      <EmptyState
        icon={FileText}
        tone="neutral"
        title={`No ${filter.label.toLowerCase()} yet`}
        body={filter.empty}
        action={{ label: 'Show all records', onPress: () => setFilterId('all') }}
      />
    );
  } else {
    // A month per card, as on Home: the heading names it, the card holds its records.
    body = groups.map((group, index) => (
      <Section
        key={group.heading}
        title={group.heading}
        meta={group.records.length === 1 ? '1 record' : `${group.records.length} records`}
        index={index}>
        <ListCard>
          {group.records.map((record) => (
            <RecordRow
              key={record.id}
              record={record}
              onPress={() => router.push({ pathname: '/records/[id]', params: { id: record.id } })}
            />
          ))}
        </ListCard>
      </Section>
    ));
  }

  return (
    <Screen
      hero
      title="Records"
      subtitle="Prescriptions, reports and vaccines, in one timeline."
      onRefresh={() => load(() => true)}
      heroContent={
        <View style={styles.tools}>
          <View style={[styles.search, searching && styles.searchFocused]}>
            <Search size={18} color={Colors.textFaint} strokeWidth={2.2} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              onFocus={() => setSearching(true)}
              onBlur={() => setSearching(false)}
              placeholder="Search reports, doctors, medicines"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.primary}
              returnKeyType="search"
              autoCorrect={false}
              accessibilityLabel="Search records"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable
                onPress={() => setQuery('')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
                <X size={13} color={Colors.textSoft} strokeWidth={2.8} />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.filters}
            contentContainerStyle={styles.filtersContent}>
            {FILTERS.map((item) => (
              <Chip
                key={item.id}
                label={item.label}
                count={records ? countOf(item.types) : undefined}
                selected={item.id === filterId}
                onPress={() => setFilterId(item.id)}
              />
            ))}
          </ScrollView>
        </View>
      }>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tools: {
    gap: Spacing.three - 4,
  },
  // A white field with a hairline, lifted as little as Home's round header buttons.
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 48,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.three - 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  searchFocused: {
    borderColor: Colors.primaryLight,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    // The field draws its own focus edge; no second outline from the browser on web.
    outlineStyle: 'solid',
    outlineWidth: 0,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  clear: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
  },
  pressed: {
    opacity: 0.6,
  },
  // Bleeds to the screen edges so the chips scroll under the page's gutters; the vertical padding
  // leaves room for the chips' shadows, which the scroll view would otherwise clip.
  filters: {
    flexGrow: 0,
    marginHorizontal: -Gutter,
    marginVertical: -Spacing.one - 2,
  },
  filtersContent: {
    gap: Spacing.two,
    paddingHorizontal: Gutter,
    paddingVertical: Spacing.one + 2,
  },
  group: {
    gap: Spacing.three - 2,
  },
});
