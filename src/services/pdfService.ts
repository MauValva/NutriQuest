import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Extrai todo o texto de um PDF
export async function extrairTextoPDF(arquivo: File): Promise<string> {
  const arrayBuffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const textoPagina = conteudo.items
      .map((item: Record<string, unknown>) => ("str" in item ? item.str : ""))
      .join(" ");
    textoCompleto += textoPagina + "\n";
  }

  return textoCompleto;
}

// Extrai dados da anamnese
export function extrairDadosAnamnese(texto: string) {
  const extrair = (padrao: RegExp) => {
    const match = texto.match(padrao);
    return match ? match[1].trim() : "";
  };

  const nome = extrair(/Nome do paciente:\s*(.+?)(?:\n|$)/i);

  const alturaStr = extrair(/Qual a sua altura\?\s*[\d*]\s*([\d.,]+)/i);
  const altura = alturaStr ? parseFloat(alturaStr.replace(",", ".")) : 0;

  const pesoStr = extrair(/Qual o seu peso atual\?\s*[\d*]\s*([\d.,]+)/i);
  const peso = pesoStr ? parseFloat(pesoStr.replace(",", ".")) : 0;

  // Detectar dificuldades para priorizar missões
  const textoLower = texto.toLowerCase();

  const dificuldades = {
    agua:
      textoLower.includes("água") &&
      (textoLower.includes("pouc") ||
        textoLower.includes("1-3") ||
        textoLower.includes("dificuldade") ||
        textoLower.includes("esqueç")),
    refeicoes:
      textoLower.includes("regrar") ||
      textoLower.includes("mais vezes") ||
      textoLower.includes("quantidade") ||
      textoLower.includes("qualidade"),
    tempo: textoLower.includes("tempo") && textoLower.includes("dificuldade"),
    atividade:
      textoLower.includes("sedentári") ||
      textoLower.includes("não pratica") ||
      textoLower.includes("nao pratica"),
  };

  const objetivo = textoLower.includes("emagrec")
    ? "emagrecer"
    : textoLower.includes("ganho de massa") ||
        textoLower.includes("massa muscular")
      ? "ganhar"
      : "manter";

  const alimento_favorito = extrair(/favorito\?\s*[\d*]\s*(.+?)(?:\n|$)/i);
  const nao_come = extrair(
    /não come de jeito nenhum\?\s*[\d*]\s*(.+?)(?:\n|$)/i,
  );
  const atividade_fisica = extrair(
    /atividade física\?\s*[\d*]\s*(.+?)(?:\n|$)/i,
  );
  const ingestao_agua = extrair(
    /ingestão diária de água[^?]*\?\s*[^0-9]*([0-9-]+)/i,
  );

  return {
    nome,
    peso,
    altura,
    objetivo: objetivo as "emagrecer" | "manter" | "ganhar",
    dificuldades,
    alimento_favorito,
    nao_come,
    atividade_fisica,
    ingestao_agua,
    texto_completo: texto,
  };
}

// Gera missões personalizadas com base na anamnese
export function gerarMissoesSugeridas(
  pacienteId: string,
  dados: ReturnType<typeof extrairDadosAnamnese>,
) {
  const missoes = [];

  // Missões de hidratação — prioridade alta se bebe pouco
  const prioridadeAgua = dados.dificuldades.agua ? 9 : 6;

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Copo de água ao acordar",
    descricao: "Beba um copo cheio de água logo ao acordar, antes do café",
    tipo: "hidratacao" as const,
    icone: "💧",
    xp_recompensa: 15,
    prioridade: prioridadeAgua,
    aprovada_nutri: false,
    ativa: true,
  });

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Meta de água diária",
    descricao: "Complete o consumo mínimo de 2,5L de água ao longo do dia",
    tipo: "hidratacao" as const,
    icone: "🥤",
    xp_recompensa: dados.dificuldades.agua ? 35 : 20,
    prioridade: prioridadeAgua,
    aprovada_nutri: false,
    ativa: true,
  });

  // Missões de alimentação
  const prioridadeRefeicao = dados.dificuldades.refeicoes ? 9 : 6;

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Registrar café da manhã",
    descricao: "Registre o que comeu no café da manhã no app",
    tipo: "alimentacao" as const,
    icone: "☀️",
    xp_recompensa: 20,
    prioridade: prioridadeRefeicao,
    aprovada_nutri: false,
    ativa: true,
  });

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Seguir o plano no almoço",
    descricao: "Siga as opções do plano alimentar no almoço de hoje",
    tipo: "alimentacao" as const,
    icone: "🍽️",
    xp_recompensa: 25,
    prioridade: prioridadeRefeicao,
    aprovada_nutri: false,
    ativa: true,
  });

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Incluir proteína nas refeições",
    descricao: "Garanta proteína em pelo menos 3 refeições hoje",
    tipo: "alimentacao" as const,
    icone: "🥩",
    xp_recompensa: 25,
    prioridade: dados.objetivo === "ganhar" ? 10 : 7,
    aprovada_nutri: false,
    ativa: true,
  });

  missoes.push({
    paciente_id: pacienteId,
    titulo: "Prato colorido",
    descricao: "Inclua pelo menos 3 cores de vegetais ou frutas hoje",
    tipo: "alimentacao" as const,
    icone: "🥗",
    xp_recompensa: 20,
    prioridade: 7,
    aprovada_nutri: false,
    ativa: true,
  });

  // Missão de atividade
  if (!dados.dificuldades.atividade) {
    missoes.push({
      paciente_id: pacienteId,
      titulo: "Alimentação pós-treino",
      descricao:
        "Consuma proteína até 1h após o treino para recuperação muscular",
      tipo: "atividade" as const,
      icone: "💪",
      xp_recompensa: 30,
      prioridade: dados.objetivo === "ganhar" ? 10 : 8,
      aprovada_nutri: false,
      ativa: true,
    });
  }

  // Missão educacional
  missoes.push({
    paciente_id: pacienteId,
    titulo: "Dica do dia",
    descricao: "Leia a dica nutricional do dia no app",
    tipo: "educacional" as const,
    icone: "📚",
    xp_recompensa: 10,
    prioridade: 5,
    aprovada_nutri: false,
    ativa: true,
  });

  // Ordenar por prioridade
  return missoes.sort((a, b) => b.prioridade - a.prioridade);
}

// Extrai refeições do plano alimentar
export function extrairRefeicoes(texto: string) {
  const refeicoes = [];

  const blocos = [
    {
      tipo: "cafe",
      padrao: /café da manhã(.*?)(?=\d{2}:\d{2}|$)/is,
      horario: "06:30",
    },
    {
      tipo: "almoco",
      padrao: /almoço(.*?)(?=sobremesa|\d{2}:\d{2}|$)/is,
      horario: "12:30",
    },
    {
      tipo: "lanche",
      padrao: /lanche da tarde(.*?)(?=\d{2}:\d{2}|$)/is,
      horario: "16:30",
    },
    {
      tipo: "jantar",
      padrao: /jantar(.*?)(?=\d{2}:\d{2}|$)/is,
      horario: "19:30",
    },
  ];

  for (const bloco of blocos) {
    const match = texto.match(bloco.padrao);
    if (match) {
      const textoBloco = match[1];

      // Extrai horário se existir no texto
      const horarioMatch = texto.match(
        new RegExp(
          `(\\d{2}:\\d{2}).*?${bloco.tipo === "cafe" ? "café" : bloco.tipo}`,
          "i",
        ),
      );
      const horario = horarioMatch ? horarioMatch[1] : bloco.horario;

      // Extrai itens (linhas com bullet •)
      const itens = textoBloco
        .split("\n")
        .filter((l) => l.includes("•") || l.trim().startsWith("-"))
        .map((l) => l.replace(/[•-]/g, "").trim())
        .filter((l) => l.length > 5)
        .slice(0, 8);

      if (itens.length > 0) {
        refeicoes.push({
          tipo: bloco.tipo,
          horario,
          opcoes: [
            {
              numero: 1,
              itens: itens.map((nome) => ({ nome, quantidade: "" })),
            },
          ],
          observacoes: "",
        });
      }
    }
  }

  return refeicoes;
}
