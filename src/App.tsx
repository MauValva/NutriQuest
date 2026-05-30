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

export default function App() {
  const [logado, setLogado] = useState(onboardingConcluido);

  // Rota do painel admin
  if (window.location.pathname.startsWith("/admin")) {
    return <AdminApp />;
  }

  if (!logado) {
    return (
      <TelaOnboarding
        onConcluir={(e) => {
          salvarEmail(e);
          setLogado(true);
        }}
      />
    );
  }

  return (
    <AppProvider>
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
