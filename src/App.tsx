import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import NavegacaoInferior from "./components/NavegacaoInferior";
import TelaMissoes from "./pages/TelaMissoes";
import TelaRefeicoes from "./pages/TelaRefeicoes";
import TelaProgresso from "./pages/TelaProgresso";
import TelaPerfil from "./pages/TelaPerfil";
import TelaOnboarding from "./pages/TelaOnboarding";
import { salvarEmail, onboardingConcluido } from "./utils/storage";

export default function App() {
  const [logado, setLogado] = useState(onboardingConcluido);

  function concluirOnboarding(email: string) {
    salvarEmail(email);
    setLogado(true);
  }

  if (!logado) {
    return <TelaOnboarding onConcluir={concluirOnboarding} />;
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
