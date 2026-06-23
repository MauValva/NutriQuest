import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import type { Paciente, Tag } from "../../lib/supabase";

interface Props {
  paciente: Paciente;
  onVoltar: () => void;
  onSalvar: (tags: Tag[]) => void;
}

export default function AdminTagsPaciente({
  paciente,
  onVoltar,
  onSalvar,
}: Props) {
  const [tagsDisponiveis, setTagsDisponiveis] = useState<Tag[]>([]);
  const [tagsSelecionadas, setTagsSelecionadas] = useState<Tag[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregarTags() {
      const { data: todas, error: e1 } = await supabase
        .from("tags")
        .select("*")
        .eq("ativa", true)
        .order("categoria");

      console.log("🟢 tags disponíveis:", todas, "erro:", e1);

      const { data: selecionadas, error: e2 } = await supabase
        .from("paciente_tags")
        .select(`tag_id, tags (*)`)
        .eq("paciente_id", paciente.id);

      console.log("🔵 tags do paciente:", selecionadas, "erro:", e2);

      setTagsDisponiveis(todas ?? []);
      const atuais: Tag[] = selecionadas?.flatMap((item) => item.tags) ?? [];
      setTagsSelecionadas(atuais);
      setCarregando(false);
    }

    carregarTags();
  }, [paciente.id]);

  function alternarTag(tag: Tag) {
    const existe = tagsSelecionadas.some((t) => t.id === tag.id);

    if (existe) {
      setTagsSelecionadas(tagsSelecionadas.filter((t) => t.id !== tag.id));
    } else {
      setTagsSelecionadas([...tagsSelecionadas, tag]);
    }
  }
  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando tags...
      </div>
    );
  }

  async function salvarTags() {
    // remove todas as tags atuais do paciente
    await supabase
      .from("paciente_tags")
      .delete()
      .eq("paciente_id", paciente.id);

    // cria novamente com as selecionadas
    if (tagsSelecionadas.length > 0) {
      const registros = tagsSelecionadas.map((tag) => ({
        paciente_id: paciente.id,
        tag_id: tag.id,
      }));

      const { error } = await supabase.from("paciente_tags").insert(registros);

      if (error) {
        console.error(error);
        alert("Erro ao salvar tags");
        return;
      }
    }

    onSalvar(tagsSelecionadas);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onVoltar} className="text-gray-400 text-xl">
          ←
        </button>

        <div>
          <h1 className="font-bold text-gray-800">Tags do paciente</h1>

          <p className="text-xs text-gray-400">{paciente.nome}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Tags atuais */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">
            Características atuais
          </h2>

          {tagsSelecionadas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma tag adicionada</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tagsSelecionadas.map((item) => (
                <button
                  key={item.id}
                  onClick={() => alternarTag(item)}
                  className="
    bg-green-100 text-green-700
    px-3 py-1 rounded-full
    text-xs font-bold
    "
                >
                  {item.emoji} {item.nome} ✕
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sugestões */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-3">Sugestões</h2>

          {Object.entries(
            tagsDisponiveis.reduce(
              (acc: Record<string, Tag[]>, tag) => {
                if (!acc[tag.categoria]) {
                  acc[tag.categoria] = [];
                }

                acc[tag.categoria].push(tag);

                return acc;
              },
              {} as Record<string, Tag[]>,
            ),
          ).map(([categoria, lista]) => (
            <div key={categoria} className="mb-4">
              <p className="text-xs font-bold text-gray-400 mb-2">
                {categoria}
              </p>

              <div className="flex flex-wrap gap-2">
                {(lista as Tag[]).map((tag) => {
                  const selecionada = tagsSelecionadas.some(
                    (t) => t.id === tag.id,
                  );

                  return (
                    <button
                      key={tag.id}
                      onClick={() => alternarTag(tag)}
                      className={`px-3 py-2 rounded-full text-xs font-bold
${selecionada ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"}
`}
                    >
                      {tag.emoji} {tag.nome}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Salvar */}
        <button
          onClick={salvarTags}
          className="
          w-full bg-green-500 text-white
          font-bold py-4 rounded-2xl
          "
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
