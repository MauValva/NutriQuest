import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import NavegacaoInferior from "./components/NavegacaoInferior";
import TelaMissoes from "./pages/TelaMissoes";
import TelaRefeicoes from "./pages/TelaRefeicoes";
import TelaProgresso from "./pages/TelaProgresso";
import TelaPerfil from "./pages/TelaPerfil";
import TelaOnboarding from "./pages/TelaOnboarding";
import AdminApp from "./admin/AdminApp";
import { salvarEmail, onboardingConcluido } from "./utils/storage";
import { loginPaciente } from "./services/pacienteService";
import type { Paciente } from "./lib/supabase";

export default function App() {
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [logado, setLogado] = useState(onboardingConcluido);

  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  async function handleLogin(email: string, senha: string): Promise<boolean> {
    const p = await loginPaciente(email, senha);
    if (!p) return false;
    setPaciente(p);
    salvarEmail(email);
    setLogado(true);
    return true;
  }

  if (!logado || !paciente) {
    return <TelaOnboarding onConcluir={handleLogin} />;
  }

  return (
    <AppProvider paciente={paciente}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TelaMissoes />} />
          <Route path="/refeicoes" element={<TelaRefeicoes />} />
          <Route path="/progresso" element={<TelaProgresso />} />
          <Route path="/perfil" element={<TelaPerfil />} />
        </Routes>
        <NavegacaoInferior />
      </BrowserRouter>
    </AppProvider>
  );
}
