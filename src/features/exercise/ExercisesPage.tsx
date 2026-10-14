import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { useData, workoutRepository } from "../../hooks/useData";
import { muscleGroups, type Exercise } from "../../types/domain";
import { ExerciseForm } from "./ExercisePicker";
import { Modal } from "../../components/common/Modal";
import { LoadError } from "../../components/common/Empty";
export function ExercisesPage() {
  const { data, error } = useResource(() => workoutRepository.exercises());
  const { run, pending } = useData();
  const [search, setSearch] = useState(""),
    [group, setGroup] = useState("전체"),
    [edit, setEdit] = useState<Exercise | null | undefined>(),
    [remove, setRemove] = useState<Exercise>();
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">EXERCISE LIBRARY</span>
          <h1>운동 라이브러리</h1>
          <p>나에게 맞는 운동을 찾아보세요.</p>
        </div>
        <button className="primary" onClick={() => setEdit(null)}>
          <Plus size={18} />
          추가
        </button>
      </div>
      <div className="filters">
        <input
          aria-label="운동 검색"
          placeholder="운동명 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="부위 필터"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
        >
          {["전체", ...muscleGroups].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>
      {error && <LoadError message={error} />}
      <div className="library">
        {data
          ?.filter(
            (e) =>
              e.name.includes(search.trim()) &&
              (group === "전체" || e.muscleGroup === group),
          )
          .map((e) => (
            <article className="card library-card" key={e.id}>
              <div>
                <span className="badge">{e.muscleGroup}</span>
                <h3>{e.name}</h3>
                <Link to={"/statistics?exercise=" + e.id}>
                  운동별 기록 보기 →
                </Link>
              </div>
              {e.isCustom && (
                <div className="actions">
                  <button
                    className="icon"
                    aria-label={e.name + " 수정"}
                    onClick={() => setEdit(e)}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon"
                    aria-label={e.name + " 삭제"}
                    onClick={() => setRemove(e)}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </article>
          ))}
      </div>
      {edit !== undefined && (
        <ExerciseForm
          exercise={edit ?? undefined}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {remove && (
        <Modal title="운동을 삭제할까요?" onClose={() => setRemove(undefined)}>
          <p>
            {remove.name}을 라이브러리에서 숨깁니다. 과거 기록은 유지됩니다.
          </p>
          <button
            className="danger full"
            disabled={!!pending}
            onClick={async () => {
              if (await run(() => workoutRepository.archiveExercise(remove.id)))
                setRemove(undefined);
            }}
          >
            삭제
          </button>
        </Modal>
      )}
    </>
  );
}
