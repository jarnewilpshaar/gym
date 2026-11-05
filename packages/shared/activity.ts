export function localDay(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function summarizeActivity(
  logs: { dayKey: string; completed: boolean }[],
  today = localDay(),
) {
  const completed = logs.filter((log) => log.completed);
  const dates = new Set(completed.map((log) => log.dayKey.slice(0, 10)));
  const cursor = new Date(`${today}T12:00:00Z`);
  const monday = new Date(cursor);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0, 10);
  const weekCount = completed.filter(
    (log) =>
      log.dayKey.slice(0, 10) >= weekStart && log.dayKey.slice(0, 10) <= today,
  ).length;
  if (!dates.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { weekCount, streak, dates };
}
