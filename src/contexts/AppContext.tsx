import { createContext, useContext, useState, type ReactNode } from "react";

interface AppState {
  xpTotal: number;
  nivel: number;
  streakDias: number;
  nomeUsuario: string;
  ganharXP: (quantidade: number) => void;
}

const AppContext = createContext<AppState>({} as AppState);

export function AppProvider({ children }: { children: ReactNode }) {
  const [xpTotal, setXpTotal] = useState(120);
  const [streakDias] = useState(5);
  const nomeUsuario = "Paciente";

  const nivel = Math.floor(xpTotal / 200) + 1;

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
        ganharXP,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
