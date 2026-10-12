import { Alert, Platform } from 'react-native';

/** Asks before a destructive family change. `Alert` has no buttons on web, so web uses `confirm`. */
export function confirmRemove(title: string, message: string, action: string) {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
