import Dexie, { type Table } from "dexie";
import type {
  Exercise,
  WorkoutSession,
  WorkoutExercise,
  WorkoutSet,
} from "../types/domain";
export class SetLogDB extends Dexie {
  exercises!: Table<Exercise, string>;
  sessions!: Table<WorkoutSession, string>;
  workoutExercises!: Table<WorkoutExercise, string>;
  sets!: Table<WorkoutSet, string>;
  constructor(name = "setlog") {
    super(name);
    this.version(1).stores({
      exercises: "id,name,muscleGroup",
      sessions: "id,workoutDate,status,startedAt",
      workoutExercises: "id,sessionId,exerciseId,[sessionId+displayOrder]",
      sets: "id,workoutExerciseId,[workoutExerciseId+setNumber]",
    });
  }
}
export const db = new SetLogDB();
