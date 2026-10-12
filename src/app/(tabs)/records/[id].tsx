import { router, useLocalSearchParams } from 'expo-router';

import { RecordScreen } from '@/features/records/record-screen';

/** One of the member's own records: a prescription with every line, or a vaccine with its doses. */
export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RecordScreen
      endpoint={`/records/${id}`}
      backLabel="Records"
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/records'))}
      openRecord={(next) => router.push({ pathname: '/records/[id]', params: { id: next } })}
    />
  );
}
