import { useSearchParams, Link } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { useResource } from "../../hooks/useResource";
import { workoutRepository } from "../../hooks/useData";
import { overallStats, exerciseStats } from "./calculations";
import { Empty, LoadError } from "../../components/common/Empty";
export function StatisticsPage() {
  const [params, setParams] = useSearchParams();
  const { data, error } = useResource(async () => ({
    sessions: await workoutRepository.completedDetails(),
    exercises: await workoutRepository.exercises(),
  }));
  const exercises = [...(data?.exercises ?? [])];
  for (const s of data?.sessions ?? [])
    for (const e of s.exercises)
      if (!exercises.some((x) => x.id === e.exerciseId))
        exercises.push({
          id: e.exerciseId,
          name: e.name + " (삭제됨)",
          muscleGroup: e.muscleGroup,
          isCustom: true,
          archived: true,
          createdAt: "",
          updatedAt: "",
        });
  const selected = params.get("exercise") ?? exercises[0]?.id ?? "";
  const stats = overallStats(data?.sessions ?? []),
    detail = exerciseStats(data?.sessions ?? [], selected);
  const records =
    data?.sessions.filter((s) =>
      s.exercises.some((e) => e.exerciseId === selected),
    ) ?? [];
  return (
    <>
      <div className="page-title">
        <div>
          <span className="eyebrow">PROGRESS & INSIGHTS</span>
          <h1>기록으로 보는 성장</h1>
          <p>완료한 운동과 세트만 통계에 반영합니다.</p>
        </div>
      </div>
      {error && <LoadError message={error} />}
      <div className="stats-grid">
        {[
          ["총 운동 횟수", stats.total, "회"],
          ["최근 7일", stats.last7, "회"],
          ["최근 30일", stats.last30, "회"],
          ["30일 훈련 볼륨", stats.volume30.toLocaleString(), "kg"],
        ].map(([label, value, unit]) => (
          <div className="card metric" key={label}>
            <span>{label}</span>
            <strong>
              {value}
              <small>{unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="section-title">
        <h2>운동별 분석</h2>
        <select
          aria-label="분석할 운동"
          value={selected}
          onChange={(e) => setParams({ exercise: e.target.value })}
        >
          {exercises.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>
      {detail.points.length ? (
        <>
          <div className="summary-grid compact">
            {[
              ["최고 중량", detail.maxWeight, "kg"],
              ["누적 훈련 볼륨", detail.totalVolume, "kg"],
              ["누적 반복 횟수", detail.totalReps, "회"],
            ].map(([label, value, unit]) => (
              <div className="card metric" key={label}>
                <span>{label}</span>
                <strong>
                  {Number(value).toLocaleString()}
                  <small>{unit}</small>
                </strong>
              </div>
            ))}
          </div>
          <div className="charts">
            <section className="card chart">
              <h3>
                최고 중량 추이 <small>kg</small>
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={detail.points}
                  margin={{ left: 0, right: 12, top: 16, bottom: 0 }}
                >
                  <CartesianGrid stroke="#303831" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => String(d).slice(5)}
                    stroke="#a2aaa4"
                    fontSize={12}
                  />
                  <YAxis stroke="#a2aaa4" fontSize={12} width={45} />
                  <Tooltip
                    contentStyle={{
                      background: "#202721",
                      border: "1px solid #465041",
                      borderRadius: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    name="최고 중량 (kg)"
                    stroke="#b3ed59"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </section>
            <section className="card chart">
              <h3>
                훈련 볼륨 추이 <small>kg × 회</small>
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={detail.points}
                  margin={{ left: 0, right: 12, top: 16, bottom: 0 }}
                >
                  <CartesianGrid stroke="#303831" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => String(d).slice(5)}
                    stroke="#a2aaa4"
                    fontSize={12}
                  />
                  <YAxis stroke="#a2aaa4" fontSize={12} width={50} />
                  <Tooltip
                    contentStyle={{
                      background: "#202721",
                      border: "1px solid #465041",
                      borderRadius: 12,
                    }}
                  />
                  <Bar
                    dataKey="volume"
                    name="훈련 볼륨"
                    fill="#b3ed59"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </section>
          </div>
          <details className="card data-table">
            <summary>날짜별 수치 보기 (차트 대체 표)</summary>
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>최고 중량</th>
                  <th>볼륨</th>
                  <th>반복</th>
                </tr>
              </thead>
              <tbody>
                {detail.points.map((p) => (
                  <tr key={p.date}>
                    <td>{p.date}</td>
                    <td>{p.maxWeight}kg</td>
                    <td>{p.volume.toLocaleString()}</td>
                    <td>{p.reps}회</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      ) : (
        <Empty title="이 운동의 성장 기록을 기다리고 있어요">
          세트를 완료하고 운동을 종료하면 차트가 표시됩니다. 맨몸 운동은 볼륨
          0kg, 횟수는 별도로 집계합니다.
        </Empty>
      )}
      <div className="section-title">
        <h2>종목별 이전 운동</h2>
      </div>
      {records.map((s) => (
        <Link
          className="card exercise-history"
          key={s.id}
          to={"/workout/" + s.id}
        >
          <strong>{s.workoutDate}</strong>
          <span>
            {s.exercises
              .filter((e) => e.exerciseId === selected)
              .flatMap((e) => e.sets)
              .filter((s) => s.completed)
              .map((s) => s.weight + "kg × " + s.reps)
              .join(" / ")}
          </span>
          <small>상세 보기 →</small>
        </Link>
      ))}
    </>
  );
}
