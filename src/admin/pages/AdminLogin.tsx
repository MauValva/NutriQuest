import { useState } from "react";
import { loginNutricionista } from "../../services/nutricionistaService";
import type { Nutricionista } from "../../lib/supabase";

interface Props {
  onLogin: (nutri: Nutricionista) => void;
}

export default function AdminLogin({ onLogin }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (!email || !senha) {
      setErro("Preencha email e senha");
      return;
    }
    setErro("");
    setCarregando(true);

    const nutri = await loginNutricionista(email, senha);

    setCarregando(false);

    if (!nutri) {
      setErro("Email ou senha incorretos");
      return;
    }

    onLogin(nutri);
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-700 to-green-500
      flex items-center justify-center px-6"
    >
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥦</div>
          <h1 className="text-2xl font-bold text-gray-800">NutriQuest</h1>
          <p className="text-gray-400 text-sm mt-1">Painel da Nutricionista</p>
        </div>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErro("");
              }}
              placeholder="seu@email.com"
              className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3
                outline-none focus:border-green-400 text-sm"
            />
          </div>

          {/* Senha */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Senha
            </label>
            <div className="relative mt-1">
              <input
                type={mostrarSenha ? "text" : "password"}
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro("");
                }}
                placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && entrar()}
                className="w-full border border-gray-200 rounded-xl px-4 py-3
                  outline-none focus:border-green-400 text-sm pr-12"
              />
              <button
                onClick={() => setMostrarSenha((p) => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {mostrarSenha ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Erro */}
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-sm text-center">{erro}</p>
            </div>
          )}

          {/* Botão */}
          <button
            onClick={entrar}
            disabled={carregando}
            className="w-full bg-green-500 text-white font-bold py-4 rounded-xl
              shadow-md active:scale-95 transition-all mt-2"
          >
            {carregando ? "🔍 Verificando..." : "Entrar no Painel"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6">
          Acesso exclusivo para nutricionistas
        </p>
      </div>
    </div>
  );
}
