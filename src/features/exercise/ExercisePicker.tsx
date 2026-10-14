import { useState } from "react";
import { Search, Plus, ChevronRight } from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { useData, workoutRepository } from "../../hooks/useData";
import {
  muscleGroups,
  type Exercise,
  type MuscleGroup,
} from "../../types/domain";
import { Modal } from "../../components/common/Modal";
import { LoadError } from "../../components/common/Empty";
export function ExerciseForm({
  exercise,
  onClose,
}: {
  exercise?: Exercise;
  onClose: () => void;
}) {
  const [name, setName] = useState(exercise?.name ?? ""),
    [group, setGroup] = useState<MuscleGroup>(exercise?.muscleGroup ?? "가슴");
  const { run, pending } = useData();
  return (
    <Modal
      title={exercise ? "운동 수정" : "나만의 운동 추가"}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(() =>
              workoutRepository.saveExercise(name, group, exercise?.id),
            )
          )
            onClose();
        }}
      >
        <label>
          운동명
          <input
            autoFocus
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 케이블 크로스오버"
          />
        </label>
        <label>
          운동 부위
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as MuscleGroup)}
          >
            {muscleGroups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <button className="primary full" disabled={!!pending}>
          저장
        </button>
      </form>
    </Modal>
  );
}
export function ExercisePicker({
  onSelect,
  onClose,
  existing = [],
}: {
  onSelect: (id: string) => Promise<void>;
  onClose: () => void;
  existing?: string[];
}) {
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("전체"),
    [adding, setAdding] = useState(false);
  const { data, error } = useResource(() => workoutRepository.exercises());
  const { pending } = useData();
  return (
    <>
      <Modal title="운동 추가" onClose={onClose}>
        <div className="search">
          <Search size={18} />
          <input
            aria-label="운동 검색"
            autoFocus
            placeholder="운동명을 검색하세요"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="chips">
          {["전체", ...muscleGroups].map((g) => (
            <button
              key={g}
              className={group === g ? "selected" : ""}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
        {error && <LoadError message={error} />}
        <div className="picker-list">
          {data
            ?.filter(
              (e) =>
                e.name.includes(search.trim()) &&
                (group === "전체" || e.muscleGroup === group),
            )
            .map((e) => (
              <button
                className="exercise-option"
                key={e.id}
                disabled={!!pending || existing.includes(e.id)}
                onClick={() => void onSelect(e.id)}
              >
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.muscleGroup}
                    {e.isCustom ? " · 사용자 운동" : ""}
                  </small>
                </span>
                {existing.includes(e.id) ? (
                  "추가됨"
                ) : (
                  <ChevronRight size={18} />
                )}
              </button>
            ))}
          {data &&
            !data.some(
              (e) =>
                e.name.includes(search.trim()) &&
                (group === "전체" || e.muscleGroup === group),
            ) && <p className="muted">검색 결과가 없습니다.</p>}
        </div>
        <button className="secondary full" onClick={() => setAdding(true)}>
          <Plus size={18} />
          사용자 운동 추가
        </button>
      </Modal>
      {adding && <ExerciseForm onClose={() => setAdding(false)} />}
    </>
  );
}
