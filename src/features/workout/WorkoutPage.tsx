import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  ArrowLeft,
} from "lucide-react";
import { useResource } from "../../hooks/useResource";
import { useData, workoutRepository } from "../../hooks/useData";
import { ExercisePicker } from "../exercise/ExercisePicker";
import { SetRow } from "./SetRow";
import { Modal } from "../../components/common/Modal";
import { Empty, LoadError } from "../../components/common/Empty";
import { sessionVolume } from "../statistics/calculations";
import type { SessionDetail } from "../../types/domain";
function SessionMeta({ session }: { session: SessionDetail }) {
  const [date, setDate] = useState(session.workoutDate),
    [memo, setMemo] = useState(session.memo);
  const { run, setInvalid } = useData();
  useEffect(() => () => setInvalid("meta", false), [setInvalid]);
  const save = async (d: string, m: string) => {
    setInvalid("meta", false);
    if (!(await run(() => workoutRepository.updateSession(session.id, d, m))))
      setInvalid("meta", true);
  };
  return (
    <div className="session-meta">
      <label>
        운동 날짜
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            void save(e.target.value, memo);
          }}
        />
      </label>
      <label>
        운동 메모
        <input
          maxLength={2000}
          placeholder="오늘의 컨디션이나 목표"
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            void save(date, e.target.value);
          }}
        />
      </label>
    </div>
  );
}
export function WorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { run, pending, invalid, setInvalid } = useData();
  const { data, error } = useResource(async () => {
    const session = await workoutRepository.detail(id!);
    const previous = Object.fromEntries(
      await Promise.all(
        session.exercises.map(
          async (e) =>
            [
              e.id,
              await workoutRepository.previous(e.exerciseId, session.id),
            ] as const,
        ),
      ),
    );
    return { session, previous };
  }, [id]);
  const [picker, setPicker] = useState(false),
    [confirm, setConfirm] = useState<"complete" | "delete" | null>(null);
  if (error) return <LoadError message={error} />;
  if (!data) return <p className="muted">운동 기록을 불러오는 중…</p>;
  const { session, previous } = data;
  return (
    <>
      <Link className="back" to="/history">
        <ArrowLeft size={17} /> 운동 기록
      </Link>
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {session.status === "active"
              ? "WORKOUT IN PROGRESS"
              : "WORKOUT DETAILS"}
          </span>
          <h1>
            {session.status === "active" ? "오늘의 운동" : "운동 기록 수정"}
          </h1>
          <p>중량은 kg, 횟수는 반복 수를 입력하세요.</p>
        </div>
        <span
          className={"badge " + (session.status === "completed" ? "green" : "")}
        >
          {session.status === "active" ? "진행 중" : "완료"}
        </span>
      </div>
      <SessionMeta key={session.id} session={session} />
      <div className="workout-overview">
        <span>{session.exercises.length} 종목</span>
        <span>
          {
            session.exercises.flatMap((e) => e.sets).filter((s) => s.completed)
              .length
          }{" "}
          완료 세트
        </span>
        <span>{sessionVolume(session).toLocaleString()} kg 볼륨</span>
      </div>
      {session.exercises.map((entry, i) => (
        <article className="card workout-card" key={entry.id}>
          <div className="exercise-head">
            <div>
              <span className="badge">{entry.muscleGroup}</span>
              <h2>{entry.name}</h2>
              <small className="muted">
                이전 기록: 가장 최근 완료 운동의 세트
              </small>
            </div>
            <div className="actions">
              <button
                className="icon"
                aria-label={entry.name + " 위로 이동"}
                disabled={i === 0 || !!pending}
                onClick={() =>
                  void run(() => workoutRepository.moveExercise(entry.id, -1))
                }
              >
                <ArrowUp size={17} />
              </button>
              <button
                className="icon"
                aria-label={entry.name + " 아래로 이동"}
                disabled={i === session.exercises.length - 1 || !!pending}
                onClick={() =>
                  void run(() => workoutRepository.moveExercise(entry.id, 1))
                }
              >
                <ArrowDown size={17} />
              </button>
              <button
                className="icon"
                aria-label={entry.name + " 제거"}
                disabled={!!pending}
                onClick={() =>
                  void run(() => workoutRepository.removeExercise(entry.id))
                }
              >
                <Trash2 size={17} />
              </button>
            </div>
          </div>
          <div className="set-row set-header">
            <span>세트</span>
            <span>이전 기록</span>
            <span>중량 (kg)</span>
            <span>횟수</span>
            <span>완료</span>
            <span />
          </div>
          {entry.sets.map((set, index) => (
            <SetRow
              key={set.id}
              set={set}
              previous={previous[entry.id]?.[index]}
            />
          ))}
          <button
            className="add-set"
            disabled={!!pending || !!invalid}
            onClick={() => void run(() => workoutRepository.addSet(entry.id))}
          >
            <Plus size={17} />
            세트 추가
          </button>
        </article>
      ))}
      {!session.exercises.length && (
        <Empty title="첫 운동을 추가해주세요">
          운동 종목을 선택하고 오늘의 세트를 시작하세요.
        </Empty>
      )}
      <button
        className="secondary full"
        disabled={!!pending}
        onClick={() => setPicker(true)}
      >
        <Plus size={19} />
        운동 종목 추가
      </button>
      <div className="workout-footer">
        <button className="text-danger" onClick={() => setConfirm("delete")}>
          운동 기록 삭제
        </button>
        {session.status === "active" ? (
          <button
            className="primary"
            disabled={!!pending || !!invalid}
            onClick={() => setConfirm("complete")}
          >
            <Check size={19} />
            운동 완료
          </button>
        ) : (
          <Link className="button primary" to="/history">
            수정 완료
          </Link>
        )}
      </div>
      {invalid > 0 && (
        <p className="error">
          입력 오류를 해결하면 완료할 수 있습니다. 유효하지 않은 값은 저장되지
          않습니다.
        </p>
      )}
      {picker && (
        <ExercisePicker
          existing={session.exercises.map((e) => e.exerciseId)}
          onClose={() => setPicker(false)}
          onSelect={async (exerciseId) => {
            if (
              await run(() =>
                workoutRepository.addExercise(session.id, exerciseId),
              )
            )
              setPicker(false);
          }}
        />
      )}
      {confirm && (
        <Modal
          title={
            confirm === "complete"
              ? "운동을 마칠까요?"
              : "운동 기록을 삭제할까요?"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm === "complete"
              ? "완료한 세트가 통계에 반영됩니다. 미완료 세트는 기록에 남지만 통계에서 제외됩니다."
              : "이 운동과 모든 세트가 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다."}
          </p>
          <button
            className={confirm === "complete" ? "primary full" : "danger full"}
            disabled={!!pending || (!!invalid && confirm === "complete")}
            onClick={async () => {
              if (
                await run(() =>
                  confirm === "complete"
                    ? workoutRepository.complete(session.id)
                    : workoutRepository.deleteSession(session.id),
                )
              ) {
                setInvalid("meta", false);
                navigate("/history");
              }
            }}
          >
            {confirm === "complete" ? "운동 완료 및 저장" : "영구 삭제"}
          </button>
        </Modal>
      )}
    </>
  );
}
