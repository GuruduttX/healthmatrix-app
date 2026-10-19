/**
 * Languages the member can pick for Ekaay, the same set as Ekaay on cloudspital.ai. A pick makes
 * Claude answer in it whatever language the question is in, and tells Gemini which language to
 * expect when it hears a question and to speak when it reads an answer. On Auto (no pick) Ekaay
 * answers in the language of the question, so every language works, listed here or not.
 */
export const EKAAY_LANGUAGES = {
  'en-IN': { name: 'English', label: 'English' },
  'hi-IN': { name: 'Hindi', label: 'हिन्दी' },
  'bn-IN': { name: 'Bengali', label: 'বাংলা' },
  'mr-IN': { name: 'Marathi', label: 'मराठी' },
  'te-IN': { name: 'Telugu', label: 'తెలుగు' },
  'ta-IN': { name: 'Tamil', label: 'தமிழ்' },
  'gu-IN': { name: 'Gujarati', label: 'ગુજરાતી' },
  'kn-IN': { name: 'Kannada', label: 'ಕನ್ನಡ' },
  'ml-IN': { name: 'Malayalam', label: 'മലയാളം' },
  'pa-IN': { name: 'Punjabi', label: 'ਪੰਜਾਬੀ' },
  'or-IN': { name: 'Odia', label: 'ଓଡ଼ିଆ' },
  'ur-IN': { name: 'Urdu', label: 'اردو' },
  'ar-AE': { name: 'Arabic', label: 'العربية' },
  'es-ES': { name: 'Spanish', label: 'Español' },
  'fr-FR': { name: 'French', label: 'Français' },
} as const;

export type EkaayLanguage = keyof typeof EKAAY_LANGUAGES;

export const ekaayLanguageCodes = Object.keys(EKAAY_LANGUAGES) as [EkaayLanguage, ...EkaayLanguage[]];

/**
 * The language to read a piece of text in with the phone's own voice, from its script. Hindi and
 * Marathi share Devanagari, so a chosen language wins when its script matches.
 */
export function speechLanguage(text: string, chosen: EkaayLanguage | null): string {
  const scripts: [RegExp, EkaayLanguage[]][] = [
    [/[ऀ-ॿ]/, ['hi-IN', 'mr-IN']],
    [/[ঀ-৿]/, ['bn-IN']],
    [/[਀-੿]/, ['pa-IN']],
    [/[઀-૿]/, ['gu-IN']],
    [/[଀-୿]/, ['or-IN']],
    [/[஀-௿]/, ['ta-IN']],
    [/[ఀ-౿]/, ['te-IN']],
    [/[ಀ-೿]/, ['kn-IN']],
    [/[ഀ-ൿ]/, ['ml-IN']],
    [/[؀-ۿ]/, ['ur-IN', 'ar-AE']],
  ];
  for (const [script, languages] of scripts) {
    if (script.test(text)) return chosen && languages.includes(chosen) ? chosen : languages[0]!;
  }
  // Latin letters: the chosen language if it is written in them, else Indian English.
  return chosen && ['en-IN', 'es-ES', 'fr-FR'].includes(chosen) ? chosen : 'en-IN';
}
