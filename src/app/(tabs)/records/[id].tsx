import { router, useLocalSearchParams, useNavigation } from 'expo-router';

import { RecordScreen } from '@/features/records/record-screen';

/** One of the member's own records: a prescription with every line, or a vaccine with its doses. */
export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Back steps within the Records stack: to the record before this one, or else to the list.
  // `canGoBack()` would look past Records to the tab navigator and leave for another tab.
  const navigation = useNavigation();
  const back = () => {
    if ((navigation.getState()?.index ?? 0) > 0) navigation.goBack();
    else router.replace('/records');
  };
  return (
    <RecordScreen
      endpoint={`/records/${id}`}
      backLabel="Records"
      onBack={back}
      openRecord={(next) => router.push({ pathname: '/records/[id]', params: { id: next } })}
    />
  );
}
