import { backupFingerprint, planMerge } from "./merge";
import { db, type SetLogDB } from "../../db/database";
import {
  muscleGroups,
  type Backup,
  type MuscleGroup,
} from "../../types/domain";
import { validDate } from "../../lib/date";
import { validateSet } from "../../lib/validation";
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("잘못된 백업 형식입니다.");
  return value as Record<string, unknown>;
}
function text(row: Record<string, unknown>, key: string, max = 2000): string {
  const value = row[key];
  if (typeof value !== "string" || value.length > max)
    throw new Error("잘못된 필드: " + key);
  return value;
}
function id(row: Record<string, unknown>, key = "id"): string {
  const value = text(row, key, 128);
  if (!value.trim()) throw new Error("비어 있는 ID입니다.");
  return value;
}
function timestamp(row: Record<string, unknown>, key: string): string {
  const value = text(row, key, 64);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
    throw new Error("잘못된 타임스탬프입니다.");
  return value;
}
function bool(row: Record<string, unknown>, key: string): boolean {
  if (typeof row[key] !== "boolean") throw new Error("잘못된 불리언 값입니다.");
  return row[key] as boolean;
}
function integer(row: Record<string, unknown>, key: string, min = 0): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min)
    throw new Error("잘못된 정수 값입니다.");
  return value;
}
function group(row: Record<string, unknown>): MuscleGroup {
  const value = text(row, "muscleGroup");
  if (!muscleGroups.includes(value as MuscleGroup))
    throw new Error("잘못된 운동 부위입니다.");
  return value as MuscleGroup;
}
function list(
  row: Record<string, unknown>,
  key: string,
): Record<string, unknown>[] {
  if (!Array.isArray(row[key]) || row[key].length > 100000)
    throw new Error("잘못된 데이터 목록입니다.");
  return row[key].map(object);
}
function unique(rows: { id: string }[]) {
  if (new Set(rows.map((r) => r.id)).size !== rows.length)
    throw new Error("중복 ID가 포함되어 있습니다.");
}
export function parseBackup(value: unknown): Backup {
  const row = object(value);
  if (row.format !== "setlog" || row.version !== 1)
    throw new Error("지원하지 않는 백업 형식 또는 버전입니다.");
  const exercises = list(row, "exercises").map((r) => ({
    id: id(r),
    name: text(r, "name", 80),
    muscleGroup: group(r),
    isCustom: bool(r, "isCustom"),
    archived: bool(r, "archived"),
    createdAt: timestamp(r, "createdAt"),
    updatedAt: timestamp(r, "updatedAt"),
  }));
  if (exercises.some((e) => !e.name.trim()))
    throw new Error("운동명이 비어 있습니다.");
  const sessions = list(row, "sessions").map((r) => {
    const workoutDate = text(r, "workoutDate", 10);
    if (!validDate(workoutDate)) throw new Error("잘못된 운동 날짜입니다.");
    if (r.status !== "active" && r.status !== "completed")
      throw new Error("잘못된 세션 상태입니다.");
    const completedAt =
      r.completedAt === null ? null : timestamp(r, "completedAt");
    if ((r.status === "completed") !== (completedAt !== null))
      throw new Error("세션 상태와 완료 시간이 일치하지 않습니다.");
    return {
      id: id(r),
      workoutDate,
      startedAt: timestamp(r, "startedAt"),
      completedAt,
      status: r.status as "active" | "completed",
      memo: text(r, "memo"),
      createdAt: timestamp(r, "createdAt"),
      updatedAt: timestamp(r, "updatedAt"),
    };
  });
  if (sessions.filter((s) => s.status === "active").length > 1)
    throw new Error("진행 중인 세션은 하나만 허용됩니다.");
  const workoutExercises = list(row, "workoutExercises").map((r) => ({
    id: id(r),
    sessionId: id(r, "sessionId"),
    exerciseId: id(r, "exerciseId"),
    name: text(r, "name", 80),
    muscleGroup: group(r),
    displayOrder: integer(r, "displayOrder"),
  }));
  const sets = list(row, "sets").map((r) => {
    const weight = r.weight,
      reps = r.reps;
    if (typeof weight !== "number" || typeof reps !== "number")
      throw new Error("잘못된 세트 값입니다.");
    validateSet(weight, reps);
    return {
      id: id(r),
      workoutExerciseId: id(r, "workoutExerciseId"),
      setNumber: integer(r, "setNumber", 1),
      weight,
      reps,
      completed: bool(r, "completed"),
      createdAt: timestamp(r, "createdAt"),
      updatedAt: timestamp(r, "updatedAt"),
    };
  });
  [exercises, sessions, workoutExercises, sets].forEach(unique);
  const exerciseIds = new Set(exercises.map((e) => e.id)),
    sessionIds = new Set(sessions.map((s) => s.id)),
    entryIds = new Set(workoutExercises.map((e) => e.id));
  if (
    workoutExercises.some(
      (e) =>
        !exerciseIds.has(e.exerciseId) ||
        !sessionIds.has(e.sessionId) ||
        !e.name.trim(),
    ) ||
    sets.some((s) => !entryIds.has(s.workoutExerciseId))
  )
    throw new Error("연결이 끊어진 데이터가 있습니다.");
  const orders = new Set<string>(),
    numbers = new Set<string>(),
    exerciseKeys = new Set<string>();
  for (const e of workoutExercises) {
    const key = JSON.stringify([e.sessionId, e.displayOrder]),
      exerciseKey = JSON.stringify([e.sessionId, e.exerciseId]);
    if (orders.has(key) || exerciseKeys.has(exerciseKey))
      throw new Error("중복 운동 또는 정렬 순서입니다.");
    orders.add(key);
    exerciseKeys.add(exerciseKey);
  }
  for (const s of sets) {
    const key = JSON.stringify([s.workoutExerciseId, s.setNumber]);
    if (numbers.has(key)) throw new Error("중복 세트 번호입니다.");
    numbers.add(key);
  }
  const entryOrders = new Map<string, number[]>(),
    setOrders = new Map<string, number[]>();
  for (const entry of workoutExercises) {
    const orders = entryOrders.get(entry.sessionId) ?? [];
    orders.push(entry.displayOrder);
    entryOrders.set(entry.sessionId, orders);
  }
  for (const set of sets) {
    const numbers = setOrders.get(set.workoutExerciseId) ?? [];
    numbers.push(set.setNumber);
    setOrders.set(set.workoutExerciseId, numbers);
  }
  for (const orders of entryOrders.values())
    if (orders.sort((a, b) => a - b).some((value, i) => value !== i))
      throw new Error("운동 순서는 0부터 연속되어야 합니다.");
  for (const numbers of setOrders.values())
    if (numbers.sort((a, b) => a - b).some((value, i) => value !== i + 1))
      throw new Error("세트 번호는 1부터 연속되어야 합니다.");
  return {
    format: "setlog",
    version: 1,
    exportedAt: timestamp(row, "exportedAt"),
    exercises,
    sessions,
    workoutExercises,
    sets,
  };
}
export async function exportBackup(database: SetLogDB = db): Promise<Backup> {
  return database.transaction("r", database.tables, async () => ({
    format: "setlog",
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: await database.exercises.toArray(),
    sessions: await database.sessions.toArray(),
    workoutExercises: await database.workoutExercises.toArray(),
    sets: await database.sets.toArray(),
  }));
}
export async function previewImport(value: unknown, database: SetLogDB = db) {
  const incoming = parseBackup(value);
  return database.transaction("r", database.tables, async () => {
    const local = parseBackup(await exportBackup(database));
    const plan = planMerge(local, incoming);
    parseBackup(plan.backup);
    return { summary: plan.summary, fingerprint: backupFingerprint(local) };
  });
}
export async function importBackup(
  value: unknown,
  database: SetLogDB = db,
  expectedFingerprint?: string,
) {
  const incoming = parseBackup(value);
  return database.transaction("rw", database.tables, async () => {
    const local = parseBackup(await exportBackup(database));
    if (
      expectedFingerprint !== undefined &&
      backupFingerprint(local) !== expectedFingerprint
    )
      throw new Error(
        "미리보기 이후 기록이 변경되었습니다. 파일을 다시 선택해 병합 내용을 확인해주세요.",
      );
    const plan = planMerge(local, incoming);
    const merged = parseBackup(plan.backup);
    const entryIds = new Set(merged.workoutExercises.map((e) => e.id)),
      setIds = new Set(merged.sets.map((s) => s.id));
    await database.sets.bulkDelete(
      local.sets.filter((s) => !setIds.has(s.id)).map((s) => s.id),
    );
    await database.workoutExercises.bulkDelete(
      local.workoutExercises
        .filter((e) => !entryIds.has(e.id))
        .map((e) => e.id),
    );
    await database.exercises.bulkPut(merged.exercises);
    await database.sessions.bulkPut(merged.sessions);
    await database.workoutExercises.bulkPut(merged.workoutExercises);
    await database.sets.bulkPut(merged.sets);
    return plan.summary;
  });
}
export async function resetData(database: SetLogDB = db) {
  await database.transaction("rw", database.tables, async () => {
    await Promise.all(database.tables.map((t) => t.clear()));
  });
}
