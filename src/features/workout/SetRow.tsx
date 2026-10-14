import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import type { WorkoutSet } from "../../types/domain";
import { useData, workoutRepository } from "../../hooks/useData";
import { parseSetInput } from "../../lib/validation";
export function SetRow({
  set,
  previous,
}: {
  set: WorkoutSet;
  previous?: WorkoutSet;
}) {
  const [weight, setWeight] = useState(String(set.weight)),
    [reps, setReps] = useState(String(set.reps)),
    [completed, setCompleted] = useState(set.completed),
    [error, setError] = useState("");
  const { run, setInvalid, pending } = useData();
  const version = useRef(0);
  useEffect(() => () => setInvalid(set.id, false), [set.id, setInvalid]);
  const save = async (w: string, r: string, done: boolean) => {
    const current = ++version.current;
    try {
      const values = parseSetInput(w, r);
      setError("");
      setInvalid(set.id, false);
      const ok = await run(() =>
        workoutRepository.updateSet(set.id, { ...values, completed: done }),
      );
      if (current !== version.current) return;
      if (!ok) {
        setError("저장 실패 · 다시 저장을 눌러주세요.");
        setInvalid(set.id, true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "입력을 확인해주세요.");
      setInvalid(set.id, true);
    }
  };
  return (
    <>
      <div className={"set-row " + (completed ? "done" : "")}>
        <span className="set-number">{set.setNumber}</span>
        <span className="previous">
          {previous ? previous.weight + " × " + previous.reps : "—"}
        </span>
        <input
          aria-label={set.setNumber + "세트 중량"}
          aria-invalid={!!error}
          inputMode="decimal"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value);
            void save(e.target.value, reps, completed);
          }}
        />
        <input
          aria-label={set.setNumber + "세트 횟수"}
          aria-invalid={!!error}
          inputMode="numeric"
          value={reps}
          onChange={(e) => {
            setReps(e.target.value);
            void save(weight, e.target.value, completed);
          }}
        />
        <button
          className="check"
          aria-label={set.setNumber + "세트 완료"}
          aria-pressed={completed}
          disabled={!!pending || !!error}
          onClick={async () => {
            const next = !completed;
            setCompleted(next);
            await save(weight, reps, next);
          }}
        >
          <Check size={19} />
        </button>
        <button
          className="icon remove-set"
          aria-label={set.setNumber + "세트 삭제"}
          disabled={!!pending}
          onClick={() => void run(() => workoutRepository.removeSet(set.id))}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {error && (
        <div className="set-error" role="alert">
          {error}
          <button onClick={() => void save(weight, reps, completed)}>
            다시 저장
          </button>
        </div>
      )}
    </>
  );
}
