import { useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Paciente } from "../../lib/supabase";
import AdminEditarPlano from "./AdminEditarPlano"; // ⬅️ novo

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
        data_nascimento: dataNascimento,
        objetivo,
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

        {/* ⬅️ novo — botão para o plano alimentar */}
        <button
          onClick={() => setEditandoPlano(true)}
          className="w-full bg-white border-2 border-green-200 text-green-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm"
        >
          🍽️ Editar plano alimentar
        </button>

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
