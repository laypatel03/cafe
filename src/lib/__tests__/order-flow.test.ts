import { describe, expect, it } from "vitest";

import type { OrderStatus } from "@/generated/prisma/enums";
import {
  availableActions,
  canCancel,
  canEditItems,
  nextStatus,
  statusOnPayment,
  stepToUndo,
  UNDO_NOTE,
} from "@/lib/order-flow";

describe("order flow", () => {
  it("takes a dine-in order from placed to served", () => {
    expect(nextStatus("accept", "NEW", "DINE_IN")).toBe("ACCEPTED");
    expect(nextStatus("toKitchen", "NEW", "DINE_IN")).toBeNull();
    expect(nextStatus("toKitchen", "ACCEPTED", "DINE_IN")).toBe("PREPARING");
    expect(nextStatus("served", "PREPARING", "DINE_IN")).toBe("SERVED");
    expect(nextStatus("readyToCollect", "PREPARING", "DINE_IN")).toBeNull();
  });

  it("takes a takeaway order through ready to collect", () => {
    expect(nextStatus("readyToCollect", "PREPARING", "PARCEL")).toBe("READY");
    expect(nextStatus("pickedUp", "READY", "PARCEL")).toBe("SERVED");
    expect(nextStatus("served", "PREPARING", "PARCEL")).toBeNull();
  });

  it("refuses to skip or repeat steps", () => {
    expect(nextStatus("served", "ACCEPTED", "DINE_IN")).toBeNull();
    expect(nextStatus("toKitchen", "PREPARING", "DINE_IN")).toBeNull();
    expect(nextStatus("toKitchen", "CANCELLED", "DINE_IN")).toBeNull();
  });

  it("lists the buttons for each status", () => {
    expect(availableActions("NEW", "PARCEL")).toEqual(["accept"]);
    expect(availableActions("ACCEPTED", "DINE_IN")).toEqual(["toKitchen"]);
    expect(availableActions("PREPARING", "PARCEL")).toEqual(["readyToCollect"]);
    expect(availableActions("SERVED", "DINE_IN")).toEqual([]);
  });

  it("allows edits only before the kitchen and cancelling until served", () => {
    expect(canEditItems("ACCEPTED")).toBe(true);
    expect(canEditItems("PREPARING")).toBe(false);
    expect(canCancel("PREPARING")).toBe(true);
    expect(canCancel("SERVED")).toBe(false);
    expect(canCancel("PAID")).toBe(false);
  });

  it("keeps a takeaway paid before pickup waiting at the counter", () => {
    expect(statusOnPayment("READY")).toBe("READY");
    expect(statusOnPayment("SERVED")).toBe("PAID");
    expect(canCancel("READY", true)).toBe(false);
    expect(canCancel("READY")).toBe(true);
  });
});

describe("undo", () => {
  const log = (fromStatus: OrderStatus | null, toStatus: OrderStatus, note: string | null = null) => ({
    fromStatus,
    toStatus,
    note,
  });
  const placed = log(null, "NEW", "Placed by the guest on the QR menu");

  it("takes back the last step, then the one before", () => {
    const logs = [placed, log("NEW", "ACCEPTED"), log("ACCEPTED", "PREPARING")];
    expect(stepToUndo(logs, "PREPARING")).toEqual({
      from: "ACCEPTED",
      to: "PREPARING",
      label: "Send to kitchen",
    });
    const once = [...logs, log("PREPARING", "ACCEPTED", UNDO_NOTE)];
    expect(stepToUndo(once, "ACCEPTED")).toEqual({ from: "NEW", to: "ACCEPTED", label: "Accept" });
    expect(stepToUndo([...once, log("ACCEPTED", "NEW", UNDO_NOTE)], "NEW")).toBeNull();
  });

  it("undoes a cancel and a pickup, skipping item edits", () => {
    const cancelled = [
      placed,
      log("NEW", "NEW", "Items changed by Asha"),
      log("NEW", "CANCELLED", "Guest left"),
    ];
    expect(stepToUndo(cancelled, "CANCELLED")?.label).toBe("Cancel");
    const pickedUp = [
      placed,
      log("NEW", "ACCEPTED"),
      log("ACCEPTED", "PREPARING"),
      log("PREPARING", "READY"),
    ];
    expect(stepToUndo([...pickedUp, log("READY", "SERVED")], "SERVED")?.label).toBe("Picked up");
    expect(stepToUndo([...pickedUp, log("READY", "PAID", "Picked up")], "PAID")?.label).toBe("Picked up");
  });

  it("never undoes payments, pay later or a status changed elsewhere", () => {
    const served = [placed, log("NEW", "ACCEPTED"), log("ACCEPTED", "PREPARING"), log("PREPARING", "SERVED")];
    expect(stepToUndo(served, "SERVED")?.label).toBe("Served");
    expect(stepToUndo([...served, log("SERVED", "PAID", "Bill #4 paid by Cash")], "PAID")).toBeNull();
    const ready = [placed, log("NEW", "ACCEPTED"), log("ACCEPTED", "PREPARING"), log("PREPARING", "READY")];
    expect(
      stepToUndo([...ready, log("READY", "SERVED", "Bill #5 completed – pay later")], "SERVED"),
    ).toBeNull();
    expect(stepToUndo(served, "PAID")).toBeNull();
  });
});
