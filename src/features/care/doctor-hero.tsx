import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { sampleCare } from './sample-data';

type DoctorHeroProps = {
  doctor: (typeof sampleCare)['doctor'];
  onStartConsult?: () => void;
};

/** The quickest route to a doctor: a general physician on video, now. */
export function DoctorHero({ doctor, onStartConsult }: DoctorHeroProps) {
  return (
    <LinearGradient
      colors={[Colors.ink, Colors.inkMid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <View style={styles.available}>
        <View style={styles.dot} />
        <ThemedText style={styles.availableText}>Available now</ThemedText>
      </View>

      <ThemedText style={styles.title}>A doctor on video, with your history already open.</ThemedText>
      <ThemedText type="caption" style={styles.copy}>
        A general physician now, or a specialist by appointment. Your record is shared only with
        your OTP.
      </ThemedText>

      <View style={styles.doctor}>
        <Avatar initials={doctor.initials} color={Colors.primaryMid} size={42} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" themeColor="onInk">
            {doctor.name}
          </ThemedText>
          <ThemedText type="caption" style={styles.copy} numberOfLines={1}>
            {doctor.qualifications}, {doctor.role.toLowerCase()}
          </ThemedText>
        </View>
      </View>

      <Button label="Start video consult" icon={Video} onPress={onStartConsult} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two + 2,
    padding: Spacing.three + 2,
    borderRadius: Radius.xl - 4,
  },
  flex: {
    flex: 1,
  },
  available: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  availableText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInk,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 21,
    lineHeight: 26,
    color: Colors.onInk,
  },
  copy: {
    color: 'rgba(255, 255, 255, 0.75)',
  },
  doctor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    marginVertical: Spacing.one,
    padding: 10,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
