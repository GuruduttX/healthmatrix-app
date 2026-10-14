import { Check, FlaskConical } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { IconTile } from '@/components/ui/icon-tile';
import { ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Colors, Spacing } from '@/constants/theme';

import { type LabProfile, type LabTest } from './types';

/** Single tests shown before "Show all". */
const FIRST_TESTS = 12;
const BOX = 22;

type TestPickerProps = {
  profiles: LabProfile[];
  tests: LabTest[];
  profileIds: string[];
  testCodes: string[];
  onToggleProfile: (id: string) => void;
  onToggleTest: (code: string) => void;
};

/** Test codes inside the chosen profiles. */
export function coveredTests(profiles: LabProfile[], profileIds: string[]) {
  return new Set(
    profiles
      .filter((profile) => profileIds.includes(profile.id))
      .flatMap((profile) => profile.tests.map((test) => test.code)),
  );
}

/**
 * Health checks (profiles) and single tests for a pod booking. Mobilab turns down a booking where
 * two profiles share a test, or a single test is also in a chosen profile, so those can't be
 * picked: a clashing profile is greyed out and a test already inside one shows as included.
 */
export function TestPicker({
  profiles,
  tests,
  profileIds,
  testCodes,
  onToggleProfile,
  onToggleTest,
}: TestPickerProps) {
  const [showAll, setShowAll] = useState(false);
  const covered = coveredTests(profiles, profileIds);
  const shown = showAll ? tests : tests.slice(0, FIRST_TESTS);

  return (
    <>
      {profiles.length ? (
        <Section title="Health checks" caption="Tests booked together" index={1}>
          <ListCard>
            {profiles.map((profile) => {
              const selected = profileIds.includes(profile.id);
              const clashes =
                !selected && profile.tests.some((test) => covered.has(test.code));
              const count = profile.tests.length;
              const names = profile.tests.map((test) => test.name).join(', ');
              return (
                <ListRow
                  key={profile.id}
                  leading={<IconTile icon={FlaskConical} tone="neutral" />}
                  title={profile.name}
                  subtitle={
                    clashes
                      ? 'Shares tests with a check you picked'
                      : `${count} ${count === 1 ? 'test' : 'tests'}${names ? ` · ${names}` : ''}`
                  }
                  trailing={<Box selected={selected} />}
                  onPress={clashes ? undefined : () => onToggleProfile(profile.id)}
                  accessibilityLabel={`${profile.name}, ${count} tests${selected ? ', chosen' : ''}`}
                  style={clashes ? styles.muted : undefined}
                />
              );
            })}
          </ListCard>
        </Section>
      ) : null}

      {tests.length ? (
        <Section title="Single tests" caption="Add any test on its own" index={2}>
          <View style={styles.chips}>
            {shown.map((test) => {
              const included = covered.has(test.code);
              return (
                <Chip
                  key={test.code}
                  label={test.name}
                  icon={included ? Check : undefined}
                  selected={included || testCodes.includes(test.code)}
                  disabled={included}
                  onPress={() => onToggleTest(test.code)}
                />
              );
            })}
            {tests.length > FIRST_TESTS ? (
              <Chip
                label={showAll ? 'Show fewer' : `Show all ${tests.length}`}
                onPress={() => setShowAll((value) => !value)}
              />
            ) : null}
          </View>
        </Section>
      ) : null}
    </>
  );
}

/** A tick box: solid ink with a tick once chosen, like every other choice in the app. */
function Box({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.box, selected && styles.boxSelected]}>
      {selected ? <Check size={13} color={Colors.onInk} strokeWidth={3} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  muted: {
    opacity: 0.5,
  },
  box: {
    width: BOX,
    height: BOX,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  boxSelected: {
    borderColor: Colors.text,
    backgroundColor: Colors.text,
  },
});
