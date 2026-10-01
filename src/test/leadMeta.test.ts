import { describe, it, expect } from "vitest";
import { isOpenStage, isOverdue, isDueToday, todayISO, stageLabel, sourceLabel, STAGES } from "@/pages/sales/leadMeta";

const dayOffset = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("lead stages", () => {
  it("treats live and lost as closed, everything else as open", () => {
    expect(isOpenStage("new")).toBe(true);
    expect(isOpenStage("signed_up")).toBe(true);
    expect(isOpenStage("approved")).toBe(true);
    expect(isOpenStage("live")).toBe(false);
    expect(isOpenStage("lost")).toBe(false);
  });

  it("matches the stage list the DB check constraint allows", () => {
    expect(STAGES.map((s) => s.key)).toEqual([
      "new", "contacted", "meeting_booked", "meeting_done", "signed_up", "approved", "live", "lost",
    ]);
  });

  it("labels fall back to the raw key rather than rendering blank", () => {
    expect(stageLabel("meeting_booked")).toBe("Meeting booked");
    expect(stageLabel("something_new")).toBe("something_new");
    expect(sourceLabel("walk_in")).toBe("Walk-in");
  });
});

describe("follow-up dates", () => {
  it("builds today's date from local time, not UTC", () => {
    // toISOString() would roll Beirut evenings back to the previous day and
    // make today's follow-ups look overdue.
    const d = new Date();
    expect(todayISO()).toBe(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  });

  it("flags only past dates on open leads as overdue", () => {
    expect(isOverdue({ stage: "new", next_action_date: dayOffset(-1) })).toBe(true);
    expect(isOverdue({ stage: "new", next_action_date: todayISO() })).toBe(false);
    expect(isOverdue({ stage: "new", next_action_date: dayOffset(1) })).toBe(false);
  });

  it("never flags closed leads, even with a stale date left behind", () => {
    expect(isOverdue({ stage: "live", next_action_date: dayOffset(-30) })).toBe(false);
    expect(isOverdue({ stage: "lost", next_action_date: dayOffset(-30) })).toBe(false);
  });

  it("ignores leads with no follow-up date set", () => {
    expect(isOverdue({ stage: "new", next_action_date: null })).toBe(false);
    expect(isDueToday({ stage: "new", next_action_date: null })).toBe(false);
  });

  it("separates due-today from overdue", () => {
    expect(isDueToday({ stage: "contacted", next_action_date: todayISO() })).toBe(true);
    expect(isDueToday({ stage: "contacted", next_action_date: dayOffset(-1) })).toBe(false);
  });
});
