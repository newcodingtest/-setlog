import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { it, expect, vi } from "vitest";
import { DataProvider } from "../src/app/DataContext";
import { workoutRepository } from "../src/repositories/workoutRepository";
import { SetRow } from "../src/features/workout/SetRow";
import type { WorkoutSet } from "../src/types/domain";
const set: WorkoutSet = {
  id: "s1",
  workoutExerciseId: "e1",
  setNumber: 1,
  weight: 60,
  reps: 10,
  completed: false,
  createdAt: "2026-10-14T00:00:00Z",
  updatedAt: "2026-10-14T00:00:00Z",
};
it("숫자 키패드 속성과 이전 기록을 표시하고 완료 상태를 저장한다", async () => {
  const save = vi.spyOn(workoutRepository, "updateSet").mockResolvedValue();
  render(
    <DataProvider>
      <SetRow set={set} previous={{ ...set, weight: 55 }} />
    </DataProvider>,
  );
  expect(screen.getByLabelText("1세트 중량")).toHaveAttribute(
    "inputmode",
    "decimal",
  );
  expect(screen.getByText("55 × 10")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "1세트 완료" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith("s1", {
      weight: 60,
      reps: 10,
      completed: true,
    }),
  );
  expect(screen.getByRole("button", { name: "1세트 완료" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
it("빈 입력을 오류로 표시하고 저장하지 않는다", async () => {
  const save = vi.spyOn(workoutRepository, "updateSet").mockResolvedValue();
  render(
    <DataProvider>
      <SetRow set={set} />
    </DataProvider>,
  );
  await userEvent.clear(screen.getByLabelText("1세트 중량"));
  expect(screen.getByRole("alert")).toHaveTextContent("중량과 횟수");
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "1세트 완료" })).toBeDisabled();
});
it("저장 실패를 알리고 다시 저장할 수 있다", async () => {
  const save = vi
    .spyOn(workoutRepository, "updateSet")
    .mockRejectedValueOnce(new Error("저장소 오류"))
    .mockResolvedValue();
  render(
    <DataProvider>
      <SetRow set={set} />
    </DataProvider>,
  );
  await userEvent.click(screen.getByRole("button", { name: "1세트 완료" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("저장 실패"),
  );
  await userEvent.click(screen.getByRole("button", { name: "다시 저장" }));
  await waitFor(() =>
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
  );
  expect(save).toHaveBeenCalledTimes(2);
});
