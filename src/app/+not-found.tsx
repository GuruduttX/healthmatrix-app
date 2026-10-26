import { router } from 'expo-router';
import { House, Link2Off } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/empty-state';
import { PageBackground } from '@/components/ui/morning-light';
import { Gutter } from '@/constants/theme';

/**
 * A link that leads nowhere in the app, e.g. an old notification or a mistyped address: the
 * app's own page instead of the router's dark default, with one way back in. Home sends a
 * signed-out visitor on to log in.
 */
export default function NotFoundScreen() {
  return (
    <View style={styles.screen}>
      <PageBackground />
      <SafeAreaView style={styles.center}>
        <EmptyState
          icon={Link2Off}
          tone="neutral"
          title="This page isn’t here"
          body="The link may be old or mistyped. Everything else in HealthMatrix is just a tap away."
          action={{ label: 'Go to Home', icon: House, onPress: () => router.replace('/') }}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Gutter,
  },
});
