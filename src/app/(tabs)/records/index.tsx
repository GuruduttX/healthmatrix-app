import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronRight, Plus, Search, Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/ui/chip';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { RecordRow } from '@/features/records/record-row';
import { sampleRecords, type RecordItem } from '@/features/records/sample-data';
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

const FILTERS: { id: string; label: string; types: RecordType[] | null }[] = [
  { id: 'all', label: 'All', types: null },
  { id: 'reports', label: 'Reports', types: ['pod_screening', 'lab_report'] },
  { id: 'prescriptions', label: 'Prescriptions', types: ['prescription'] },
  { id: 'vaccines', label: 'Vaccines', types: ['vaccination'] },
];

/** Newest first, grouped under "September 2026" style headings. */
function groupByMonth(records: RecordItem[]) {
  const groups: { heading: string; records: RecordItem[] }[] = [];
  for (const record of [...records].sort((a, b) => b.date.localeCompare(a.date))) {
    const [year, month] = record.date.split('-').map(Number);
    const heading = `${MONTHS[(month ?? 1) - 1]} ${year}`;
    const last = groups[groups.length - 1];
    if (last?.heading === heading) last.records.push(record);
    else groups.push({ heading, records: [record] });
  }
  return groups;
}

export default function RecordsScreen() {
  const [query, setQuery] = useState('');
  const [filterId, setFilterId] = useState('all');

  const types = FILTERS.find((filter) => filter.id === filterId)?.types ?? null;
  const needle = query.trim().toLowerCase();
  const visible = sampleRecords.filter(
    (record) =>
      (!types || types.includes(record.type)) &&
      (!needle || `${record.title} ${record.subtitle}`.toLowerCase().includes(needle)),
  );
  const groups = groupByMonth(visible);
  const attention = sampleRecords.reduce((sum, record) => sum + (record.attentionCount ?? 0), 0);

  return (
    <Screen
      title="Records"
      floating={
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Plus size={18} color={Colors.onInk} strokeWidth={2.6} />
          <ThemedText type="smallBold" themeColor="onInk">
            Add records
          </ThemedText>
        </Pressable>
      }>
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

      {attention > 0 ? (
        <Pressable
          onPress={() => router.navigate('/ekaay')}
          accessibilityRole="button"
          style={({ pressed }) => pressed && styles.pressed}>
          <LinearGradient
            colors={[Colors.primarySoft, Colors.backgroundElement]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.summary}>
            <LinearGradient
              colors={[Colors.primaryMid, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryBadge}>
              <Sparkles size={14} color={Colors.onInk} strokeWidth={2.2} />
            </LinearGradient>
            <View style={styles.summaryText}>
              <ThemedText type="smallBold">
                Ekaay has read {sampleRecords.length} records
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {attention} values need attention. Ask what they mean.
              </ThemedText>
            </View>
            <ChevronRight size={18} color={Colors.primary} strokeWidth={2.2} />
          </LinearGradient>
        </Pressable>
      ) : null}

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

      {groups.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText type="bodyBold">No records found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Try a different search or filter.
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
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
  },
  summaryBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
  },
  group: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  pressed: {
    opacity: 0.85,
  },
});
