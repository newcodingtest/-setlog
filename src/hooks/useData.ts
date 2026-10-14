import { createContext, useContext } from "react";
export interface DataState {
  revision: number;
  pending: number;
  error: string;
  saved: boolean;
  invalid: number;
  setInvalid: (id: string, invalid: boolean) => void;
  run: (action: () => Promise<unknown>) => Promise<boolean>;
  clearError: () => void;
}
export const DataContext = createContext<DataState | null>(null);

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("DataProvider required");
  return value;
}
export { workoutRepository } from "../repositories/workoutRepository";
