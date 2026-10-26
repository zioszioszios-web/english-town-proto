import { CafeOrder } from './CafeOrder';
import { PharmacySort } from './PharmacySort';
import { Fishing } from './Fishing';
import { Spelling } from './Spelling';
import { Memory } from './Memory';
import type { MiniGame } from './types';
export const GAME_FACTORIES: readonly (() => MiniGame)[] = [() => new Fishing(), () => new Spelling(), () => new Memory(), () => new CafeOrder(), () => new PharmacySort()];
export function createGame(id: string): MiniGame | undefined { return GAME_FACTORIES.map(factory => factory()).find(game => game.id === id); }
