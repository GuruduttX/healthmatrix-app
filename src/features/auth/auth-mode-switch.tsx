import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadows } from '@/constants/theme';

import { type AuthIntent } from './auth-api';

const OPTIONS: { intent: AuthIntent; label: string }[] = [
  { intent: 'login', label: 'Log in' },
  { intent: 'signup', label: 'Create account' },
];

type AuthModeSwitchProps = {
  value: AuthIntent;
  onChange: (intent: AuthIntent) => void;
  disabled?: boolean;
};

/** Segmented control between logging in and creating an account. */
export function AuthModeSwitch({ value, onChange, disabled }: AuthModeSwitchProps) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {OPTIONS.map(({ intent, label }) => {
        const selected = intent === value;
        return (
          <Pressable
            key={intent}
            onPress={() => onChange(intent)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            style={[styles.option, selected && styles.optionSelected]}>
            <ThemedText type="smallBold" themeColor={selected ? 'text' : 'textSecondary'}>
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.md + 2,
    backgroundColor: Colors.backgroundSelected,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: Radius.md - 2,
  },
  optionSelected: {
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
});
