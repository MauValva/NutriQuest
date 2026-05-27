import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import NavegacaoInferior from "./components/NavegacaoInferior";
import TelaMissoes from "./pages/TelaMissoes";
import TelaRefeicoes from "./pages/TelaRefeicoes";
import TelaProgresso from "./pages/TelaProgresso";
import TelaPerfil from "./pages/TelaPerfil";

function App() {
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

export default App;
