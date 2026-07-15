import type { Paciente, Tag } from "../../lib/supabase";
import { calcularIdade } from "../../utils/calcularIdade";
import { useEffect, useState } from "react";
import AdminTagsPaciente from "./AdminTagsPaciente";
import AdminEditarPaciente from "./AdminEditarPaciente";
import AdminEditarPlano from "./AdminEditarPlano";
import AdminHistoricoPaciente from "./AdminHistoricoPaciente";
import { supabase } from "../../lib/supabase";

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
  atualizarPaciente: (paciente: Paciente) => void;
}

type Aba = "perfil" | "plano" | "historico";

export default function AdminPaciente({
  paciente,
  onVoltar,
  atualizarPaciente,
}: Props) {
  const [aba, setAba] = useState<Aba>("perfil");
  const [editandoPaciente, setEditandoPaciente] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [carregandoTags, setCarregandoTags] = useState(true);
  const [editandoTags, setEditandoTags] = useState(false);
  const primeiroNome = paciente.nome.split(" ")[0];
  const idade = calcularIdade(paciente.data_nascimento);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const objetivoLabel = {
    emagrecer: { label: "Emagrecer 📉", cor: "bg-blue-100 text-blue-700" },
    manter: { label: "Manter ⚖️", cor: "bg-green-100 text-green-700" },
    ganhar: { label: "Ganhar 📈", cor: "bg-orange-100 text-orange-700" },
    performance: {
      label: "Performance 🔥",
      cor: "bg-purple-100 text-purple-700",
    },
    preparacao_prova: {
      label: "Preparação prova 🏃",
      cor: "bg-red-100 text-red-700",
    },
  };

  const obj = paciente.objetivo ? objetivoLabel[paciente.objetivo] : null;

  useEffect(() => {
    supabase
      .from("paciente_tags")
      .select(`tag_id, tags (*)`)
      .eq("paciente_id", paciente.id)
      .then(({ data, error }) => {
        if (error) {
          console.error(error);
          setCarregandoTags(false);
          return;
        }
        const tagsAtuais = data?.flatMap((item) => item.tags) ?? [];
        setTags(tagsAtuais);
        setCarregandoTags(false);
      });
  }, [paciente.id]);

  async function excluirPaciente() {
    setExcluindo(true);

    const { error } = await supabase
      .from("pacientes")
      .delete()
      .eq("id", paciente.id);

    if (error) {
      console.error(error);
      alert("Erro ao excluir paciente");
      setExcluindo(false);
      return;
    }

    setExcluindo(false);
    onVoltar();
  }

  // Telas cheias, fora do sistema de abas
  if (editandoPaciente) {
    return (
      <AdminEditarPaciente
        paciente={paciente}
        onVoltar={() => setEditandoPaciente(false)}
        onSalvo={(pacienteAtualizado) => {
          atualizarPaciente(pacienteAtualizado);
          setEditandoPaciente(false);
        }}
      />
    );
  }

  if (editandoTags) {
    return (
      <AdminTagsPaciente
        paciente={paciente}
        onVoltar={() => setEditandoTags(false)}
        onSalvar={(tagsNovas) => {
          setTags(tagsNovas);
          setEditandoTags(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Aba: Perfil */}
      {aba === "perfil" && (
        <>
          <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
            <button
              onClick={onVoltar}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ←
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-gray-800">{paciente.nome}</h1>
              <p className="text-xs text-gray-400">{paciente.email}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-600 text-lg">
              {paciente.nome.charAt(0)}
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-2 py-2 space-y-2">
            {/* Card de dados */}
            <div className="bg-white rounded-2xl p-2 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-2">
                Dados do Paciente
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {paciente.peso > 0 && (
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Peso</p>
                    <p className="font-bold text-gray-800">
                      {paciente.peso} kg
                    </p>
                  </div>
                )}
                {paciente.altura > 0 && (
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Altura</p>
                    <p className="font-bold text-gray-800">
                      {paciente.altura} m
                    </p>
                  </div>
                )}
                {idade !== null && (
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Idade</p>
                    <p className="font-bold text-gray-800">{idade} anos</p>
                  </div>
                )}
                {obj && (
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-xs text-gray-400">Objetivo</p>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${obj.cor}`}
                    >
                      {obj.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Acesso */}
            <div className="bg-white rounded-2xl p-2 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-2">Dados de Acesso</h2>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2">
                  <span className="text-xs text-gray-400">Email</span>
                  <span className="text-sm font-bold text-gray-700">
                    {paciente.email}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2">
                  <span className="text-xs text-gray-400">Senha</span>
                  <span className="font-mono font-bold text-green-600 tracking-widest">
                    {paciente.senha_temp}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-2">
                  <span className="text-xs text-gray-400">App</span>
                  <span className="text-sm font-bold text-blue-600">
                    nutriquestrs.vercel.app
                  </span>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl p-2 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-bold text-gray-700">Características</h2>
                <button
                  onClick={() => setEditandoTags(true)}
                  className="text-xs text-green-600 font-bold"
                >
                  + Editar
                </button>
              </div>
              {carregandoTags ? (
                <p className="text-xs text-gray-400">Carregando...</p>
              ) : tags.length === 0 ? (
                <div>
                  <p className="text-sm text-gray-400">
                    Nenhuma característica cadastrada
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Adicione tags para facilitar a identificação do paciente
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      {tag.emoji} {tag.nome}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ações: Editar + Excluir */}
            <div className="bg-white rounded-2xl p-2 shadow-sm space-y-2">
              <button
                onClick={() => setEditandoPaciente(true)}
                className="w-full bg-green-500 text-white font-bold py-2 rounded-xl"
              >
                ✏️ Editar paciente
              </button>
              <button
                onClick={() => setConfirmarExclusao(true)}
                className="w-full bg-red-50 text-red-600 border border-red-200 font-bold py-2 rounded-xl"
              >
                🗑️ Excluir paciente
              </button>
            </div>

            {confirmarExclusao && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
                  <h2 className="font-bold text-gray-800 text-lg mb-2">
                    Excluir paciente?
                  </h2>
                  <p className="text-sm text-gray-500 mb-5">
                    Essa ação removerá o cadastro e todos os dados relacionados.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={excluirPaciente}
                      disabled={excluindo}
                      className="w-full bg-red-500 text-white font-bold py-3 rounded-xl"
                    >
                      {excluindo ? "Excluindo..." : "Confirmar exclusão"}
                    </button>
                    <button
                      onClick={() => setConfirmarExclusao(false)}
                      className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-2xl p-2 text-center">
              <p className="text-sm text-green-700">
                {primeiroNome} está cadastrada e pode acessar o app.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Aba: Plano Alimentar */}
      {aba === "plano" && (
        <AdminEditarPlano
          paciente={paciente}
          onVoltar={() => setAba("perfil")}
        />
      )}

      {/* Aba: Histórico Alimentar */}
      {aba === "historico" && (
        <AdminHistoricoPaciente
          paciente={paciente}
          onVoltar={() => setAba("perfil")}
        />
      )}

      {/* Barra de navegação fixa */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 z-20">
        <div className="max-w-2xl mx-auto grid grid-cols-3 gap-1">
          <button
            onClick={() => setAba("perfil")}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              aba === "perfil" ? "text-green-600 bg-green-50" : "text-gray-400"
            }`}
          >
            <span className="text-xl">👤</span>
            <span>Perfil</span>
          </button>
          <button
            onClick={() => setAba("plano")}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              aba === "plano" ? "text-green-600 bg-green-50" : "text-gray-400"
            }`}
          >
            <span className="text-xl">🍽️</span>
            <span>Plano Alimentar</span>
          </button>
          <button
            onClick={() => setAba("historico")}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              aba === "historico"
                ? "text-green-600 bg-green-50"
                : "text-gray-400"
            }`}
          >
            <span className="text-xl">📅</span>
            <span>Histórico</span>
          </button>
        </div>
      </div>
    </div>
  );
}
