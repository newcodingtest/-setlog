import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { SetLogDB } from "../src/db/database";
import { WorkoutRepository } from "../src/repositories/workoutRepository";
import {
  exportBackup,
  importBackup,
  parseBackup,
} from "../src/features/settings/backup";
import {
  exerciseStats,
  overallStats,
  volume,
} from "../src/features/statistics/calculations";
import { parseSetInput } from "../src/lib/validation";
import { localDate, validDate } from "../src/lib/date";
let db: SetLogDB;
let repo: WorkoutRepository;
beforeEach(async () => {
  db = new SetLogDB("test-" + crypto.randomUUID());
  repo = new WorkoutRepository(db);
  await repo.initialize();
});
afterEach(async () => {
  await db.delete();
});
async function bench() {
  const id = await repo.start();
  const exercise = (await repo.exercises()).find(
    (e) => e.name === "벤치프레스",
  )!;
  const entry = await repo.addExercise(id, exercise.id);
  const set = (await repo.detail(id)).exercises[0].sets[0];
  return { id, exercise, entry, set };
}
describe("실제 IndexedDB 저장소", () => {
  it("기본 종목 23개를 중복 없이 생성한다", async () => {
    await repo.initialize();
    expect(await repo.exercises()).toHaveLength(23);
  });
  it("동시에 시작해도 진행 중 세션 하나를 복구한다", async () => {
    const ids = await Promise.all([repo.start(), repo.start()]);
    expect(ids[0]).toBe(ids[1]);
    expect((await repo.sessions()).length).toBe(1);
  });
  it("세트를 수정하고 직전 값을 복사하며 재연결 후 복구한다", async () => {
    const { id, entry, set } = await bench();
    await repo.updateSet(set.id, { weight: 60.5, reps: 10, completed: true });
    await repo.addSet(entry);
    const detail = await repo.detail(id);
    expect(detail.exercises[0].sets[1]).toMatchObject({
      weight: 60.5,
      reps: 10,
      completed: false,
      setNumber: 2,
    });
    db.close();
    await db.open();
    expect((await repo.active())?.id).toBe(id);
    expect((await repo.detail(id)).exercises[0].sets[0].weight).toBe(60.5);
  });
  it("60×10,70×8,70×8을 완료하고 이전 기록과 통계에 반영한다", async () => {
    const { id, entry, set, exercise } = await bench();
    await repo.updateSet(set.id, { weight: 60, reps: 10, completed: true });
    for (let i = 0; i < 2; i++) {
      const added = await repo.addSet(entry);
      await repo.updateSet(added, { weight: 70, reps: 8, completed: true });
    }
    await repo.complete(id);
    const next = await repo.start();
    expect(await repo.previous(exercise.id, next)).toHaveLength(3);
    const sessions = await repo.completedDetails();
    expect(exerciseStats(sessions, exercise.id)).toMatchObject({
      maxWeight: 70,
      totalVolume: 1720,
      totalReps: 26,
    });
    expect(overallStats(sessions).total).toBe(1);
  });
  it("완료되지 않은 세트와 진행 중 세션을 통계에서 제외한다", async () => {
    const { id, entry, set, exercise } = await bench();
    await repo.updateSet(set.id, { weight: 60, reps: 10, completed: true });
    const added = await repo.addSet(entry);
    await repo.updateSet(added, { weight: 100, reps: 10, completed: false });
    expect(
      exerciseStats([await repo.detail(id)], exercise.id).points,
    ).toHaveLength(0);
    await repo.complete(id);
    expect(volume((await repo.detail(id)).exercises[0].sets)).toBe(600);
  });
  it("종목 수정 및 삭제 후에도 과거 스냅샷을 보존한다", async () => {
    const exerciseId = await repo.saveExercise("나의 운동", "기타");
    const id = await repo.start();
    await repo.addExercise(id, exerciseId);
    await repo.saveExercise("새 운동명", "팔", exerciseId);
    await repo.archiveExercise(exerciseId);
    expect((await repo.detail(id)).exercises[0]).toMatchObject({
      name: "나의 운동",
      muscleGroup: "기타",
    });
    expect((await repo.exercises()).some((e) => e.id === exerciseId)).toBe(
      false,
    );
  });
  it("종목 순서와 세트 번호를 재정렬한다", async () => {
    const { id, entry, set } = await bench();
    const second = await repo.addExercise(
      id,
      (await repo.exercises()).find((e) => e.name === "스쿼트")!.id,
    );
    await repo.moveExercise(second, -1);
    expect((await repo.detail(id)).exercises[0].id).toBe(second);
    await repo.addSet(entry);
    await repo.removeSet(set.id);
    expect((await repo.detail(id)).exercises[1].sets[0].setNumber).toBe(1);
    await repo.removeExercise(second);
    expect((await repo.detail(id)).exercises[0].displayOrder).toBe(0);
  });
  it("세션 삭제 시 연결된 세트도 삭제한다", async () => {
    const { id } = await bench();
    await repo.deleteSession(id);
    expect(await db.sessions.count()).toBe(0);
    expect(await db.workoutExercises.count()).toBe(0);
    expect(await db.sets.count()).toBe(0);
  });
  it("날짜별 히스토리를 로컬 날짜로 보존한다", async () => {
    const { id, set } = await bench();
    await repo.updateSet(set.id, { weight: 0, reps: 12, completed: true });
    await repo.updateSession(id, "2026-10-13", "맨몸");
    await repo.complete(id);
    const sessions = await repo.completedDetails();
    expect(sessions[0].workoutDate).toBe("2026-10-13");
    expect(overallStats(sessions, new Date(2026, 9, 14)).last7).toBe(1);
    expect(volume(sessions[0].exercises[0].sets)).toBe(0);
  });
  it("완료 세트 없는 운동의 완료를 막는다", async () => {
    const { id } = await bench();
    await expect(repo.complete(id)).rejects.toThrow("최소 한 세트");
  });
  it("백업 내보내기와 교체 복구를 수행한다", async () => {
    const { id, set } = await bench();
    await repo.updateSet(set.id, { weight: 70.5, reps: 8, completed: true });
    const backup = await exportBackup(db);
    await repo.deleteSession(id);
    await importBackup(backup, db);
    expect((await repo.detail(id)).exercises[0].sets[0].weight).toBe(70.5);
    expect((await repo.active())?.id).toBe(id);
  });
  it("잘못된 백업과 중복 ID를 거부하고 기존 데이터를 유지한다", async () => {
    const { id } = await bench();
    const backup = await exportBackup(db);
    await expect(
      importBackup({ ...backup, version: 99 }, db),
    ).rejects.toThrow();
    await expect(
      importBackup({ ...backup, sets: [...backup.sets, ...backup.sets] }, db),
    ).rejects.toThrow("중복");
    await expect(
      importBackup({ ...backup, workoutExercises: [] }, db),
    ).rejects.toThrow("연결");
    expect((await repo.detail(id)).exercises).toHaveLength(1);
  });
  it("중복 세트 번호와 종목 순서를 거부한다", async () => {
    await bench();
    const backup = await exportBackup(db);
    const duplicate = { ...backup.sets[0], id: crypto.randomUUID() };
    expect(() =>
      parseBackup({ ...backup, sets: [...backup.sets, duplicate] }),
    ).toThrow("중복 세트");
  });
  it("입력 유효성을 저장소에서 다시 확인한다", async () => {
    const { set } = await bench();
    for (const values of [
      { weight: -1, reps: 10, completed: true },
      { weight: 60, reps: 0, completed: true },
      { weight: 60, reps: 1.5, completed: true },
      { weight: Infinity, reps: 2, completed: true },
    ])
      await expect(repo.updateSet(set.id, values)).rejects.toThrow();
    expect((await db.sets.get(set.id))?.weight).toBe(0);
  });
});
describe("날짜와 입력 검증", () => {
  it("공백과 소수 반복은 거부하고 소수 중량과 맨몸을 허용한다", () => {
    expect(() => parseSetInput("", "10")).toThrow();
    expect(() => parseSetInput("60", "1.5")).toThrow();
    expect(parseSetInput("0", "10")).toEqual({ weight: 0, reps: 10 });
    expect(parseSetInput("60.5", "8")).toEqual({ weight: 60.5, reps: 8 });
  });
  it("로컬 날짜를 사용하고 존재하지 않는 날짜를 거부한다", () => {
    expect(localDate(new Date(2026, 9, 14, 0, 1))).toBe("2026-10-14");
    expect(validDate("2026-02-30")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
  });
});

it("복구 도중 오류가 발생해도 기존 데이터를 트랜잭션으로 되돌린다", async () => {
  const { id } = await bench();
  const backup = await exportBackup(db);
  const spy = vi.spyOn(db.sets, "bulkAdd").mockImplementation(() => {
    throw new Error("쓰기 실패");
  });
  await expect(importBackup(backup, db)).rejects.toThrow("쓰기 실패");
  spy.mockRestore();
  expect((await repo.detail(id)).exercises[0].sets).toHaveLength(1);
});
it("완료 세트 없는 최근 종목보다 이전 완료 기록을 제안한다", async () => {
  const { id, exercise, set } = await bench();
  await repo.updateSet(set.id, { weight: 60, reps: 10, completed: true });
  await repo.updateSession(id, "2026-01-01", "");
  await repo.complete(id);
  const second = await repo.start();
  await repo.updateSession(second, "2026-01-02", "");
  await repo.addExercise(second, exercise.id);
  const other = await repo.addExercise(
    second,
    (await repo.exercises()).find((e) => e.name === "스쿼트")!.id,
  );
  const otherSet = (await db.sets
    .where("workoutExerciseId")
    .equals(other)
    .first())!;
  await repo.updateSet(otherSet.id, { weight: 80, reps: 5, completed: true });
  await repo.complete(second);
  const current = await repo.start();
  expect((await repo.previous(exercise.id, current))[0].weight).toBe(60);
});
it("세트 번호에 빈 구간이 있는 백업을 거부한다", async () => {
  await bench();
  const backup = await exportBackup(db);
  expect(() =>
    parseBackup({
      ...backup,
      sets: backup.sets.map((s) => ({ ...s, setNumber: 5 })),
    }),
  ).toThrow("연속");
});
