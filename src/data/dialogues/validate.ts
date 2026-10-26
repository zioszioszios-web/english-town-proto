import { BUILDINGS } from '../town';
import { isLevel } from '../levels';
import type { DialogueFile } from './types';

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: expected object`);
  return value as Record<string, unknown>;
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${path}: expected non-empty string`);
  return value;
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || !value.length) throw new Error(`${path}: expected non-empty array`);
  return value;
}

/** Validate data at the boundary, including reachable endings on every branch. */
export function validateDialogue(value: unknown): asserts value is DialogueFile {
  const file = record(value, 'dialogue');
  const building = BUILDINGS.find(b => b.name === file.location);
  if (!building) throw new Error('dialogue.location: unknown location');
  for (const field of ['npcName', 'npcRole', 'npcRoleZh']) text(file[field], `dialogue.${field}`);
  const scenarios = array(file.scenarios, 'dialogue.scenarios');
  const ids = new Set<string>();
  for (const raw of scenarios) {
    const scenario = record(raw, 'scenario');
    const id = text(scenario.id, 'scenario.id');
    if (ids.has(id)) throw new Error(`Duplicate scenario: ${id}`);
    ids.add(id);
    for (const field of ['title', 'titleZh']) text(scenario[field], `${id}.${field}`);
    if (!isLevel(scenario.level)) throw new Error(`${id}: invalid level`);
    if (scenario.location !== file.location || !building.levels.includes(scenario.level)) throw new Error(`${id}: location/level mismatch`);
    const nodes = array(scenario.nodes, `${id}.nodes`);
    const edges = new Map<string, (string | null)[]>();
    for (const rawNode of nodes) {
      const node = record(rawNode, `${id}.node`);
      const nodeId = text(node.id, `${id}.node.id`);
      if (edges.has(nodeId)) throw new Error(`${id}: duplicate node ${nodeId}`);
      text(node.npc, `${id}.${nodeId}.npc`);
      text(node.npcZh, `${id}.${nodeId}.npcZh`);
      const replies = array(node.replies, `${id}.${nodeId}.replies`);
      const next: (string | null)[] = replies.map(rawReply => {
        const reply = record(rawReply, `${id}.${nodeId}.reply`);
        text(reply.en, `${id}.${nodeId}.en`);
        text(reply.zh, `${id}.${nodeId}.zh`);
        return reply.next === null ? null : text(reply.next, `${id}.${nodeId}.next`);
      });
      edges.set(nodeId, next);
    }
    for (const [nodeId, targets] of edges) for (const target of targets) {
      if (target !== null && !edges.has(target)) throw new Error(`${id}.${nodeId}: next points to missing node "${target}"`);
    }
    const entry = text(record(nodes[0], id).id, id);
    const reachable = new Set<string>();
    const visit = [entry];
    while (visit.length) {
      const current = visit.pop()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const next of edges.get(current) ?? []) if (next !== null) visit.push(next);
    }
    if (reachable.size !== edges.size) throw new Error(`${id}: unreachable node`);
    const canEnd = new Set([...edges].filter(([, targets]) => targets.includes(null)).map(([nodeId]) => nodeId));
    let changed = true;
    while (changed) {
      changed = false;
      for (const [nodeId, targets] of edges) {
        if (!canEnd.has(nodeId) && targets.some(target => target !== null && canEnd.has(target))) {
          canEnd.add(nodeId);
          changed = true;
        }
      }
    }
    for (const nodeId of reachable) if (!canEnd.has(nodeId)) throw new Error(`${id}.${nodeId}: no reachable ending`);
  }
}
