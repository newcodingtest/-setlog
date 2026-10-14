import type { SessionDetail, WorkoutSet } from "../../types/domain";
import { daysAgo, localDate, weekStart } from "../../lib/date";
export function volume(sets: WorkoutSet[]): number {
  return sets
    .filter((s) => s.completed)
    .reduce((n, s) => n + s.weight * s.reps, 0);
}
export function sessionVolume(session: SessionDetail): number {
  return session.exercises.reduce((n, e) => n + volume(e.sets), 0);
}
export function overallStats(sessions: SessionDetail[], now = new Date()) {
  const completed = sessions.filter((s) => s.status === "completed");
  const today = localDate(now);
  const range = (start: string) =>
    completed.filter((s) => s.workoutDate >= start && s.workoutDate <= today);
  return {
    total: completed.length,
    week: range(weekStart(now)).length,
    last7: range(daysAgo(6, now)).length,
    last30: range(daysAgo(29, now)).length,
    volume30: range(daysAgo(29, now)).reduce((n, s) => n + sessionVolume(s), 0),
  };
}
export function exerciseStats(sessions: SessionDetail[], id: string) {
  const dates = new Map<
    string,
    { date: string; maxWeight: number; volume: number; reps: number }
  >();
  for (const session of sessions.filter((s) => s.status === "completed")) {
    const sets = session.exercises
      .filter((e) => e.exerciseId === id)
      .flatMap((e) => e.sets)
      .filter((s) => s.completed);
    if (!sets.length) continue;
    const point = dates.get(session.workoutDate) ?? {
      date: session.workoutDate,
      maxWeight: 0,
      volume: 0,
      reps: 0,
    };
    point.maxWeight = Math.max(point.maxWeight, ...sets.map((s) => s.weight));
    point.volume += volume(sets);
    point.reps += sets.reduce((n, s) => n + s.reps, 0);
    dates.set(point.date, point);
  }
  const points = [...dates.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  return {
    points,
    maxWeight: Math.max(0, ...points.map((p) => p.maxWeight)),
    totalVolume: points.reduce((n, p) => n + p.volume, 0),
    totalReps: points.reduce((n, p) => n + p.reps, 0),
  };
}
