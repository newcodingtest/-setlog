import { Dumbbell } from "lucide-react";
import type { ReactNode } from "react";
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Dumbbell size={32} />
      <h3>{title}</h3>
      <p>{children ?? "첫 번째 운동을 기록하고 성장을 확인해보세요."}</p>
    </div>
  );
}
export function LoadError({ message }: { message: string }) {
  return (
    <p className="error" role="alert">
      {message}
    </p>
  );
}
