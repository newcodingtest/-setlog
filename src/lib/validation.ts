export function validateSet(weight: number, reps: number): void {
  if (!Number.isFinite(weight) || weight < 0 || weight > 10000)
    throw new Error("중량은 0~10,000kg 사이의 숫자로 입력해주세요.");
  if (!Number.isSafeInteger(reps) || reps < 1 || reps > 10000)
    throw new Error("횟수는 1~10,000 사이의 정수로 입력해주세요.");
}
export function parseSetInput(
  weight: string,
  reps: string,
): { weight: number; reps: number } {
  if (!weight.trim() || !reps.trim())
    throw new Error("중량과 횟수를 입력해주세요.");
  const result = { weight: Number(weight), reps: Number(reps) };
  validateSet(result.weight, result.reps);
  return result;
}
