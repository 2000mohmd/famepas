import { describe, it, expect } from "vitest";
import {
  isOpenStage, isOverdue, isDueToday, todayISO, stageLabel, sourceLabel, STAGES,
  toCsv, median, daysInStage,
} from "@/pages/sales/leadMeta";

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

  it("counts whole days a lead has sat in its stage", () => {
    const now = Date.parse("2026-10-10T12:00:00Z");
    expect(daysInStage({ stage_changed_at: "2026-10-10T09:00:00Z" }, now)).toBe(0);
    expect(daysInStage({ stage_changed_at: "2026-10-07T12:00:00Z" }, now)).toBe(3);
  });
});

describe("CSV export", () => {
  it("quotes cells containing commas, quotes or newlines", () => {
    const csv = toCsv(
      ["Venue", "Note"],
      [["Cafe Younes, Hamra", 'He said "call back"'], ["Em Sherif", "line one\nline two"]],
    );
    expect(csv).toBe(
      'Venue,Note\r\n"Cafe Younes, Hamra","He said ""call back"""\r\n' +
      'Em Sherif,"line one\nline two"',
    );
  });

  it("renders missing values as empty rather than 'null'", () => {
    expect(toCsv(["A", "B", "C"], [[null, undefined, ""]])).toBe("A,B,C\r\n,,");
  });

  it("keeps a zero rather than blanking it", () => {
    expect(toCsv(["Reviews"], [[0]])).toBe("Reviews\r\n0");
  });
});

describe("median", () => {
  it("averages the middle pair on an even count", () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it("takes the middle value on an odd count", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("is null for no data rather than 0, which would read as 'same day'", () => {
    expect(median([])).toBeNull();
  });

  it("does not mutate the caller's array", () => {
    const input = [3, 1, 2];
    median(input);
    expect(input).toEqual([3, 1, 2]);
  });
});
