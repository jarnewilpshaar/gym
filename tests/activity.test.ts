import { test } from "node:test";
import assert from "node:assert/strict";
import { localDay, summarizeActivity } from "../packages/shared/activity.ts";
test("Amsterdam day boundary handles UTC midnight and summer time", () => {
  assert.equal(localDay(new Date("2026-11-04T23:30:00Z")), "2026-11-05");
  assert.equal(localDay(new Date("2026-07-04T22:30:00Z")), "2026-07-05");
});
test("week count excludes previous weeks and uncompleted workouts", () => {
  const result = summarizeActivity(
    [
      { dayKey: "2026-11-01:v1", completed: true },
      { dayKey: "2026-11-02:v1", completed: true },
      { dayKey: "2026-11-04:v1", completed: false },
      { dayKey: "2026-11-05:v1", completed: true },
    ],
    "2026-11-05",
  );
  assert.equal(result.weekCount, 2);
  assert.equal(result.streak, 1);
});
test("streak allows today to be pending and ignores duplicate workouts per day", () => {
  const result = summarizeActivity(
    ["2026-11-04:a", "2026-11-04:b", "2026-11-03:a"].map((dayKey) => ({
      dayKey,
      completed: true,
    })),
    "2026-11-05",
  );
  assert.equal(result.streak, 2);
});
