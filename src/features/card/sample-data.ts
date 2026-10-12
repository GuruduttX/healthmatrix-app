/**
 * SAMPLE DATA from the brochure mock-up for the parts of the Card screen that have no API yet
 * (the lock-screen QR). Replace with API data.
 */
export const sampleCard = {
  lockScreenQr: true,
};

/** "482910573316" -> "HM 4829 1057 3316" */
export function formatMemberId(memberId: string) {
  return `HM ${memberId.replace(/(\d{4})(?=\d)/g, '$1 ')}`;
}
