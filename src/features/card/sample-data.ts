/** "482910573316" -> "HM 4829 1057 3316" */
export function formatMemberId(memberId: string) {
  return `HM ${memberId.replace(/(\d{4})(?=\d)/g, '$1 ')}`;
}
