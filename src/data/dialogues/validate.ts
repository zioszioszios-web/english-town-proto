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
      const next: (string | null)[] = replies.flatMap(rawReply => {
        const reply = record(rawReply, `${id}.${nodeId}.reply`);
        text(reply.en, `${id}.${nodeId}.en`);
        text(reply.zh, `${id}.${nodeId}.zh`);
        return reply.type === 'branch' || reply.type === 'variant' ? [reply.next === null ? null : text(reply.next, `${id}.${nodeId}.next`)] : [];
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
    const reaches = (from: string, target: string): boolean => {
      const seen = new Set<string>(), pending = [from];
      while (pending.length) {
        const current = pending.pop()!;
        if (current === target) return true;
        if (seen.has(current)) continue;
        seen.add(current);
        for (const next of edges.get(current) ?? []) if (next !== null) pending.push(next);
      }
      return false;
    };
    let branches = 0, variants = 0, mistakes = 0;
    for (const rawNode of nodes) {
      const node = record(rawNode, id), path = `${id}.${node.id}`;
      const replies = array(node.replies, path).map(reply => record(reply, path));
      for (const reply of replies) {
        if (!['branch', 'variant', 'mistake'].includes(reply.type as string)) throw new Error(`${path}: invalid reply type`);
        if (reply.type === 'variant') text(reply.note, `${path}.note`);
        if (reply.type === 'mistake') {
          mistakes++;
          if ('next' in reply) throw new Error(`${path}: mistake must not have next`);
          const reaction = record(reply.reaction, `${path}.reaction`);
          for (const field of ['en', 'zh']) text(reaction[field], `${path}.reaction.${field}`);
          for (const field of ['correction', 'explain']) text(reply[field], `${path}.${field}`);
        }
      }
      const branch = replies.filter(reply => reply.type === 'branch'), variant = replies.filter(reply => reply.type === 'variant');
      if (!branch.length && !variant.length) throw new Error(`${path}: needs at least 1 non-mistake option`);
      if (branch.length && variant.length) throw new Error(`${path}: branch and variant must not mix`);
      if (variant.length) {
        if (variant.length < 2) throw new Error(`${path}: needs at least 2 variant options`);
        if (variant.some(reply => reply.next !== variant[0].next)) throw new Error(`${path}: variant next must match`);
        variants++;
      }
      if (branch.length >= 2) {
        branches++;
        for (let i = 0; i < branch.length; i++) {
          if (branch[i].next === null) throw new Error(`${path}: branch targets must be non-null`);
          for (let j = 0; j < branch.length; j++) if (i !== j && reaches(branch[j].next as string, branch[i].next as string)) throw new Error(`${path}: no exclusive node`);
        }
      }
      for (let i = 0; i < replies.length; i++) for (let j = i + 1; j < replies.length; j++) {
        if (wordDistance(replies[i].en as string, replies[j].en as string) < 3) throw new Error(`${path}: options too similar`);
      }
    }
    if (branches < 2) throw new Error(`${id}: needs at least 2 branch nodes`);
    if (scenario.level <= 2 && !mistakes) throw new Error(`${id}: needs at least 1 mistake option`);
    if (scenario.level >= 3 && variants < 2) throw new Error(`${id}: needs at least 2 variant nodes`);
  }
}

function wordDistance(left: string, right: string): number {
  const words = (value: string): string[] => value.toLowerCase().replace(/[^a-z0-9'\s]/g, '').split(/\s+/).filter(Boolean);
  const a = words(left), b = words(right);
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const next = [i + 1];
    for (let j = 0; j < b.length; j++) next.push(Math.min(next[j] + 1, row[j + 1] + 1, row[j] + (a[i] === b[j] ? 0 : 1)));
    row = next;
  }
  return row[b.length];
}
