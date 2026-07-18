import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Paciente } from "../../lib/supabase";
import AdminEditarPlano from "./AdminEditarPlano"; // ⬅️ novo
import { contarPassesUsadosNaJornada } from "../../services/gamificacaoService";

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
  onSalvo: (paciente: Paciente) => void;
}

export default function AdminEditarPaciente({
  paciente,
  onVoltar,
  onSalvo,
}: Props) {
  const [nome, setNome] = useState(paciente.nome);
  const [email, setEmail] = useState(paciente.email);
  const [peso, setPeso] = useState(String(paciente.peso));
  const [altura, setAltura] = useState(String(paciente.altura));
  const [dataNascimento, setDataNascimento] = useState(
    paciente.data_nascimento ?? "",
  );
  const [objetivo, setObjetivo] = useState(paciente.objetivo ?? "");
  const [salvando, setSalvando] = useState(false);
  const [editandoPlano, setEditandoPlano] = useState(false); // ⬅️ novo
  const [jornadaDuracaoDias, setJornadaDuracaoDias] = useState(
    paciente.jornada_duracao_dias ? String(paciente.jornada_duracao_dias) : "",
  );
  const [jornadaDataInicio, setJornadaDataInicio] = useState(
    paciente.jornada_data_inicio ?? "",
  );
  const [passesUsados, setPassesUsados] = useState(0);
  useEffect(() => {
    contarPassesUsadosNaJornada(
      paciente.id,
      paciente.jornada_data_inicio ?? null,
    ).then(setPassesUsados);
  }, [paciente.id, paciente.jornada_data_inicio]);

  // ⬅️ novo — redireciona para a tela do plano
  if (editandoPlano) {
    return (
      <AdminEditarPlano
        paciente={paciente}
        onVoltar={() => setEditandoPlano(false)}
      />
    );
  }

  async function salvar() {
    setSalvando(true);

    const { data, error } = await supabase
      .from("pacientes")
      .update({
        nome,
        email,
        peso: Number(peso),
        altura: Number(altura),
        data_nascimento: dataNascimento || null,
        objetivo,
        jornada_duracao_dias: jornadaDuracaoDias
          ? Number(jornadaDuracaoDias)
          : null,
        jornada_data_inicio: jornadaDataInicio || null,
      })
      .eq("id", paciente.id)
      .select()
      .single();

    if (error) {
      console.error(error);
      alert("Erro ao salvar");
      setSalvando(false);
      return;
    }

    setSalvando(false);
    onSalvo(data);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4 flex gap-4 sticky top-0 z-10">
        <button onClick={onVoltar} className="text-xl text-gray-400">
          ←
        </button>

        <div>
          <h1 className="font-bold">Editar paciente</h1>
          <p className="text-xs text-gray-400">{paciente.nome}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Dados do paciente */}
        <div className="bg-white rounded-2xl p-5 shadow">
          {[
            { label: "Nome", value: nome, setter: setNome },
            { label: "Email", value: email, setter: setEmail },
            { label: "Peso", value: peso, setter: setPeso },
            { label: "Altura", value: altura, setter: setAltura },
          ].map((campo) => (
            <div key={campo.label} className="mb-3">
              <label className="text-xs text-gray-400">{campo.label}</label>
              <input
                value={campo.value}
                onChange={(e) => campo.setter(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 mt-1"
              />
            </div>
          ))}

          <label className="text-xs text-gray-400">Nascimento</label>
          <input
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 mt-1 mb-3"
          />

          <label className="text-xs text-gray-400">Objetivo</label>
          <select
            value={objetivo}
            onChange={(e) =>
              setObjetivo(
                e.target.value as
                  | "emagrecer"
                  | "manter"
                  | "ganhar"
                  | "performance"
                  | "preparacao_prova",
              )
            }
            className="w-full border rounded-xl px-3 py-2 mt-1"
          >
            <option value="">Selecionar</option>
            <option value="emagrecer">Emagrecer</option>
            <option value="manter">Manter</option>
            <option value="ganhar">Ganhar</option>
            <option value="performance">Performance</option>
            <option value="preparacao_prova">Preparação para Prova</option>
          </select>
        </div>
        {/* Jornada nutricional */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <h2 className="font-bold text-gray-700 mb-1">
            🌱 Jornada nutricional
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Define o ciclo até o próximo retorno. As semanas do progresso do
            paciente são calculadas a partir daqui.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-1">
            <div>
              <label className="text-xs text-gray-400">Duração (dias)</label>
              <input
                type="number"
                min={1}
                value={jornadaDuracaoDias}
                onChange={(e) => setJornadaDuracaoDias(e.target.value)}
                placeholder="Ex: 42"
                className="w-full border rounded-xl px-3 py-2 mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Início do ciclo</label>
              <input
                type="date"
                value={jornadaDataInicio}
                onChange={(e) => setJornadaDataInicio(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Ex: 42 dias = 6 semanas até o retorno.
          </p>
        </div>

        {/* Passe Livre — protetor de sequência */}
        <div className="bg-white rounded-2xl p-5 shadow">
          <h2 className="font-bold text-gray-700 mb-1">
            🍀 Passe Livre da sequência
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            O sistema concede automaticamente a cada 15 dias após o uso do
            anterior. Protege a sequência quando o paciente não cumpre o mínimo
            em um dia.
          </p>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-gray-600">
              Usado{" "}
              <span className="font-bold text-gray-800">{passesUsados}</span>{" "}
              {passesUsados === 1 ? "vez" : "vezes"} nesta jornada
            </p>
          </div>
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl"
        >
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
