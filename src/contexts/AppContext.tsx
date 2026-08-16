import { useState, useEffect, type ReactNode } from "react";
import type { Paciente } from "../lib/supabase";
import { AppContext } from "./useApp";
import { atualizarStreak } from "../services/gamificacaoService";

export function AppProvider({
  children,
  paciente,
}: {
  children: ReactNode;
  paciente: Paciente;
}) {
  const [streakDias, setStreakDias] = useState(paciente.streak_dias ?? 0);
  const [nomeUsuario, setNomeUsuario] = useState(paciente.nome);

  useEffect(() => {
    atualizarStreak(paciente.id).then(({ streakDias: atualizado }) => {
      setStreakDias(atualizado);
    });
  }, [paciente.id]);

  return (
    <AppContext.Provider
      value={{
        streakDias,
        setStreakDias,
        nomeUsuario,
        paciente,
        setNomeUsuario,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
