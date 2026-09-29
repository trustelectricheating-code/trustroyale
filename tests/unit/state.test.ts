import { describe, expect, it, vi } from "vitest";
import { GameStateMachine, transition, type GameState, type ServerState } from "../../src/game/state";

const retry = (spinsLeft: number, bonusAvailable = false, isBonus = false, gameOver = isBonus) => ({
  type: "RESOLVE" as const, outcome: "retry" as const, spinsLeft, bonusAvailable, isBonus, gameOver,
});

describe("game state machine", () => {
  it("covers PLAY, regular retry, Last Chance, bonus loss, win, and claim", () => {
    expect(transition("LANDING", { type: "PLAY" })).toBe("IDLE");
    expect(transition("IDLE", { type: "SPIN" })).toBe("SPINNING");
    expect(transition("SPINNING", { type: "RESULT" })).toBe("RESOLVING");
    expect(transition("RESOLVING", retry(2))).toBe("IDLE");
    expect(transition("RESOLVING", retry(0, true))).toBe("LAST_CHANCE");
    expect(transition("LAST_CHANCE", { type: "SPIN" })).toBe("SPINNING");
    expect(transition("RESOLVING", retry(0, false, true))).toBe("GAME_OVER");
    expect(transition("RESOLVING", { ...retry(0), outcome: "win", gameOver: true })).toBe("WON");
    expect(transition("RESOLVING", { ...retry(2), outcome: "win" })).toBe("IDLE");
    expect(transition("WON", { type: "SUBMIT" })).toBe("CLAIMED");
  });

  it("returns network errors to IDLE without resolving", () => {
    expect(transition("SPINNING", { type: "NETWORK_ERROR" })).toBe("IDLE");
  });

  it.each<[ServerState, GameState]>([
    ["idle", "IDLE"], ["last_chance", "LAST_CHANCE"], ["won", "WON"], ["claimed", "CLAIMED"], ["game_over", "GAME_OVER"],
  ])("jumps from page load to server state %s", (server, expected) => {
    expect(transition("LANDING", { type: "SERVER_STATE", state: server })).toBe(expected);
  });

  it("emits typed state changes and supports unsubscribe", () => {
    const listener = vi.fn();
    const machine = new GameStateMachine();
    const unsubscribe = machine.subscribe(listener);
    machine.send({ type: "PLAY" });
    expect(listener).toHaveBeenCalledWith({ previous: "LANDING", current: "IDLE", event: { type: "PLAY" } });
    unsubscribe();
    machine.send({ type: "SPIN" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("rejects transitions outside the state diagram", () => {
    expect(() => transition("LANDING", { type: "SPIN" })).toThrow("Invalid transition: LANDING + SPIN");
  });
});
