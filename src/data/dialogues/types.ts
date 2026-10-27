import type { Level } from '../levels';
import type { LocationName } from '../town';
interface ReplyBase { en: string; zh: string }
export interface BranchReply extends ReplyBase { type: 'branch'; next: string | null }
export interface VariantReply extends ReplyBase { type: 'variant'; next: string | null; note: string }
export interface MistakeReply extends ReplyBase { type: 'mistake'; reaction: { en: string; zh: string }; correction: string; explain: string }
export type Reply = BranchReply | VariantReply | MistakeReply;
export type ReplyType = Reply['type'];
export interface DialogueNode { id: string; npc: string; npcZh: string; replies: Reply[] }
export interface Scenario { id: string; location: LocationName; level: Level; title: string; titleZh: string; nodes: DialogueNode[] }
export interface DialogueFile { location: LocationName; npcName: string; npcRole: string; npcRoleZh: string; scenarios: Scenario[] }
