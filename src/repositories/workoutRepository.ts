import { db, type SetLogDB } from "../db/database";
import { seedExercises } from "../db/seed";
import { localDate, validDate } from "../lib/date";
import { validateSet } from "../lib/validation";
import type {
  Exercise,
  MuscleGroup,
  SessionDetail,
  WorkoutSession,
  WorkoutSet,
} from "../types/domain";
export class WorkoutRepository {
  constructor(private database: SetLogDB = db) {}
  async initialize() {
    await this.database.transaction("rw", this.database.exercises, async () => {
      const ids = new Set(
        await this.database.exercises.toCollection().primaryKeys(),
      );
      await this.database.exercises.bulkAdd(
        seedExercises().filter((e) => !ids.has(e.id)),
      );
    });
  }
  async exercises() {
    return (await this.database.exercises.toArray())
      .filter((e) => !e.archived)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }
  async saveExercise(name: string, muscleGroup: MuscleGroup, id?: string) {
    name = name.trim();
    if (!name || name.length > 80)
      throw new Error("운동명은 1~80자로 입력해주세요.");
    const now = new Date().toISOString();
    return this.database.transaction(
      "rw",
      this.database.exercises,
      async () => {
        if (
          (await this.database.exercises.toArray()).some(
            (e) => !e.archived && e.id !== id && e.name === name,
          )
        )
          throw new Error("같은 이름의 운동이 있습니다.");
        if (id) {
          const old = await this.database.exercises.get(id);
          if (!old?.isCustom)
            throw new Error("사용자 운동만 수정할 수 있습니다.");
          await this.database.exercises.update(id, {
            name,
            muscleGroup,
            updatedAt: now,
          });
          return id;
        }
        const exercise: Exercise = {
          id: crypto.randomUUID(),
          name,
          muscleGroup,
          isCustom: true,
          archived: false,
          createdAt: now,
          updatedAt: now,
        };
        await this.database.exercises.add(exercise);
        return exercise.id;
      },
    );
  }
  async archiveExercise(id: string) {
    const exercise = await this.database.exercises.get(id);
    if (!exercise?.isCustom)
      throw new Error("사용자 운동만 삭제할 수 있습니다.");
    await this.database.exercises.update(id, {
      archived: true,
      updatedAt: new Date().toISOString(),
    });
  }
  async sessions() {
    return (await this.database.sessions.toArray()).sort(
      (a, b) =>
        b.workoutDate.localeCompare(a.workoutDate) ||
        b.startedAt.localeCompare(a.startedAt),
    );
  }
  async active() {
    return this.database.sessions.where("status").equals("active").first();
  }
  async start() {
    return this.database.transaction("rw", this.database.sessions, async () => {
      const existing = await this.active();
      if (existing) return existing.id;
      const now = new Date().toISOString();
      const session: WorkoutSession = {
        id: crypto.randomUUID(),
        workoutDate: localDate(),
        startedAt: now,
        completedAt: null,
        status: "active",
        memo: "",
        createdAt: now,
        updatedAt: now,
      };
      await this.database.sessions.add(session);
      return session.id;
    });
  }
  async detail(id: string): Promise<SessionDetail> {
    const session = await this.database.sessions.get(id);
    if (!session) throw new Error("운동 기록을 찾을 수 없습니다.");
    const entries = (
      await this.database.workoutExercises
        .where("sessionId")
        .equals(id)
        .toArray()
    ).sort((a, b) => a.displayOrder - b.displayOrder);
    const exercises = await Promise.all(
      entries.map(async (entry) => ({
        ...entry,
        sets: (
          await this.database.sets
            .where("workoutExerciseId")
            .equals(entry.id)
            .toArray()
        ).sort((a, b) => a.setNumber - b.setNumber),
      })),
    );
    return { ...session, exercises };
  }
  private async touch(sessionId: string) {
    await this.database.sessions.update(sessionId, {
      updatedAt: new Date().toISOString(),
    });
  }
  async addExercise(sessionId: string, exerciseId: string) {
    return this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.exercises,
      this.database.workoutExercises,
      this.database.sets,
      async () => {
        if (!(await this.database.sessions.get(sessionId)))
          throw new Error("세션을 찾을 수 없습니다.");
        const exercise = await this.database.exercises.get(exerciseId);
        if (!exercise || exercise.archived)
          throw new Error("종목을 찾을 수 없습니다.");
        const entries = await this.database.workoutExercises
          .where("sessionId")
          .equals(sessionId)
          .toArray();
        if (entries.some((e) => e.exerciseId === exerciseId))
          throw new Error("이미 추가한 운동입니다.");
        const id = crypto.randomUUID();
        await this.database.workoutExercises.add({
          id,
          sessionId,
          exerciseId,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          displayOrder: entries.length,
        });
        await this.addSet(id);
        await this.touch(sessionId);
        return id;
      },
    );
  }
  async addSet(workoutExerciseId: string) {
    return this.database.transaction(
      "rw",
      this.database.sets,
      this.database.workoutExercises,
      this.database.sessions,
      async () => {
        const entry =
          await this.database.workoutExercises.get(workoutExerciseId);
        if (!entry) throw new Error("종목을 찾을 수 없습니다.");
        const sets = (
          await this.database.sets
            .where("workoutExerciseId")
            .equals(workoutExerciseId)
            .toArray()
        ).sort((a, b) => a.setNumber - b.setNumber);
        const last = sets.at(-1);
        const now = new Date().toISOString();
        const set: WorkoutSet = {
          id: crypto.randomUUID(),
          workoutExerciseId,
          setNumber: sets.length + 1,
          weight: last?.weight ?? 0,
          reps: last?.reps ?? 10,
          completed: false,
          createdAt: now,
          updatedAt: now,
        };
        await this.database.sets.add(set);
        await this.touch(entry.sessionId);
        return set.id;
      },
    );
  }
  async updateSet(
    id: string,
    values: Pick<WorkoutSet, "weight" | "reps" | "completed">,
  ) {
    validateSet(values.weight, values.reps);
    await this.database.transaction(
      "rw",
      this.database.sets,
      this.database.workoutExercises,
      this.database.sessions,
      async () => {
        const set = await this.database.sets.get(id);
        if (!set) throw new Error("세트를 찾을 수 없습니다.");
        const entry = await this.database.workoutExercises.get(
          set.workoutExerciseId,
        );
        if (!entry) throw new Error("종목을 찾을 수 없습니다.");
        await this.database.sets.update(id, {
          ...values,
          updatedAt: new Date().toISOString(),
        });
        await this.touch(entry.sessionId);
      },
    );
  }
  async removeSet(id: string) {
    await this.database.transaction(
      "rw",
      this.database.sets,
      this.database.workoutExercises,
      this.database.sessions,
      async () => {
        const set = await this.database.sets.get(id);
        if (!set) return;
        const entry = await this.database.workoutExercises.get(
          set.workoutExerciseId,
        );
        await this.database.sets.delete(id);
        const sets = (
          await this.database.sets
            .where("workoutExerciseId")
            .equals(set.workoutExerciseId)
            .toArray()
        ).sort((a, b) => a.setNumber - b.setNumber);
        await Promise.all(
          sets.map((s, i) =>
            this.database.sets.update(s.id, { setNumber: i + 1 }),
          ),
        );
        if (entry) await this.touch(entry.sessionId);
      },
    );
  }
  async removeExercise(id: string) {
    await this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.workoutExercises,
      this.database.sets,
      async () => {
        const entry = await this.database.workoutExercises.get(id);
        if (!entry) return;
        await this.database.sets.where("workoutExerciseId").equals(id).delete();
        await this.database.workoutExercises.delete(id);
        const entries = (
          await this.database.workoutExercises
            .where("sessionId")
            .equals(entry.sessionId)
            .toArray()
        ).sort((a, b) => a.displayOrder - b.displayOrder);
        await Promise.all(
          entries.map((e, i) =>
            this.database.workoutExercises.update(e.id, { displayOrder: i }),
          ),
        );
        await this.touch(entry.sessionId);
      },
    );
  }
  async moveExercise(id: string, direction: -1 | 1) {
    await this.database.transaction(
      "rw",
      this.database.workoutExercises,
      this.database.sessions,
      async () => {
        const entry = await this.database.workoutExercises.get(id);
        if (!entry) return;
        const entries = (
          await this.database.workoutExercises
            .where("sessionId")
            .equals(entry.sessionId)
            .toArray()
        ).sort((a, b) => a.displayOrder - b.displayOrder);
        const index = entries.findIndex((e) => e.id === id);
        const other = entries[index + direction];
        if (!other) return;
        await this.database.workoutExercises.update(id, {
          displayOrder: other.displayOrder,
        });
        await this.database.workoutExercises.update(other.id, {
          displayOrder: entry.displayOrder,
        });
        await this.touch(entry.sessionId);
      },
    );
  }
  async updateSession(id: string, workoutDate: string, memo: string) {
    if (!validDate(workoutDate)) throw new Error("올바른 날짜를 입력해주세요.");
    if (memo.length > 2000)
      throw new Error("메모는 2,000자까지 입력할 수 있습니다.");
    if (
      !(await this.database.sessions.update(id, {
        workoutDate,
        memo,
        updatedAt: new Date().toISOString(),
      }))
    )
      throw new Error("기록을 찾을 수 없습니다.");
  }
  async complete(id: string) {
    await this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.workoutExercises,
      this.database.sets,
      async () => {
        const detail = await this.detail(id);
        if (!detail.exercises.some((e) => e.sets.some((s) => s.completed)))
          throw new Error("최소 한 세트를 완료해주세요.");
        const now = new Date().toISOString();
        await this.database.sessions.update(id, {
          status: "completed",
          completedAt: detail.completedAt ?? now,
          updatedAt: now,
        });
      },
    );
  }
  async deleteSession(id: string) {
    await this.database.transaction(
      "rw",
      this.database.sessions,
      this.database.workoutExercises,
      this.database.sets,
      async () => {
        const entries = await this.database.workoutExercises
          .where("sessionId")
          .equals(id)
          .toArray();
        await this.database.sets
          .where("workoutExerciseId")
          .anyOf(entries.map((e) => e.id))
          .delete();
        await this.database.workoutExercises
          .where("sessionId")
          .equals(id)
          .delete();
        await this.database.sessions.delete(id);
      },
    );
  }
  async previous(exerciseId: string, currentId: string): Promise<WorkoutSet[]> {
    const current = await this.database.sessions.get(currentId);
    if (!current) return [];
    const sessions = (await this.sessions()).filter(
      (s) =>
        s.status === "completed" &&
        s.id !== currentId &&
        (s.workoutDate < current.workoutDate ||
          (s.workoutDate === current.workoutDate &&
            s.startedAt < current.startedAt)),
    );
    for (const session of sessions) {
      const entries = await this.database.workoutExercises
        .where("sessionId")
        .equals(session.id)
        .toArray();
      const entry = entries.find((e) => e.exerciseId === exerciseId);
      if (entry) {
        const sets = (
          await this.database.sets
            .where("workoutExerciseId")
            .equals(entry.id)
            .toArray()
        )
          .filter((s) => s.completed)
          .sort((a, b) => a.setNumber - b.setNumber);
        if (sets.length) return sets;
      }
    }
    return [];
  }
  async completedDetails() {
    return Promise.all(
      (await this.sessions())
        .filter((s) => s.status === "completed")
        .map((s) => this.detail(s.id)),
    );
  }
}
export const workoutRepository = new WorkoutRepository();
