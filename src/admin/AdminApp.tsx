import { useState } from "react";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUploadPaciente from "./pages/AdminUploadPaciente";
import AdminPaciente from "./pages/AdminPaciente";
import type { Nutricionista, Paciente } from "../lib/supabase";

import AdminCadastro from "./pages/AdminCadastro";

type Tela = "login" | "cadastro" | "dashboard" | "upload" | "paciente";

export default function AdminApp() {
  const [tela, setTela] = useState<Tela>("login");
  const [nutri, setNutri] = useState<Nutricionista | null>(null);
  const [pacienteSelecionado, setPaciente] = useState<Paciente | null>(null);

  if (tela === "cadastro") {
    return (
      <AdminCadastro
        onVoltar={() => setTela("login")}
        onCadastrado={(n) => {
          setNutri(n);
          setTela("dashboard");
        }}
      />
    );
  }

  if (tela === "login" || !nutri) {
    return (
      <AdminLogin
        onLogin={(n) => {
          setNutri(n);
          setTela("dashboard");
        }}
        onCadastrar={() => setTela("cadastro")}
      />
    );
  }

  if (tela === "upload") {
    return (
      <AdminUploadPaciente
        nutri={nutri}
        onVoltar={() => setTela("dashboard")}
        onConcluido={() => setTela("dashboard")}
      />
    );
  }

  if (tela === "paciente" && pacienteSelecionado) {
    return (
      <AdminPaciente
        paciente={pacienteSelecionado}
        onVoltar={() => setTela("dashboard")}
        atualizarPaciente={(novoPaciente) => {
          setPaciente(novoPaciente);
        }}
      />
    );
  }

  return (
    <AdminDashboard
      nutri={nutri}
      onLogout={() => {
        setNutri(null);
        setTela("login");
      }}
      onNovoPaciente={() => setTela("upload")}
      onVerPaciente={(p) => {
        setPaciente(p);
        setTela("paciente");
      }}
    />
  );
}
