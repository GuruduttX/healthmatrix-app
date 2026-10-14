import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp, FileText, FlaskConical, Info, Stethoscope } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListCard, ListRow, listText } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { api } from '@/services/api';

import { type ScreeningRecord } from './types';
import { ValueRow } from './value-row';

type ScreeningDetailProps = {
  record: ScreeningRecord;
  /** A family member's record: no report download or booking a doctor, and "their" wording. */
  readOnly?: boolean;
};

/**
 * A pod screening: each reading on its range under the health check it came with, then the PDF
 * report, the pathologist's note and a doctor to talk it through. Not a diagnosis.
 */
export function ScreeningDetail({ record, readOnly }: ScreeningDetailProps) {
  const { screening } = record;
  const [opening, setOpening] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [showDisclaimers, setShowDisclaimers] = useState(false);

  // Mobilab's links last about an hour, so a fresh one is asked for each time.
  const openReport = async () => {
    setOpening(true);
    setReportError(null);
    try {
      const { url } = await api<{ url: string }>(`/records/${record.id}/report`);
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : 'Could not open the report');
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      {screening.isSample ? (
        <View style={styles.sample}>
          <Tag label="Sample values" tone="warning" icon={FlaskConical} />
          <ThemedText style={[styles.noteText, styles.flex]}>
            From a test booking: made up by the lab system, not a real reading.
          </ThemedText>
        </View>
      ) : null}

      {screening.groups.map((group, index) => (
        <Section
          key={group.title}
          title={group.title}
          meta={`${group.values.length} ${group.values.length === 1 ? 'test' : 'tests'}`}
          index={index + 1}>
          <View style={styles.card}>
            {group.values.map((value, i) => (
              <ValueRow key={value.id} item={value} divided={i > 0} />
            ))}
          </View>
        </Section>
      ))}

      {screening.remarks ? (
        <Section title="Pathologist’s note" index={screening.groups.length + 1}>
          <View style={[styles.card, styles.remarks]}>
            <ThemedText style={styles.remarksText}>{screening.remarks}</ThemedText>
          </View>
        </Section>
      ) : null}

      {!readOnly ? (
        <Section title="Report and next steps" index={screening.groups.length + 2}>
          <ListCard>
            {screening.hasReport ? (
              <ListRow
                leading={<IconTile icon={FileText} size={LIST_LEAD} />}
                title="Lab report (PDF)"
                subtitle={
                  <ThemedText
                    style={[listText.subtitle, reportError && styles.error]}
                    numberOfLines={2}>
                    {opening ? 'Opening…' : (reportError ?? `From ${screening.provider}`)}
                  </ThemedText>
                }
                trailing={<Chevron />}
                onPress={opening ? undefined : () => void openReport()}
                accessibilityLabel="Open the lab report as a PDF"
              />
            ) : null}
            <ListRow
              leading={<IconTile icon={Stethoscope} size={LIST_LEAD} />}
              title="Talk to a doctor"
              subtitle="Go through these results on a video consult"
              trailing={<Chevron />}
              onPress={() =>
                router.push({
                  pathname: '/care/doctors/[specialty]',
                  params: { specialty: 'general_medicine' },
                })
              }
            />
          </ListCard>
        </Section>
      ) : null}

      <View style={styles.note}>
        <View style={styles.noteIcon}>
          <Info size={14} color={Colors.textFaint} strokeWidth={2.2} />
        </View>
        <ThemedText style={[styles.noteText, styles.flex]}>
          Not a diagnosis. Values are compared with the lab’s ranges for{' '}
          {readOnly ? 'their' : 'your'} age and gender; a doctor can say what they mean for{' '}
          {readOnly ? 'them' : 'you'}.
        </ThemedText>
      </View>

      {screening.disclaimers.length ? (
        <View style={styles.disclaimers}>
          <Pressable
            onPress={() => setShowDisclaimers((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showDisclaimers }}
            hitSlop={6}
            style={({ pressed }) => [styles.disclaimersToggle, pressed && styles.pressed]}>
            <ThemedText style={styles.disclaimersLabel}>
              Lab disclaimers ({screening.disclaimers.length})
            </ThemedText>
            {showDisclaimers ? (
              <ChevronUp size={15} color={Colors.textFaint} strokeWidth={2.4} />
            ) : (
              <ChevronDown size={15} color={Colors.textFaint} strokeWidth={2.4} />
            )}
          </Pressable>
          {showDisclaimers
            ? screening.disclaimers.map((line, i) => (
                <ThemedText key={i} style={styles.noteText}>
                  • {line}
                </ThemedText>
              ))
            : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  // A white card for the value rows, which draw their own dividers.
  card: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  remarks: {
    paddingVertical: Spacing.three,
  },
  remarksText: {
    fontFamily: Fonts.medium,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.text,
  },
  error: {
    color: Colors.high,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingHorizontal: Spacing.one,
  },
  noteIcon: {
    paddingTop: 1.5,
  },
  noteText: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  disclaimers: {
    gap: 6,
    paddingHorizontal: Spacing.one,
  },
  disclaimersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  disclaimersLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
