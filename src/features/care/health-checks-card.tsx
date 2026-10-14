import { router } from 'expo-router';
import { FlaskConical } from 'lucide-react-native';

import { IconTile } from '@/components/ui/icon-tile';
import { Chevron, ListCard, ListRow } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { SkeletonList } from '@/components/ui/skeleton';

import { type LabProfile } from './types';

/** Checks listed on the Care tab; the rest are in the pod finder. */
const SHOWN = 4;

type HealthChecksCardProps = {
  /** Null while loading. */
  profiles: LabProfile[] | null;
  /** Set when loading failed; the pod card above says why. */
  failed?: boolean;
  index?: number;
};

/**
 * The health checks a pod can run (Mobilab's test profiles). Each opens the pod finder with that
 * check chosen. Hides itself when there are none.
 */
export function HealthChecksCard({ profiles, failed, index }: HealthChecksCardProps) {
  if (profiles ? !profiles.length : failed) return null;

  return (
    <Section
      title="Health checks at pods"
      actionLabel={profiles ? 'All tests' : undefined}
      onAction={() => router.push('/care/pods')}
      index={index}>
      {profiles ? (
        <ListCard>
          {profiles.slice(0, SHOWN).map((profile) => {
            const count = profile.tests.length;
            return (
              <ListRow
                key={profile.id}
                leading={<IconTile icon={FlaskConical} tone="neutral" />}
                title={profile.name}
                subtitle={`${count} ${count === 1 ? 'test' : 'tests'} · ${profile.tests
                  .map((test) => test.name)
                  .join(', ')}`}
                trailing={<Chevron />}
                onPress={() =>
                  router.push({ pathname: '/care/pods', params: { profile: profile.id } })
                }
                accessibilityLabel={`${profile.name}, ${count} tests. Book at a pod`}
              />
            );
          })}
        </ListCard>
      ) : (
        <SkeletonList rows={2} leading="circle" trailing={false} label="Loading health checks" />
      )}
    </Section>
  );
}
