import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { sampleRecordDetails } from '@/features/records/record-details';
import { MONTHS_SHORT } from '@/features/records/record-row';
import { sampleRecords } from '@/features/records/sample-data';
import { ValueRow } from '@/features/records/value-row';

function formatDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]} ${year}`;
}

/** One record opened up: each value on its range, with Ekaay's plain-language read. */
export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const record = sampleRecords.find((item) => item.id === id);
  const detail = id ? sampleRecordDetails[id] : undefined;

  const values = detail?.values ?? [];
  const attention = values.filter((value) => value.status.tone !== 'success').length;

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

      {record ? (
        <>
          <View>
            <ThemedText type="title" style={styles.title}>
              {detail?.title ?? record.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatDate(record.date)}, {detail?.source ?? record.subtitle}
            </ThemedText>
          </View>

          {detail ? (
            <>
              <Tag
                label={
                  attention > 0
                    ? `${attention} of ${values.length} values need attention`
                    : `All ${values.length} values are normal`
                }
                tone={attention > 0 ? 'warning' : 'success'}
              />

              <Surface style={styles.values}>
                {values.map((value, index) => (
                  <ValueRow key={value.id} item={value} divided={index > 0} />
                ))}
              </Surface>

              <View style={styles.explains}>
                <View style={styles.explainsHeader}>
                  <Sparkles size={16} color={Colors.primary} strokeWidth={2.2} />
                  <ThemedText type="smallBold" themeColor="primary">
                    Ekaay explains
                  </ThemedText>
                </View>
                <ThemedText style={styles.explainsText}>{detail.explanation}</ThemedText>
              </View>
            </>
          ) : (
            <Surface style={styles.pending}>
              <ThemedText type="smallBold">No values to show yet</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Ekaay has not pulled test values out of this record. You can still share it or ask
                about it.
              </ThemedText>
            </Surface>
          )}

          <View style={styles.actions}>
            <Button label={`Share with ${detail?.shareWith ?? 'a doctor'}`} icon={Share2} />
            <Button
              label="Ask a question"
              variant="secondary"
              onPress={() => router.navigate('/ekaay')}
            />
          </View>
        </>
      ) : (
        <View style={styles.missing}>
          <ThemedText type="bodyBold">Record not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            It may have been removed.
          </ThemedText>
        </View>
      )}
    </Screen>
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
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  values: {
    paddingVertical: Spacing.one,
    marginTop: Spacing.one,
  },
  explains: {
    gap: Spacing.one,
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  explainsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explainsText: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  pending: {
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  missing: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.five,
  },
});
