export const GAME_STATES = ["LANDING", "IDLE", "SPINNING", "RESOLVING", "LAST_CHANCE", "WON", "CLAIMED", "GAME_OVER"] as const;
export type GameState = (typeof GAME_STATES)[number];
export type ServerState = "idle" | "last_chance" | "won" | "claimed" | "game_over";
export type GameEvent =
  | { type: "PLAY" }
  | { type: "SPIN" }
  | { type: "RESULT" }
  | { type: "RESOLVE"; outcome: "win" | "retry"; spinsLeft: number; bonusAvailable: boolean; isBonus: boolean; gameOver: boolean }
  | { type: "NETWORK_ERROR" }
  | { type: "SUBMIT" }
  | { type: "SERVER_STATE"; state: ServerState };
export interface StateChange { previous: GameState; current: GameState; event: GameEvent }
export type StateListener = (change: StateChange) => void;

const SERVER_STATES: Record<ServerState, GameState> = { idle: "IDLE", last_chance: "LAST_CHANCE", won: "WON", claimed: "CLAIMED", game_over: "GAME_OVER" };

export class GameStateMachine {
  #state: GameState;
  #listeners = new Set<StateListener>();
  constructor(initialState: GameState = "LANDING") { this.#state = initialState; }
  get state(): GameState { return this.#state; }
  subscribe(listener: StateListener): () => void { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  send(event: GameEvent): GameState {
    const previous = this.#state;
    const current = transition(previous, event);
    this.#state = current;
    const change = { previous, current, event };
    for (const listener of this.#listeners) listener(change);
    return current;
  }
}

export function transition(state: GameState, event: GameEvent): GameState {
  if (event.type === "SERVER_STATE") return SERVER_STATES[event.state];
  switch (state) {
    case "LANDING": if (event.type === "PLAY") return "IDLE"; break;
    case "IDLE":
    case "LAST_CHANCE": if (event.type === "SPIN") return "SPINNING"; break;
    case "SPINNING":
      if (event.type === "RESULT") return "RESOLVING";
      if (event.type === "NETWORK_ERROR") return "IDLE";
      break;
    case "RESOLVING":
      if (event.type === "RESOLVE") {
        if (event.gameOver && event.outcome === "win") return "WON";
        if (event.gameOver) return "GAME_OVER";
        if (event.isBonus) return "GAME_OVER";
        if (event.spinsLeft > 0) return "IDLE";
        if (event.bonusAvailable) return "LAST_CHANCE";
        return "GAME_OVER";
      }
      break;
    case "WON": if (event.type === "SUBMIT") return "CLAIMED"; break;
    case "CLAIMED":
    case "GAME_OVER": break;
  }
  throw new Error(`Invalid transition: ${state} + ${event.type}`);
}
