import { describe, expect, it } from "vitest";
import { addedText, foundText, nothingFoundText, plansAndSessions } from "./importSummary";

const data = (plans: number, sessions: number, skippedRows = 0) => ({
  plans: Array.from({ length: plans }, () => ({ id: "", name: "", desc: "", exercises: [] })),
  sessions: Array.from({ length: sessions }, () => ({ id: "", planId: "", planName: "", date: "", notes: "", exercises: [] })),
  skippedRows,
});

describe("import summary text", () => {
  it("states counts with singular and plural nouns", () => {
    expect(plansAndSessions(1, 168)).toBe("1 plan and 168 sessions");
    expect(foundText(data(17, 1))).toBe("17 plans and 1 session found");
  });

  it("reports skipped rows", () => {
    expect(foundText(data(2, 3, 1))).toBe("2 plans and 3 sessions found. 1 row skipped: a column, field or unit was missing or unknown.");
  });

  it("explains an import with nothing in it", () => {
    expect(nothingFoundText(0)).toBe("No plans or sessions found in this file.");
    expect(nothingFoundText(2)).toBe("No plans or sessions found: 2 rows skipped because a column, field or unit was missing or unknown.");
  });

  it("says when an add brought nothing new", () => {
    expect(addedText(0, 0)).toMatch(/Nothing new/);
    expect(addedText(0, 2)).toBe("Added 0 plans and 2 sessions.");
  });

  it("counts the sessions an add skipped because they were already here", () => {
    expect(addedText(3, 41, 0)).toBe("Added 3 plans and 41 sessions.");
    expect(addedText(1, 1, 1)).toBe("Added 1 plan and 1 session. 1 session already here was skipped.");
    expect(addedText(3, 41, 127)).toBe("Added 3 plans and 41 sessions. 127 sessions already here were skipped.");
    expect(addedText(0, 0, 5)).toMatch(/Nothing new/);
  });
});
