import { router, useFocusEffect } from 'expo-router';
import { FileText, Search, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { RecordRow } from '@/features/records/record-row';
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

/** The member's records timeline: prescriptions for now; reports and vaccines are coming. */
export default function RecordsScreen() {
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');
  const [records, setRecords] = useState<RecordSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    api<{ records: RecordSummary[] }>('/records')
      .then(({ records: list }) => {
        if (!active) return;
        setRecords(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load your records');
      });
    return () => {
      active = false;
    };
  }, []);

  // Every visit picks up what doctors have added since.
  useFocusEffect(load);

  const filter = FILTERS.find((item) => item.id === filterId) ?? FILTERS[0]!;
  const needle = query.trim().toLowerCase();
  const visible = (records ?? []).filter(
    (record) =>
      (!filter.types || filter.types.includes(record.type)) &&
      (!needle ||
        `${record.title} ${record.subtitle} ${record.keywords}`.toLowerCase().includes(needle)),
  );
  const groups = groupByMonth(visible);

  return (
    <Screen title="Records">
      <View style={styles.search}>
        <Search size={18} color={Colors.textMuted} strokeWidth={2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search reports, doctors, medicines"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
            <X size={18} color={Colors.textMuted} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.id}
            label={filter.label}
            selected={filter.id === filterId}
            onPress={() => setFilterId(filter.id)}
          />
        ))}
      </ScrollView>

      {groups.map((group) => (
        <View key={group.heading} style={styles.group}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            {group.heading}
          </ThemedText>
          <View>
            {group.records.map((record, index) => (
              <RecordRow
                key={record.id}
                record={record}
                isLast={index === group.records.length - 1}
                onPress={() =>
                  router.push({ pathname: '/records/[id]', params: { id: record.id } })
                }
              />
            ))}
          </View>
        </View>
      ))}

      {!records ? (
        <View style={styles.empty}>
          {error ? (
            <>
              <ThemedText type="small" themeColor="danger" style={styles.emptyText}>
                {error}
              </ThemedText>
              <Button label="Try again" variant="secondary" onPress={load} />
            </>
          ) : (
            <ActivityIndicator color={Colors.textSecondary} />
          )}
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <FileText size={24} color={Colors.textMuted} strokeWidth={2} />
          </View>
          <ThemedText type="bodyBold">
            {needle ? 'No records found' : 'Nothing here yet'}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            {needle ? 'Try a different search or filter.' : filter.empty}
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
  },
  // Bleed to the screen edges so chips scroll under the page padding.
  filters: {
    flexGrow: 0,
    marginHorizontal: -Spacing.three,
  },
  filtersContent: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  group: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  emptyText: {
    textAlign: 'center',
  },
});
