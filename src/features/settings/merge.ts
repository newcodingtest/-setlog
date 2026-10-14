import type { Backup, WorkoutSession } from "../../types/domain";
export interface MergeSummary {
  added: number;
  updated: number;
  unchanged: number;
  keptLocal: number;
  conflicts: number;
  exercisesAdded: number;
  exercisesUpdated: number;
}
export interface MergePlan {
  backup: Backup;
  summary: MergeSummary;
}
function byId<T extends { id: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}
export function backupFingerprint(backup: Backup): string {
  return JSON.stringify({
    exercises: byId(backup.exercises),
    sessions: byId(backup.sessions),
    workoutExercises: byId(backup.workoutExercises),
    sets: byId(backup.sets),
  });
}
function bundles(backup: Backup) {
  const entries = new Map<string, Backup["workoutExercises"]>();
  const sets = new Map<string, Backup["sets"]>();
  for (const entry of backup.workoutExercises) {
    const group = entries.get(entry.sessionId) ?? [];
    group.push(entry);
    entries.set(entry.sessionId, group);
  }
  for (const set of backup.sets) {
    const group = sets.get(set.workoutExerciseId) ?? [];
    group.push(set);
    sets.set(set.workoutExerciseId, group);
  }
  return new Map(
    backup.sessions.map((session) => {
      const children = byId(entries.get(session.id) ?? []);
      const rows = byId(children.flatMap((e) => sets.get(e.id) ?? []));
      return [session.id, { session, entries: children, sets: rows }];
    }),
  );
}
export function planMerge(local: Backup, incoming: Backup): MergePlan {
  const summary: MergeSummary = {
    added: 0,
    updated: 0,
    unchanged: 0,
    keptLocal: 0,
    conflicts: 0,
    exercisesAdded: 0,
    exercisesUpdated: 0,
  };
  const exercises = new Map(local.exercises.map((e) => [e.id, e]));
  for (const exercise of incoming.exercises) {
    const old = exercises.get(exercise.id);
    if (!old) {
      exercises.set(exercise.id, exercise);
      summary.exercisesAdded++;
    } else if (Date.parse(exercise.updatedAt) > Date.parse(old.updatedAt)) {
      exercises.set(exercise.id, exercise);
      summary.exercisesUpdated++;
    } else if (
      Date.parse(exercise.updatedAt) === Date.parse(old.updatedAt) &&
      JSON.stringify(exercise) !== JSON.stringify(old)
    ) {
      summary.conflicts++;
    }
  }
  const localBundles = bundles(local),
    incomingBundles = bundles(incoming);
  const selected = new Map(localBundles);
  for (const [id, next] of incomingBundles) {
    const old = localBundles.get(id);
    if (!old) {
      selected.set(id, next);
      summary.added++;
      continue;
    }
    if (JSON.stringify(old) === JSON.stringify(next)) {
      summary.unchanged++;
      continue;
    }
    const latest = (bundle: typeof next) =>
      bundle.sets.reduce(
        (time, s) => Math.max(time, Date.parse(s.updatedAt)),
        Date.parse(bundle.session.updatedAt),
      );
    if (latest(next) > latest(old)) {
      selected.set(id, next);
      summary.updated++;
    } else {
      summary.keptLocal++;
      if (latest(next) === latest(old)) summary.conflicts++;
    }
  }
  const chosen = [...selected.values()];
  const sessions: WorkoutSession[] = chosen.map((b) => b.session);
  if (sessions.filter((s) => s.status === "active").length > 1)
    throw new Error(
      "서로 다른 진행 중 운동이 있습니다. 현재 운동과 백업 기기의 운동을 완료한 뒤 새 백업을 가져와주세요. 기존 기록은 변경되지 않았습니다.",
    );
  return {
    summary,
    backup: {
      format: "setlog",
      version: 1,
      exportedAt: incoming.exportedAt,
      exercises: [...exercises.values()],
      sessions,
      workoutExercises: chosen.flatMap((b) => b.entries),
      sets: chosen.flatMap((b) => b.sets),
    },
  };
}
