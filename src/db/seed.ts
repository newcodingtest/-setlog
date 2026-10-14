import type { Exercise, MuscleGroup } from "../types/domain";
const defaults: Partial<Record<MuscleGroup, string[]>> = {
  가슴: [
    "벤치프레스",
    "인클라인 벤치프레스",
    "덤벨 프레스",
    "체스트 프레스",
    "펙덱 플라이",
  ],
  등: ["데드리프트", "바벨 로우", "랫풀다운", "시티드 로우", "풀업"],
  하체: [
    "스쿼트",
    "레그 프레스",
    "레그 익스텐션",
    "레그 컬",
    "루마니안 데드리프트",
  ],
  어깨: [
    "오버헤드 프레스",
    "숄더 프레스",
    "사이드 레터럴 레이즈",
    "리어 델트 플라이",
  ],
  팔: ["바벨 컬", "덤벨 컬", "해머 컬", "트라이셉스 푸시다운"],
};
export function seedExercises(): Exercise[] {
  return Object.entries(defaults).flatMap(([group, names], gi) =>
    names.map((name, i) => ({
      id: "default-" + gi + "-" + i,
      name,
      muscleGroup: group as MuscleGroup,
      isCustom: false,
      archived: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  );
}
