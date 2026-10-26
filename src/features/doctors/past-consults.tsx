import { router } from 'expo-router';
import { CalendarX, FileText, RotateCcw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LIST_LEAD, ListRow, listText } from '@/components/ui/list';
import { Colors, Fonts } from '@/constants/theme';

import { LinkButton, LinkRow } from './consult-actions';
import { DoctorAvatar } from './doctor-avatar';
import { specialtyLabel } from './specialties';
import { formatSlot } from './time';
import { type PastConsult } from './types';

/** How long the call ran, from the doctor starting it to ending it: "18 min". */
function duration({ startedAt, endedAt }: PastConsult) {
  if (!startedAt || !endedAt) return null;
  const minutes = Math.max(1, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/**
 * One past consult, as a row for a `ListCard`: a finished one with its prescription, or a missed
 * one (never started within 10 minutes of its time), each with Book again.
 */
export function PastConsultRow({ consult }: { consult: PastConsult }) {
  const doctorName = consult.doctor?.name ?? 'Doctor';
  const ran = duration(consult);
  return (
    <ListRow
      leading={
        <DoctorAvatar
          name={doctorName}
          photoUrl={consult.doctor?.photoUrl}
          size={LIST_LEAD}
        />
      }
      title={doctorName}
      subtitle={
        <>
          <ThemedText style={listText.subtitle} numberOfLines={1}>
            {specialtyLabel(consult.specialty)} · Video consult
          </ThemedText>
          <ThemedText style={styles.when} numberOfLines={1}>
            {formatSlot(consult.scheduledAt)}
            {ran ? ` · ${ran}` : ''}
          </ThemedText>
          {consult.status === 'missed' ? (
            <View style={styles.missed}>
              <CalendarX size={13} color={Colors.textSoft} strokeWidth={2.4} />
              <ThemedText style={styles.missedText} numberOfLines={1}>
                Missed · not started within 10 min
              </ThemedText>
            </View>
          ) : null}
          {consult.reason ? (
            <ThemedText style={styles.reason} numberOfLines={2}>
              {consult.reason}
            </ThemedText>
          ) : null}
          <LinkRow>
            {consult.prescriptionId ? (
              <LinkButton
                icon={FileText}
                label="Prescription"
                accessibilityLabel={`Open the prescription from ${doctorName}`}
                onPress={() =>
                  router.push({
                    pathname: '/records/[id]',
                    params: { id: consult.prescriptionId! },
                  })
                }
              />
            ) : null}
            {consult.doctor ? (
              <LinkButton
                icon={RotateCcw}
                label="Book again"
                accessibilityLabel={`Book again with ${doctorName}`}
                onPress={() =>
                  router.push({
                    pathname: '/care/book/[doctorId]',
                    params: { doctorId: consult.doctor!.id, specialty: consult.specialty },
                  })
                }
              />
            ) : null}
          </LinkRow>
        </>
      }
      style={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  // The words run four lines, so the photo sits by the name rather than in the middle.
  row: {
    alignItems: 'flex-start',
  },
  when: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  missed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  missedText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  reason: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
  },
});
