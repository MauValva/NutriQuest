import { createContext, useContext } from "react";
import type { Paciente } from "../lib/supabase";

interface AppState {
  xpTotal: number;
  nivel: number;
  streakDias: number;
  nomeUsuario: string;
  paciente: Paciente;
  setNomeUsuario: (nome: string) => void;
  ganharXP: (quantidade: number) => void;
}

export const AppContext = createContext<AppState>({} as AppState);
export const useApp = () => useContext(AppContext);
