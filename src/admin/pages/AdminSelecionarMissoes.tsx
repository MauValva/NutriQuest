import { useState, useEffect } from "react";
import type { Paciente } from "../../lib/supabase";
import {
  buscarCatalogoMissoes,
  salvarMissoesDoCatalogo,
} from "../../services/nutricionistaService";

interface MissaoCatalogo {
  id: string;
  titulo: string;
  descricao: string;
  tipo: "hidratacao" | "alimentacao" | "atividade" | "educacional";
  icone: string;
  xp_recompensa: number;
  tags: string[];
}

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
  onConcluido: () => void;
}

const TIPO_CONFIG = {
  hidratacao: {
    label: "Hidratação",
    cor: "bg-blue-100 text-blue-700",
    borda: "border-blue-300",
    icone: "💧",
  },
  alimentacao: {
    label: "Alimentação",
    cor: "bg-green-100 text-green-700",
    borda: "border-green-300",
    icone: "🍽️",
  },
  atividade: {
    label: "Atividade",
    cor: "bg-orange-100 text-orange-700",
    borda: "border-orange-300",
    icone: "💪",
  },
  educacional: {
    label: "Educacional",
    cor: "bg-purple-100 text-purple-700",
    borda: "border-purple-300",
    icone: "📚",
  },
};

const TIPOS = [
  "hidratacao",
  "alimentacao",
  "atividade",
  "educacional",
] as const;

export default function AdminSelecionarMissoes({
  paciente,
  onVoltar,
  onConcluido,
}: Props) {
  const [catalogo, setCatalogo] = useState<MissaoCatalogo[]>([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    async function carregar() {
      const dados = await buscarCatalogoMissoes();
      setCatalogo(dados as MissaoCatalogo[]);
      setCarregando(false);
    }
    carregar();
  }, []);

  function toggleMissao(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodos(tipo: string) {
    const ids = catalogo.filter((m) => m.tipo === tipo).map((m) => m.id);
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      ids.forEach((id) => novo.add(id));
      return novo;
    });
  }

  async function salvar() {
    if (selecionadas.size === 0) return;
    setSalvando(true);

    const sucesso = await salvarMissoesDoCatalogo(
      paciente.id,
      Array.from(selecionadas),
    );

    setSalvando(false);
    if (sucesso) setSalvo(true);
  }

  const missoesFiltradas =
    filtroTipo === "todos"
      ? catalogo
      : catalogo.filter((m) => m.tipo === filtroTipo);

  const primeiroNome = paciente.nome.split(" ")[0];

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-bounce">🎯</div>
          <p className="text-gray-400 text-sm">Carregando missões...</p>
        </div>
      </div>
    );
  }

  if (salvo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="font-bold text-gray-800 text-xl mb-2">
            Missões enviadas!
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            {primeiroNome} já pode ver as {selecionadas.size} missões no app
          </p>
          <button
            onClick={onConcluido}
            className="bg-green-500 text-white font-bold px-8 py-3 rounded-2xl"
          >
            ← Voltar aos pacientes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={onVoltar}
          className="text-gray-400 hover:text-gray-600 text-xl"
        >
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-gray-800">Selecionar Missões</h1>
          <p className="text-xs text-gray-400">
            {primeiroNome} — {selecionadas.size} selecionadas
          </p>
        </div>
        <button
          onClick={salvar}
          disabled={salvando || selecionadas.size === 0}
          className={`px-4 py-2 rounded-xl font-bold text-sm transition-all
            ${
              selecionadas.size === 0
                ? "bg-gray-100 text-gray-400"
                : "bg-green-500 text-white shadow-sm active:scale-95"
            }`}
        >
          {salvando ? "💾..." : `Enviar (${selecionadas.size})`}
        </button>
      </div>

      {/* Filtros por tipo */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFiltroTipo("todos")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
              transition-all shrink-0
              ${
                filtroTipo === "todos"
                  ? "bg-gray-800 text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
          >
            Todos ({catalogo.length})
          </button>

          {TIPOS.map((tipo) => {
            const config = TIPO_CONFIG[tipo];
            const count = catalogo.filter((m) => m.tipo === tipo).length;
            return (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(tipo)}
                className={`px-4 py-2 rounded-full text-sm font-medium
                  whitespace-nowrap transition-all shrink-0 flex items-center gap-1
                  ${
                    filtroTipo === tipo
                      ? `${config.cor} border ${config.borda}`
                      : "bg-white text-gray-500 border border-gray-200"
                  }`}
              >
                {config.icone} {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Botão selecionar todos do tipo */}
      {filtroTipo !== "todos" && (
        <div className="px-4 pb-2">
          <button
            onClick={() => selecionarTodos(filtroTipo)}
            className="text-xs text-green-600 font-medium underline"
          >
            Selecionar todas de{" "}
            {TIPO_CONFIG[filtroTipo as keyof typeof TIPO_CONFIG]?.label}
          </button>
        </div>
      )}

      {/* Lista de missões */}
      <div className="px-4 pb-24 space-y-2">
        {missoesFiltradas.map((missao) => {
          const selecionada = selecionadas.has(missao.id);
          const config = TIPO_CONFIG[missao.tipo];

          return (
            <button
              key={missao.id}
              onClick={() => toggleMissao(missao.id)}
              className={`w-full bg-white rounded-2xl p-4 shadow-sm text-left
                border-2 transition-all active:scale-98
                ${
                  selecionada
                    ? "border-green-400 bg-green-50"
                    : "border-transparent hover:border-gray-200"
                }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">{missao.icone}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-gray-800 text-sm">
                      {missao.titulo}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${config.cor}`}
                    >
                      {config.label}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    {missao.descricao}
                  </p>
                  <span className="text-green-600 text-xs font-bold mt-1 block">
                    +{missao.xp_recompensa} XP
                  </span>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center
                  justify-center shrink-0 transition-all
                  ${
                    selecionada
                      ? "bg-green-500 border-green-500 text-white"
                      : "border-gray-300"
                  }`}
                >
                  {selecionada && <span className="text-xs font-bold">✓</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
