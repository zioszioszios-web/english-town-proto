import { Fishing } from './Fishing';
import { Spelling } from './Spelling';
import { Memory } from './Memory';
import type { MiniGame } from './types';
export const GAME_FACTORIES: readonly (() => MiniGame)[] = [() => new Fishing(), () => new Spelling(), () => new Memory()];
export function createGame(id: string): MiniGame | undefined { return GAME_FACTORIES.map(factory => factory()).find(game => game.id === id); }
