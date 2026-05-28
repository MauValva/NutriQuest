import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { salvarEstado, carregarEstado, calcularStreak } from "../utils/storage";

interface AppState {
  xpTotal: number;
  nivel: number;
  streakDias: number;
  nomeUsuario: string;
  setNomeUsuario: (nome: string) => void;
  ganharXP: (quantidade: number) => void;
}

const AppContext = createContext<AppState>({} as AppState);

function calcularStreakInicial(): number {
  const estadoSalvo = carregarEstado();
  if (!estadoSalvo) return 1;
  return calcularStreak(estadoSalvo.ultimoAcesso, estadoSalvo.streakDias);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const estadoSalvo = carregarEstado();

  const [xpTotal, setXpTotal] = useState(estadoSalvo?.xpTotal ?? 0);
  const [streakDias] = useState(calcularStreakInicial);
  const [nomeUsuario, setNomeUsuario] = useState("Paciente");

  const nivel = Math.floor(xpTotal / 200) + 1;

  useEffect(() => {
    salvarEstado({
      xpTotal,
      streakDias,
      ultimoAcesso: new Date().toISOString().split("T")[0],
      missoesConcluidas: [],
    });
  }, [xpTotal, streakDias]);

  function ganharXP(quantidade: number) {
    setXpTotal((prev) => prev + quantidade);
  }

  return (
    <AppContext.Provider
      value={{
        xpTotal,
        nivel,
        streakDias,
        nomeUsuario,
        setNomeUsuario,
        ganharXP,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
