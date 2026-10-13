import { Segmented, type SegmentedOption } from '@/components/ui/segmented';

import { type AuthIntent } from './auth-api';

const OPTIONS: SegmentedOption<AuthIntent>[] = [
  { value: 'login', label: 'Log in' },
  { value: 'signup', label: 'Create account' },
];

type AuthModeSwitchProps = {
  value: AuthIntent;
  onChange: (intent: AuthIntent) => void;
  disabled?: boolean;
};

/** Segmented control between logging in and creating an account: the app's warm track. */
export function AuthModeSwitch({ value, onChange, disabled }: AuthModeSwitchProps) {
  return <Segmented options={OPTIONS} value={value} onChange={onChange} disabled={disabled} />;
}
