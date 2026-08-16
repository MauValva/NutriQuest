import { createContext, useContext } from "react";
import type { Paciente } from "../lib/supabase";

interface AppState {
  streakDias: number;
  setStreakDias: (dias: number) => void;
  nomeUsuario: string;
  paciente: Paciente;
  setNomeUsuario: (nome: string) => void;
}

export const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);
