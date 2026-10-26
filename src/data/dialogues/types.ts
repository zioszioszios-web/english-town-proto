import type { Level } from '../levels';
import type { LocationName } from '../town';
export interface Reply { en: string; zh: string; next: string | null }
export interface DialogueNode { id: string; npc: string; npcZh: string; replies: Reply[] }
export interface Scenario { id: string; location: LocationName; level: Level; title: string; titleZh: string; nodes: DialogueNode[] }
export interface DialogueFile { location: LocationName; npcName: string; npcRole: string; npcRoleZh: string; scenarios: Scenario[] }
