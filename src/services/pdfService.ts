import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface Alternativa {
  nome: string;
  quantidade: string;
}

export interface ItemRefeicao {
  nome: string;
  quantidade: string;
  alternativas?: Alternativa[];
  observacao?: string;
}

export interface RefeicaoEstruturada {
  horario: string;
  tipo: "cafe" | "almoco" | "jantar" | "lanche" | "sobremesa" | "complemento";
  opcao: number;
  itens: ItemRefeicao[];
  observacoes?: string;
  frequencia_semanal?: number;
}

// ── Extrai texto bruto do PDF ─────────────────────────
export async function extrairTextoPDF(arquivo: File): Promise<string> {
  const arrayBuffer = await arquivo.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textoCompleto = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const pagina = await pdf.getPage(i);
    const conteudo = await pagina.getTextContent();
    const textoPagina = conteudo.items
      .map((item: Record<string, unknown>) =>
        typeof item["str"] === "string" ? item["str"] : "",
      )
      .join(" ");
    textoCompleto += textoPagina + "\n";
  }

  return textoCompleto;
}

// ── Chama o Groq com um prompt ──────────────────────
async function chamarGroq(prompt: string): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Erro Groq:", data);
    throw new Error(data?.error?.message ?? `Erro HTTP ${response.status}`);
  }

  return data.choices?.[0]?.message?.content ?? "";
}

// ── Lê anamnese com IA ────────────────────────────────
export async function extrairDadosAnamneseComIA(texto: string) {
  const prompt = `
Extraia os dados da anamnese e retorne APENAS JSON válido.

Texto:
${texto.slice(0, 2500)}

Formato:
{
  "nome":"",
  "peso":0,
  "altura":0,
  "idade":0,
  "objetivo":"",
  "dificuldades":{
    "agua":false,
    "refeicoes":false,
    "tempo":false,
    "atividade":false
  },
  "alimento_favorito":"",
  "nao_come":"",
  "atividade_fisica":"",
  "ingestao_agua":"",
  "observacoes_relevantes":""
}

Regras:
- objetivo: emagrecer, ganhar ou manter
- peso e altura numéricos
- idade=0 se ausente
- observacoes_relevantes: máximo 150 caracteres
`;

  const resposta = await chamarGroq(`
${prompt}

IMPORTANTE:
- Retorne SOMENTE JSON.
- Não escreva explicações.
- Não use markdown.
- Não use \`\`\`json.
- O JSON deve ser válido do início ao fim.
- Resuma observações muito longas para no máximo 150 caracteres.
`);

  try {
    const limpo = resposta.replace(/```json|```/g, "").trim();
    return JSON.parse(limpo);
  } catch {
    console.error("Erro ao parsear resposta do Groq:", resposta);
    return null;
  }
}

export function normalizarPlanoAlimentar(texto: string): string {
  return (
    texto
      .replace(/Priscila Ferrão[\s\S]*?Prescrito em:.*?\./g, "")
      .replace(/Acesse o app[\s\S]*?consulta\./g, "")
      .replace(/Página\s+\d+\/\d+[\s\S]*?\d{4}\./g, "")

      // Café opção 1 — sem horário e sem número
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Café da manhã\s*(?!-\s*Opção)(?=\s*•)/gi,
        "06:30 - Café da manhã - Opção 1 ",
      )
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Café da manhã\s*-\s*Opção\s*(\d+)/gi,
        "06:30 - Café da manhã - Opção $1",
      )

      // Almoço
      .replace(
        /12:30\s*-\s*Almoço(?!\s*-\s*Opção)/gi,
        "12:30 - Almoço - Opção 1",
      )
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Almoço\s*-\s*Opção\s*(\d+)/gi,
        "12:30 - Almoço - Opção $1",
      )

      // Sobremesa — DEVE vir antes de qualquer outro replace que possa consumir o conteúdo
      // Captura "Sobremesa 4x na semana" e os bullets que vêm DEPOIS
      .replace(
        /Sobremesa\s+(\d+)x\s*na\s*semana\s*/gi,
        (_, n) => `14:00 - Sobremesa - Opção 1 [freq:${n}] `,
      )
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Sobremesa\s*-\s*Opção\s*(\d+)/gi,
        "14:00 - Sobremesa - Opção $1",
      )
      .replace(/(Bis)\s+Observa[çc][ãa]o:/gi, "$1 ###OBSERVACAO_SOBREMESA### ")

      // Lanche — Opção 1 já vem com horário mas sem número
      .replace(
        /16:30\s*-\s*Lanche da tarde(?!\s*-\s*Opção)/gi,
        "16:30 - Lanche da tarde - Opção 1",
      )
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Lanche da tarde\s*-\s*Opção\s*(\d+)/gi,
        "16:30 - Lanche da tarde - Opção $1",
      )

      // Jantar
      .replace(
        /19:30\s*-\s*Jantar(?!\s*-\s*Opção)/gi,
        "19:30 - Jantar - Opção 1",
      )
      .replace(
        /(?<!\d{2}:\d{2}\s*-\s*)Jantar\s*-\s*Opção\s*(\d+)/gi,
        "19:30 - Jantar - Opção $1",
      )
  );
}

export function extrairRefeicoesPorRegex(texto: string): RefeicaoEstruturada[] {
  texto = normalizarPlanoAlimentar(texto);
  const refeicoes: RefeicaoEstruturada[] = [];
  const regex =
    /(\d{2}:\d{2})\s*-\s*(Café da manhã|Almoço|Lanche da tarde|Jantar|Sobremesa|Complemento)\s*-\s*Opção\s*(\d+)([\s\S]*?)(?=\d{2}:\d{2}\s*-|$)/gi;

  let match;
  while ((match = regex.exec(texto)) !== null) {
    const horario = match[1];
    const tipo = normalizarTipo(match[2]);
    const opcaoNum = Number(match[3]);
    const blocoRaw = match[4];

    // Extrai frequência semanal se existir
    const freqMatch = blocoRaw.match(/\[freq:(\d+)\]/);
    const frequencia_semanal = freqMatch ? Number(freqMatch[1]) : undefined;

    const bloco = limparConteudoPlano(blocoRaw.replace(/\[freq:\d+\]/g, ""));
    console.log("TIPO:", tipo);
    console.log("BLOCO RAW:", blocoRaw);
    console.log("BLOCO LIMPO:", bloco);
    const observacoes = extrairObservacoes(blocoRaw);

    const itensExtraidos = extrairItens(bloco);

    console.log("ITENS EXTRAIDOS:", tipo, itensExtraidos);
    refeicoes.push({
      horario,
      tipo,
      opcao: opcaoNum,
      //itens: extrairItens(bloco),
      itens: itensExtraidos,
      observacoes: observacoes || undefined,
      frequencia_semanal,
    });
  }

  return refeicoes;
}

function normalizarTipo(
  tipo: string,
): "cafe" | "almoco" | "lanche" | "jantar" | "sobremesa" | "complemento" {
  const t = tipo.toLowerCase();
  if (t.includes("café")) return "cafe";
  if (t.includes("almoço")) return "almoco";
  if (t.includes("lanche")) return "lanche";
  if (t.includes("sobremesa")) return "sobremesa";
  if (t.includes("complemento")) return "complemento";

  return "jantar";
}

function limparConteudoPlano(texto: string): string {
  return texto
    .replace(/Priscila Ferrão[\s\S]*?Prescrito em:.*?\./g, "")
    .replace(/Página\s+\d+\/\d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extrairItens(bloco: string): ItemRefeicao[] {
  const itens: ItemRefeicao[] = [];

  bloco = bloco.replace(/###OBSERVACAO_SOBREMESA###[\s\S]*$/i, "");

  const blocoItens = bloco.split(/Observa[çc][õo]e?s?:/i)[0];
  const linhas = blocoItens.split("•");

  for (const linha of linhas) {
    const texto = linha.trim();
    if (!texto) continue;
    // Se existir observação dentro do item,
    // corta ela para não virar nome do alimento
    const textoLimpo = texto
      .replace(/###OBSERVACAO_SOBREMESA###[\s\S]*/i, "")
      .trim();

    if (!textoLimpo) continue;
    if (/^-?\s*opção\s*\d+/i.test(textoLimpo)) continue;

    // Separa alternativas pelo "ou" de forma segura
    let partes = textoLimpo.split(/\s+-\s+ou\s+-\s+/i);
    // Se não encontrou o padrão correto,
    // tenta variações de erro de digitação da nutri
    if (partes.length === 1) {
      partes = textoLimpo.split(
        /\s+-\s+ou-\s+|\s+-ou\s+-|\s+-ou-\s+|\s+ou-\s+|\s+ou\s+-|\s+-\s+ou\s+|\s+-ou\s+/i,
      );
    }
    partes = partes.map((p) => p.trim()).filter(Boolean);

    if (partes.length === 0) continue;

    if (partes.length === 1) {
      // Item simples — sem alternativas
      const parsed = parseNomeQtd(partes[0]);
      if (!parsed || !parsed.nome) continue;
      itens.push({
        nome: parsed.nome,
        quantidade: parsed.quantidade,
        observacao: parsed.observacao,
      });
    } else {
      // Item com alternativas
      // A observação pode estar na ÚLTIMA parte — extrai antes do parse
      //const ultimaParte = partes[partes.length - 1];
      let observacaoGrupo = "";

      const OBS_PATTERNS = [
        /\s*com café sem açúcar ou com adoçante\.?/gi,
        /\s*retire bem o excesso de óleo\.?/gi,
        /\s*tempere e pese cru\.?/gi,
      ];

      // Procura observação em qualquer parte (geralmente na última)
      const partesLimpas = partes.map((p) => {
        let limpa = p;
        for (const re of OBS_PATTERNS) {
          const m = limpa.match(re);
          if (m && !observacaoGrupo) {
            observacaoGrupo = m[0].trim();
          }
          limpa = limpa.replace(re, "").trim();
        }
        return limpa;
      });

      // Parse de cada alternativa sem a observação
      const alternativas = partesLimpas
        .map((p) => {
          const parsed = parseNomeQtd(p);
          if (!parsed || !parsed.nome) return null;
          return { nome: parsed.nome, quantidade: parsed.quantidade };
        })
        .filter(Boolean) as { nome: string; quantidade: string }[];

      if (alternativas.length === 0) continue;

      itens.push({
        nome: alternativas[0].nome,
        quantidade: alternativas[0].quantidade,
        observacao: observacaoGrupo || undefined,
        alternativas, // inclui todas, inclusive a primeira
      });
    }
  }

  return itens;
}

// Parse de "Nome   - quantidade com café sem açúcar..."
function parseNomeQtd(texto: string): {
  nome: string;
  quantidade: string;
  observacao?: string;
} | null {
  texto = texto.trim().replace(/\s+/g, " ");
  if (!texto) return null;

  // Observações conhecidas para extrair
  const OBS = [
    /\s*-?\s*com café sem açúcar ou com adoçante\.?/gi,
    /\s*-?\s*retire bem o excesso de óleo\.?/gi,
    /\s*-?\s*tempere e pese cru\.?/gi,
    /\s*\(opcional\)/gi,
  ];

  let observacao = "";
  let t = texto;

  for (const re of OBS) {
    const m = t.match(re);
    if (m) {
      observacao = m[0].replace(/^\s*-?\s*/, "").trim();
      t = t.replace(re, "").trim();
    }
  }

  // Remove " - " sobrando no final
  t = t.replace(/\s*-\s*$/, "").trim();

  // Nomes conhecidos que contêm traço — trata como nome fixo
  const nomesComTraco = [
    /^(Aveia em flocos finos Sabor Sacau\s*-\s*Viver\s*-\s*Carrefour)\s*-\s*(.+)$/i,
    /^(Carne bovina de segunda sem osso e sem a gordura)\s*-\s*(.+)$/i,
    /^(Leite em pó desnatado)\s*-\s*(.+)$/i,
  ];

  for (const re of nomesComTraco) {
    const m = t.match(re);
    if (m) {
      return {
        nome: m[1].trim(),
        quantidade: m[2].trim(),
        observacao: observacao || undefined,
      };
    }
  }

  // Padrão geral: primeiro " - " separa nome de quantidade
  const idx = t.indexOf(" - ");
  if (idx === -1) {
    return { nome: t, quantidade: "", observacao: observacao || undefined };
  }

  const nome = t.slice(0, idx).trim();
  const quantidade = t.slice(idx + 3).trim();

  return { nome, quantidade, observacao: observacao || undefined };
}

function extrairObservacoes(bloco: string): string {
  const sobremesaObs = bloco.match(
    /###OBSERVACAO_SOBREMESA###([\s\S]*?)(?=\d{2}:\d{2}\s*-|$)/i,
  );

  if (sobremesaObs) {
    return sobremesaObs[1].trim();
  }
  // Captura tudo após "Observações:" até o fim do bloco
  const match = bloco.match(/Observa[çc][õo]e?s?:\s*([\s\S]+?)$/i);
  if (!match) return "";

  return match[1]
    .replace(/Priscila Ferrão[\s\S]*?(?=\n|$)/g, "")
    .replace(/CRN2[\s\S]*?(?=\n|$)/g, "")
    .replace(/whats:[\s\S]*?(?=\n|$)/g, "")
    .replace(/Instagram:[\s\S]*?(?=\n|$)/g, "")
    .replace(/Acesse o app[\s\S]*?(?=\n|$)/g, "")
    .replace(/Página\s+\d+\/\d+[\s\S]*?(?=\n|$)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
