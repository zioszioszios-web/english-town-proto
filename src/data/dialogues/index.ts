import school from './school.json';
import office from './office.json';
import cafe from './cafe.json';
import hotel from './hotel.json';
import pharmacy from './pharmacy.json';
import { validateDialogue } from './validate';
import type { DialogueFile } from './types';
import type { LocationName } from '../town';

function checked(value: unknown): DialogueFile { validateDialogue(value); return value; }
export const DIALOGUES: Record<LocationName, DialogueFile> = {
  Cafe: checked(cafe), Hotel: checked(hotel), Pharmacy: checked(pharmacy), School: checked(school), Office: checked(office),
};
export const ALL_SCENARIOS = Object.values(DIALOGUES).flatMap(file => file.scenarios);
if (new Set(ALL_SCENARIOS.map(s => s.id)).size !== ALL_SCENARIOS.length) throw new Error('Scenario IDs must be globally unique');
