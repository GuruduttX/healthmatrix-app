import { type Relation } from './types';

/** In the order the add screen offers them. */
export const RELATIONS: { id: Relation; label: string }[] = [
  { id: 'parent', label: 'Parent' },
  { id: 'spouse', label: 'Spouse' },
  { id: 'child', label: 'Child' },
  { id: 'sibling', label: 'Sibling' },
  { id: 'grandparent', label: 'Grandparent' },
  { id: 'other', label: 'Other' },
];

/** "Parent", or for "other" the name given when adding them ("Cousin"). */
export const relationLabel = (relation: Relation, relationName?: string) =>
  (relation === 'other' && relationName) ||
  RELATIONS.find((r) => r.id === relation)?.label ||
  'Family';

/** "Mother, 62 · B+", the line under a family member's name. */
export function aboutLine(person: {
  relation: Relation;
  relationName?: string;
  gender?: 'male' | 'female' | 'other';
  age?: number;
  bloodGroup?: string;
}) {
  const gendered: Partial<Record<Relation, Partial<Record<'male' | 'female', string>>>> = {
    parent: { male: 'Father', female: 'Mother' },
    spouse: { male: 'Husband', female: 'Wife' },
    child: { male: 'Son', female: 'Daughter' },
    sibling: { male: 'Brother', female: 'Sister' },
    grandparent: { male: 'Grandfather', female: 'Grandmother' },
  };
  const who =
    (person.gender === 'male' || person.gender === 'female'
      ? gendered[person.relation]?.[person.gender]
      : undefined) ?? relationLabel(person.relation, person.relationName);
  const first = person.age !== undefined ? `${who}, ${person.age}` : who;
  return [first, person.bloodGroup].filter(Boolean).join(' · ');
}
