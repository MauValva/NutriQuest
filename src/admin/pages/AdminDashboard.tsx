import { useState, useEffect } from "react";
import { listarPacientesTodos } from "../../services/nutricionistaService";
import type { Paciente, Nutricionista } from "../../lib/supabase";
import AdminPerfilNutri from "./AdminPerfilNutri";

interface Props {
  nutri: Nutricionista;
  onLogout: () => void;
  onNovoPaciente: () => void;
  onVerPaciente: (paciente: Paciente) => void;
  onNutriAtualizada: (nutri: Nutricionista) => void;
  onContaExcluida: () => void;
}

type Aba = "pacientes" | "perfil";

export default function AdminDashboard({
  nutri,
  onLogout,
  onNovoPaciente,
  onVerPaciente,
  onNutriAtualizada,
  onContaExcluida,
}: Props) {
  const [aba, setAba] = useState<Aba>("pacientes");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    async function carregar() {
      const lista = await listarPacientesTodos(nutri.id);
      setPacientes(lista);
      setCarregando(false);
    }
    carregar();
  }, [nutri.id]);

  const ativos = pacientes.filter((p) => p.ativa);
  const inativos = pacientes.filter((p) => !p.ativa);

  const filtrados = ativos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.apelido ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  const objetivoLabel = {
    emagrecer: { label: "Emagrecer", cor: "bg-blue-100 text-blue-700" },
    manter: { label: "Manter", cor: "bg-green-100 text-green-700" },
    ganhar: { label: "Ganhar", cor: "bg-orange-100 text-orange-700" },
    performance: {
      label: "Performance",
      cor: "bg-purple-100 text-purple-700",
    },
    preparacao_prova: {
      label: "Preparação prova",
      cor: "bg-red-100 text-red-700",
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-5 flex justify-between items-center">
        <div>
          <h1 className="font-bold text-gray-800 text-lg">🥦 NutriQuest</h1>
          <p className="text-sm text-green-600 font-bold mt-0.5">
            Olá, {nutri.nome}!
          </p>
        </div>
        <button
          onClick={onLogout}
          className="text-gray-400 hover:text-red-400 text-sm transition-colors"
        >
          Sair
        </button>
      </div>

      {aba === "pacientes" && (
        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icone: "👥", valor: pacientes.length, label: "Pacientes" },
              { icone: "✅", valor: ativos.length, label: "Ativos" },
              { icone: "⏸️", valor: inativos.length, label: "Inativos" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl p-4 text-center shadow-sm"
              >
                <p className="text-2xl">{s.icone}</p>
                <p className="font-bold text-gray-800 text-lg">{s.valor}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Busca + novo */}
          <div className="flex gap-3 mb-4">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="🔍 Buscar paciente..."
              className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3
                outline-none focus:border-green-400 text-sm shadow-sm"
            />
            <button
              onClick={onNovoPaciente}
              className="bg-green-500 text-white font-bold px-5 py-3 rounded-xl
                shadow-sm active:scale-95 transition-all whitespace-nowrap"
            >
              + Novo
            </button>
          </div>

          {carregando ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-4xl mb-2">⏳</p>
              <p className="text-sm">Carregando pacientes...</p>
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-300">
              <p className="text-4xl mb-2">👥</p>
              <p className="text-sm">
                {busca
                  ? "Nenhum paciente encontrado"
                  : "Nenhum paciente cadastrado ainda"}
              </p>
              {!busca && (
                <button
                  onClick={onNovoPaciente}
                  className="mt-4 bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-bold"
                >
                  Cadastrar primeiro paciente
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtrados.map((paciente) => (
                <button
                  key={paciente.id}
                  onClick={() => onVerPaciente(paciente)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm text-left
                    hover:shadow-md transition-all active:scale-95 border border-transparent
                    hover:border-green-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full bg-green-100
                        flex items-center justify-center text-lg font-bold text-green-600"
                      >
                        {paciente.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {paciente.nome}
                        </p>
                        <p className="text-xs text-gray-400">
                          {paciente.apelido || "Sem apelido"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {paciente.objetivo && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium
                          ${objetivoLabel[paciente.objetivo]?.cor}`}
                        >
                          {objetivoLabel[paciente.objetivo]?.label}
                        </span>
                      )}
                      <span className="text-gray-300">›</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {aba === "perfil" && (
        <AdminPerfilNutri
          nutri={nutri}
          onAtualizado={onNutriAtualizada}
          onContaExcluida={onContaExcluida}
        />
      )}

      {/* Barra de navegação fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-20">
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-1">
          <button
            onClick={() => setAba("pacientes")}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              aba === "pacientes"
                ? "text-green-600 bg-green-50"
                : "text-gray-400"
            }`}
          >
            <span className="text-xl">👥</span>
            <span>Pacientes</span>
          </button>
          <button
            onClick={() => setAba("perfil")}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              aba === "perfil" ? "text-green-600 bg-green-50" : "text-gray-400"
            }`}
          >
            <span className="text-xl">👤</span>
            <span>Perfil da Nutri</span>
          </button>
        </div>
      </div>
    </div>
  );
}
