import { useState, useEffect, type ReactNode } from "react";
import { salvarEstado, carregarEstado, calcularStreak } from "../utils/storage";
import type { Paciente } from "../lib/supabase";
import { AppContext } from "./useApp";

function calcularStreakInicial(): number {
  const estadoSalvo = carregarEstado();
  if (!estadoSalvo) return 1;
  return calcularStreak(estadoSalvo.ultimoAcesso, estadoSalvo.streakDias);
}

export function AppProvider({
  children,
  paciente,
}: {
  children: ReactNode;
  paciente: Paciente;
}) {
  const estadoSalvo = carregarEstado();

  const [xpTotal, setXpTotal] = useState(estadoSalvo?.xpTotal ?? 0);
  const [streakDias] = useState(calcularStreakInicial);
  const [nomeUsuario, setNomeUsuario] = useState(paciente.nome);

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
        paciente,
        setNomeUsuario,
        ganharXP,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
