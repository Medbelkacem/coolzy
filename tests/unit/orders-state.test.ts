import { describe, expect, it } from "vitest";
import { canTransition, flowFor, isTerminal, nextStatus } from "@/lib/orders";

describe("order state machine", () => {
  it("table flow has no delivery step", () => {
    expect(flowFor("TABLE")).toEqual(["RECEIVED", "APPROVED", "PREPARING", "READY", "COMPLETED"]);
    expect(flowFor("DELIVERY")).toEqual(["RECEIVED", "APPROVED", "PREPARING", "READY", "DELIVERED"]);
  });
  it("workers move one step forward only", () => {
    expect(canTransition("TABLE", "RECEIVED", "APPROVED")).toBe(true);
    expect(canTransition("TABLE", "RECEIVED", "PREPARING")).toBe(false);
    expect(canTransition("TABLE", "READY", "COMPLETED")).toBe(true);
    expect(canTransition("TABLE", "READY", "DELIVERED")).toBe(false);
    expect(canTransition("DELIVERY", "READY", "DELIVERED")).toBe(true);
    expect(canTransition("TABLE", "APPROVED", "RECEIVED")).toBe(false);
  });
  it("cancel allowed from any non-terminal state", () => {
    expect(canTransition("TABLE", "PREPARING", "CANCELLED")).toBe(true);
    expect(canTransition("TABLE", "COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransition("TABLE", "CANCELLED", "CANCELLED")).toBe(false);
  });
  it("admin override can go anywhere except no-op", () => {
    expect(canTransition("TABLE", "COMPLETED", "PREPARING", true)).toBe(true);
    expect(canTransition("TABLE", "READY", "READY", true)).toBe(false);
  });
  it("nextStatus and terminal", () => {
    expect(nextStatus("TABLE", "READY")).toBe("COMPLETED");
    expect(nextStatus("DELIVERY", "DELIVERED")).toBeNull();
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("READY")).toBe(false);
  });
});
