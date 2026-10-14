import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { SetLogDB } from "../src/db/database";
import {
  exportBackup,
  importBackup,
  previewImport,
} from "../src/features/settings/backup";
import { seedExercises } from "../src/db/seed";
import type { Backup } from "../src/types/domain";
let db: SetLogDB;
beforeEach(() => {
  db = new SetLogDB("merge-" + crypto.randomUUID());
});
afterEach(async () => {
  await db.delete();
});
const old = "2026-10-13T00:00:00.000Z",
  newer = "2026-10-14T00:00:00.000Z";
function backup(
  id: string,
  time = old,
  weight = 60,
  status: "active" | "completed" = "completed",
): Backup {
  return {
    format: "setlog",
    version: 1,
    exportedAt: time,
    exercises: seedExercises(),
    sessions: [
      {
        id,
        workoutDate: "2026-10-13",
        startedAt: old,
        completedAt: status === "completed" ? old : null,
        status,
        memo: "",
        createdAt: old,
        updatedAt: time,
      },
    ],
    workoutExercises: [
      {
        id: id + "-entry",
        sessionId: id,
        exerciseId: "default-0-0",
        name: "벤치프레스",
        muscleGroup: "가슴",
        displayOrder: 0,
      },
    ],
    sets: [
      {
        id: id + "-set",
        workoutExerciseId: id + "-entry",
        setNumber: 1,
        weight,
        reps: 10,
        completed: true,
        createdAt: old,
        updatedAt: time,
      },
    ],
  };
}
it("휴대폰 전용 기록과 PC의 새 기록을 같은 날짜여도 모두 유지한다", async () => {
  await importBackup(backup("phone"), db);
  const preview = await previewImport(backup("pc"), db);
  expect(preview.summary.added).toBe(1);
  await importBackup(backup("pc"), db, preview.fingerprint);
  expect((await exportBackup(db)).sessions.map((s) => s.id).sort()).toEqual([
    "pc",
    "phone",
  ]);
  expect(await db.sets.count()).toBe(2);
});
it("같은 백업을 반복 가져와도 중복되지 않는다", async () => {
  await importBackup(backup("a"), db);
  const result = await importBackup(backup("a"), db);
  expect(result.unchanged).toBe(1);
  expect(await db.sessions.count()).toBe(1);
  expect(await db.sets.count()).toBe(1);
});
it("동일 ID의 최신 세션과 세트 수정본을 적용한다", async () => {
  await importBackup(backup("a"), db);
  const result = await importBackup(backup("a", newer, 70), db);
  expect(result.updated).toBe(1);
  expect((await db.sets.get("a-set"))?.weight).toBe(70);
});
it("오래된 백업은 현재 수정본을 덮어쓰지 않는다", async () => {
  await importBackup(backup("a", newer, 70), db);
  const result = await importBackup(backup("a"), db);
  expect(result.keptLocal).toBe(1);
  expect((await db.sets.get("a-set"))?.weight).toBe(70);
});
it("같은 수정 시간의 충돌은 안내하고 현재 기록을 유지한다", async () => {
  await importBackup(backup("a"), db);
  const preview = await previewImport(backup("a", old, 80), db);
  expect(preview.summary.conflicts).toBe(1);
  await importBackup(backup("a", old, 80), db);
  expect((await db.sets.get("a-set"))?.weight).toBe(60);
});
it("최신 세션에서 삭제된 세트는 되살리지 않고 다른 운동은 유지한다", async () => {
  await importBackup(backup("a"), db);
  await importBackup(backup("b"), db);
  const incoming = backup("a", newer);
  incoming.sets = [];
  await importBackup(incoming, db);
  expect(await db.sets.get("a-set")).toBeUndefined();
  expect(await db.sets.get("b-set")).toBeDefined();
});
it("백업에 빠진 사용자 종목과 스냅샷을 유지한다", async () => {
  const local = backup("phone");
  local.exercises.push({
    ...local.exercises[0],
    id: "custom",
    name: "나의 운동",
    isCustom: true,
  });
  await importBackup(local, db);
  await importBackup(backup("pc"), db);
  expect((await db.exercises.get("custom"))?.name).toBe("나의 운동");
  expect((await db.workoutExercises.get("phone-entry"))?.name).toBe(
    "벤치프레스",
  );
});
it("종목의 최신 수정본 및 숨김을 적용한다", async () => {
  const incoming = backup("a", newer);
  incoming.exercises[0] = {
    ...incoming.exercises[0],
    name: "수정 이름",
    archived: true,
    updatedAt: newer,
  };
  await importBackup(backup("a"), db);
  await importBackup(incoming, db);
  expect(await db.exercises.get("default-0-0")).toMatchObject({
    name: "수정 이름",
    archived: true,
  });
  expect((await db.workoutExercises.get("a-entry"))?.name).toBe("벤치프레스");
});
it("다른 진행 중 운동이 겹치면 병합 전 거부하고 양쪽 기록을 지우지 않는다", async () => {
  await importBackup(backup("phone", old, 60, "active"), db);
  await expect(
    previewImport(backup("pc", newer, 70, "active"), db),
  ).rejects.toThrow("진행 중 운동");
  await expect(
    importBackup(backup("pc", newer, 70, "active"), db),
  ).rejects.toThrow("진행 중 운동");
  expect((await exportBackup(db)).sessions.map((s) => s.id)).toEqual(["phone"]);
});
it("같은 진행 중 운동의 완료본은 최신 상태로 갱신한다", async () => {
  await importBackup(backup("a", old, 60, "active"), db);
  await importBackup(backup("a", newer), db);
  expect((await db.sessions.get("a"))?.status).toBe("completed");
});
it("서로 다른 세션의 하위 ID 충돌은 거부하고 원본을 유지한다", async () => {
  await importBackup(backup("a"), db);
  const incoming = backup("b");
  incoming.sets[0].id = "a-set";
  await expect(importBackup(incoming, db)).rejects.toThrow("중복 ID");
  expect(await db.sessions.count()).toBe(1);
});
it("미리보기 후 데이터가 바뀌면 재확인을 요구한다", async () => {
  await importBackup(backup("a"), db);
  const incoming = backup("b");
  const preview = await previewImport(incoming, db);
  await db.sessions.update("a", { memo: "추가 메모" });
  await expect(importBackup(incoming, db, preview.fingerprint)).rejects.toThrow(
    "미리보기 이후",
  );
  expect(await db.sessions.get("b")).toBeUndefined();
});
it("병합 쓰기 실패 시 추가와 갱신을 모두 롤백한다", async () => {
  await importBackup(backup("a"), db);
  const spy = vi.spyOn(db.sets, "bulkPut").mockImplementation(() => {
    throw new Error("쓰기 실패");
  });
  await expect(importBackup(backup("b"), db)).rejects.toThrow("쓰기 실패");
  spy.mockRestore();
  expect((await exportBackup(db)).sessions.map((s) => s.id)).toEqual(["a"]);
  expect((await db.sets.get("a-set"))?.weight).toBe(60);
});
