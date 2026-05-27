import { useState } from "react";
import { useApp } from "../contexts/AppContext";

type Objetivo = "emagrecer" | "manter" | "ganhar";

export default function TelaPerfil() {
  const { xpTotal, nivel, streakDias } = useApp();
  const [nome, setNome] = useState("Paciente");
  const [peso, setPeso] = useState("70");
  const [altura, setAltura] = useState("1.70");
  const [idade, setIdade] = useState("30");
  const [objetivo, setObjetivo] = useState<Objetivo>("manter");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const imc =
    peso && altura ? (Number(peso) / Number(altura) ** 2).toFixed(1) : null;

  const classificacaoIMC = (imc: number) => {
    if (imc < 18.5) return { texto: "Abaixo do peso", cor: "text-blue-500" };
    if (imc < 25) return { texto: "Peso normal ✓", cor: "text-green-500" };
    if (imc < 30) return { texto: "Sobrepeso", cor: "text-yellow-500" };
    return { texto: "Obesidade", cor: "text-red-500" };
  };

  const tmb =
    peso && altura && idade
      ? Math.round(
          10 * Number(peso) +
            6.25 * Number(altura) * 100 -
            5 * Number(idade) +
            5,
        )
      : null;

  const caloriasDiarias = tmb ? Math.round(tmb * 1.55) : null;

  function salvarPerfil() {
    setSalvando(true);
    setTimeout(() => {
      setSalvando(false);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    }, 800);
  }

  const objetivos = [
    { tipo: "emagrecer" as Objetivo, icone: "📉", label: "Emagrecer" },
    { tipo: "manter" as Objetivo, icone: "⚖️", label: "Manter" },
    { tipo: "ganhar" as Objetivo, icone: "📈", label: "Ganhar massa" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm px-5 pt-12 pb-5">
        <h1 className="text-xl font-bold text-gray-800">Meu Perfil 👤</h1>
      </div>

      {/* Card de stats */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { icone: "⭐", valor: xpTotal, label: "XP Total" },
          { icone: "🏅", valor: `Nv ${nivel}`, label: "Nível" },
          { icone: "🔥", valor: streakDias, label: "Streak" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-2xl p-3 text-center shadow-sm"
          >
            <p className="text-xl">{s.icone}</p>
            <p className="font-bold text-gray-800">{s.valor}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Formulário */}
      <div className="px-4 mt-4 space-y-3">
        {/* Nome */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Nome
          </label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full mt-1 text-gray-800 font-medium outline-none
              border-b border-gray-100 pb-1 focus:border-green-400"
          />
        </div>

        {/* Dados físicos */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Dados Físicos
          </label>
          <div className="grid grid-cols-3 gap-3 mt-3">
            {[
              {
                label: "Peso (kg)",
                value: peso,
                setter: setPeso,
                placeholder: "70",
              },
              {
                label: "Altura (m)",
                value: altura,
                setter: setAltura,
                placeholder: "1.70",
              },
              {
                label: "Idade",
                value: idade,
                setter: setIdade,
                placeholder: "30",
              },
            ].map((field) => (
              <div key={field.label}>
                <p className="text-xs text-gray-400 mb-1">{field.label}</p>
                <input
                  type="number"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2
                    text-sm text-center outline-none focus:border-green-400 font-medium"
                />
              </div>
            ))}
          </div>
        </div>

        {/* IMC calculado */}
        {imc && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              IMC Calculado
            </label>
            <div className="flex items-center justify-between mt-2">
              <span className="text-3xl font-bold text-gray-800">{imc}</span>
              <span
                className={`font-semibold text-sm ${classificacaoIMC(Number(imc)).cor}`}
              >
                {classificacaoIMC(Number(imc)).texto}
              </span>
            </div>
            {caloriasDiarias && (
              <p className="text-xs text-gray-400 mt-2">
                💡 Necessidade calórica estimada:{" "}
                <b className="text-gray-600">{caloriasDiarias} kcal/dia</b>
              </p>
            )}
          </div>
        )}

        {/* Objetivo */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Meu Objetivo
          </label>
          <div className="flex gap-2 mt-3">
            {objetivos.map((o) => (
              <button
                key={o.tipo}
                onClick={() => setObjetivo(o.tipo)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl
                  border-2 transition-all text-sm font-medium
                  ${
                    objetivo === o.tipo
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-100 text-gray-400"
                  }`}
              >
                <span className="text-xl">{o.icone}</span>
                <span className="text-xs">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Botão salvar */}
        <button
          onClick={salvarPerfil}
          className={`w-full font-bold py-4 rounded-2xl shadow-md
            active:scale-95 transition-all
            ${salvo ? "bg-green-400 text-white" : "bg-green-500 text-white"}`}
        >
          {salvando ? "💾 Salvando..." : salvo ? "✓ Salvo!" : "Salvar Perfil"}
        </button>
      </div>
    </div>
  );
}
