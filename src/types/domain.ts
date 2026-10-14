export const muscleGroups = [
  "가슴",
  "등",
  "하체",
  "어깨",
  "팔",
  "기타",
] as const;
export type MuscleGroup = (typeof muscleGroups)[number];
export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutSession {
  id: string;
  workoutDate: string;
  startedAt: string;
  completedAt: string | null;
  status: "active" | "completed";
  memo: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkoutExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  displayOrder: number;
}
export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  weight: number;
  reps: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface SessionDetail extends WorkoutSession {
  exercises: (WorkoutExercise & { sets: WorkoutSet[] })[];
}
export interface Backup {
  format: "setlog";
  version: 1;
  exportedAt: string;
  exercises: Exercise[];
  sessions: WorkoutSession[];
  workoutExercises: WorkoutExercise[];
  sets: WorkoutSet[];
}
