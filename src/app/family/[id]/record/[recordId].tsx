import { router, useLocalSearchParams } from 'expo-router';

import { RecordScreen } from '@/features/records/record-screen';

/** One of a family member's records, read-only: a prescription or a vaccine. */
export default function FamilyRecordScreen() {
  const { id, recordId } = useLocalSearchParams<{ id: string; recordId: string }>();
  const toFamilyMember = () =>
    router.canGoBack()
      ? router.back()
      : router.replace({ pathname: '/family/[id]', params: { id } });
  return (
    <RecordScreen
      endpoint={`/family/${id}/records/${recordId}`}
      backLabel="Family member"
      onBack={toFamilyMember}
      openRecord={(next) =>
        router.push({ pathname: '/family/[id]/record/[recordId]', params: { id, recordId: next } })
      }
      readOnly
    />
  );
}
