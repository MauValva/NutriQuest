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
  titulo?: string;
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
  console.log("🔵 extrairTextoPDF CHAMADO", arquivo.name);
  try {
    const arrayBuffer = await arquivo.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textoCompleto = "";

    interface ItemPosicionado {
      texto: string;
      x: number;
      y: number;
    }

    for (let i = 1; i <= pdf.numPages; i++) {
      const pagina = await pdf.getPage(i);
      const conteudo = await pagina.getTextContent();

      const itensPosicionados: ItemPosicionado[] = conteudo.items
        .map((item: Record<string, unknown>) => {
          const texto = typeof item["str"] === "string" ? item["str"] : "";
          const transform = item["transform"] as number[] | undefined;
          if (!transform || !texto) return null;
          // transform[4] = x, transform[5] = y (coordenadas do PDF)
          return { texto, x: transform[4], y: transform[5] };
        })
        .filter((it): it is ItemPosicionado => it !== null);

      // Agrupa itens que estão na MESMA linha (Y aproximado) e, dentro
      // de cada linha, ordena por X — isso reconstrói a ordem de leitura
      // real, independente da ordem em que o PDF os desenhou no stream.
      // Sem isso, trechos em negrito/normal na mesma frase podem vir
      // fora de ordem e o bullet "•" do próximo item cai no meio do atual.
      const TOLERANCIA_Y = 2;
      const linhasMap = new Map<number, ItemPosicionado[]>();

      for (const item of itensPosicionados) {
        let chave: number | undefined;
        for (const k of linhasMap.keys()) {
          if (Math.abs(k - item.y) <= TOLERANCIA_Y) {
            chave = k;
            break;
          }
        }
        if (chave === undefined) chave = item.y;
        if (!linhasMap.has(chave)) linhasMap.set(chave, []);
        linhasMap.get(chave)!.push(item);
      }

      // PDF: Y maior = mais no topo da página → ordena decrescente
      const linhasOrdenadas = Array.from(linhasMap.entries()).sort(
        (a, b) => b[0] - a[0],
      );

      const textoPagina = linhasOrdenadas
        .map(([, itens]) =>
          itens
            .sort((a, b) => a.x - b.x)
            .map((it) => it.texto)
            .join(" "),
        )
        .join("\n");

      textoCompleto += textoPagina + "\n";
    }
    console.log("🟢 TEXTO COMPLETO EXTRAÍDO:\n", textoCompleto);
    return textoCompleto;
  } catch (e) {
    console.error("🔴 ERRO DENTRO DE extrairTextoPDF:", e);
    throw e;
  }
}

// =========================
// LIMPEZA DE CABEÇALHO/RODAPÉ — genérica para qualquer nutricionista
// =========================
// Este PDF é gerado por uma plataforma que sempre segue este template
// de página, independente de quem é a nutricionista:
//   [Nome]
//   CRN[2|3] [número]
//   whats: [número]
//   Instagram: [@handle]
//   ...conteúdo...
//   Acesse o app e veja o conteúdo completo da sua consulta.
//   Página X/Y | Paciente [nome] | Prescrito em: DD/MM/AAAA.
//
// Por isso removemos pelos RÓTULOS fixos da plataforma (CRN, whats:,
// Instagram:, Página X/Y, Prescrito em:), nunca pelo nome da nutri
// ou da paciente — assim funciona para qualquer nutricionista/paciente
// sem precisar editar este arquivo de novo.
function limparCabecalhoRodape(texto: string): string {
  return (
    texto
      // Bloco de identidade da nutri: linha com nome + as 3 linhas seguintes
      // fixas da plataforma (CRN, whats, Instagram)
      .replace(
        /^[^\n]*\n\s*CRN\d?\s*\d+\s*\n\s*whats:[^\n]*\n\s*Instagram:[^\n]*\n?/gim,
        "",
      )
      .replace(/Acesse o app[^\n]*conteúdo completo[^\n]*\n?/gi, "")
      .replace(
        /Página\s+\d+\/\d+\s*\|\s*Paciente[^\n]*Prescrito em:[^\n]*\.\n?/gi,
        "",
      )
  );
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

// =========================
// CONFIGURAÇÃO DE TIPOS DE REFEIÇÃO
// =========================
type TipoRefeicao =
  | "cafe"
  | "almoco"
  | "lanche"
  | "jantar"
  | "sobremesa"
  | "complemento";

interface TipoConfig {
  tipo: TipoRefeicao;
  regex: RegExp; // usado para IDENTIFICAR o nome cru capturado
  nomeCanonico: string; // nome usado no texto normalizado
  horarioPadrao: string; // usado só se o PDF não trouxer horário
}

const TIPOS: TipoConfig[] = [
  {
    tipo: "cafe",
    regex: /café da manhã/i,
    nomeCanonico: "Café da manhã",
    horarioPadrao: "06:30",
  },
  {
    tipo: "almoco",
    regex: /almoço/i,
    nomeCanonico: "Almoço",
    horarioPadrao: "12:30",
  },
  {
    tipo: "lanche",
    regex: /lanche(?:\s+da\s+tarde)?/i,
    nomeCanonico: "Lanche da tarde",
    horarioPadrao: "16:30",
  },
  {
    tipo: "jantar",
    regex: /jantar/i,
    nomeCanonico: "Jantar",
    horarioPadrao: "19:30",
  },
  {
    tipo: "sobremesa",
    regex: /sobremesa/i,
    nomeCanonico: "Sobremesa",
    horarioPadrao: "14:00",
  },
  {
    tipo: "complemento",
    regex: /complemento/i,
    nomeCanonico: "Complemento",
    horarioPadrao: "21:00",
  },
];

// Nomes possíveis, na ordem em que aparecem em TIPOS (mais específico primeiro:
// "lanche da tarde" precisa ser tentado antes de cair só em "lanche")
const NOMES_ALTERNATIVOS = [
  "Café da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Sobremesa",
  "Complemento",
].join("|");

// Cabeçalho genérico:
// [HH:MM -] Nome [ (qualquer parêntese) ] [- Opção N] [Nx na semana]
// Cada peça é OPCIONAL e independente das outras.
const HEADER_REGEX = new RegExp(
  `(?:(\\d{2}:\\d{2})\\s*-\\s*)?` +
    `(${NOMES_ALTERNATIVOS})` +
    `\\s*(?:\\([^)]*\\))?` +
    `\\s*(?:-\\s*Opção\\s*(\\d+))?` +
    `\\s*(?:(\\d+)\\s*x\\s*na\\s*semana)?`,
  "g", // sem "i" — cabeçalhos de refeição vêm sempre com inicial maiúscula
  // (Sobremesa, Complemento, Almoço, Jantar); minúsculo só ocorre
  // como palavra comum no meio de frases (ex: "1 col. de sobremesa",
  // "algum complemento", "almoço ou jantar" em observações) e nunca
  // deve virar cabeçalho.
);

function getConfigPorNome(nomeCru: string): TipoConfig {
  const config = TIPOS.find((t) => t.regex.test(nomeCru));
  // fallback defensivo — não deve acontecer já que NOMES_ALTERNATIVOS
  // é gerado a partir de TIPOS, mas evita undefined em produção
  return config ?? TIPOS[3]; // jantar como fallback, igual ao comportamento antigo
}

// =========================
// NORMALIZAÇÃO
// =========================
export function normalizarPlanoAlimentar(texto: string): string {
  let limpo = limparCabecalhoRodape(texto);

  limpo = limpo.replace(
    HEADER_REGEX,
    (_match, horario, nomeCru, opcao, freq) => {
      const config = getConfigPorNome(nomeCru);
      const horarioFinal = horario ?? config.horarioPadrao;
      const opcaoFinal = opcao ?? "1";

      let freqTag = "";
      if (freq) {
        freqTag = ` [freq:${freq}]`;
      } else if (config.tipo === "sobremesa") {
        freqTag = ` [freq:7]`;
      }

      return `${horarioFinal} - ${config.nomeCanonico} - Opção ${opcaoFinal}${freqTag}`;
    },
  );

  return limpo.replace(/\s+/g, " ").trim();
}

export function extrairRefeicoesPorRegex(texto: string): RefeicaoEstruturada[] {
  texto = normalizarPlanoAlimentar(texto);
  console.log("🟡 TEXTO NORMALIZADO:\n", texto);
  const regex =
    /(\d{2}:\d{2})\s*-\s*(Café da manhã|Almoço|Lanche da tarde|Jantar|Sobremesa|Complemento)\s*-\s*Opção\s*(\d+)([\s\S]*?)(?=\d{2}:\d{2}\s*-|$)/gi;

  // dedup por tipo+opção — mantém a ÚLTIMA ocorrência (assumindo que
  // se o texto repete um bloco, o mais recente reflete a versão final)
  const porChave = new Map<string, RefeicaoEstruturada>();

  let match;
  while ((match = regex.exec(texto)) !== null) {
    const horario = match[1];
    const tipo = normalizarTipo(match[2]);
    const opcaoNum = Number(match[3]);
    const blocoRaw = match[4];

    const freqMatch = blocoRaw.match(/\[freq:(\d+)\]/);
    const frequencia_semanal = freqMatch ? Number(freqMatch[1]) : undefined;

    const bloco = limparConteudoPlano(blocoRaw.replace(/\[freq:\d+\]/g, ""));
    const observacoes = extrairObservacoes(blocoRaw);
    const itensExtraidos = extrairItens(bloco);

    const chave = `${tipo}_${opcaoNum}`;
    porChave.set(chave, {
      horario,
      tipo,
      opcao: opcaoNum,
      itens: itensExtraidos,
      observacoes: observacoes || undefined,
      frequencia_semanal,
    });
  }

  return Array.from(porChave.values());
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
  return limparCabecalhoRodape(texto).replace(/\s+/g, " ").trim();
}

function extrairItens(bloco: string): ItemRefeicao[] {
  const itens: ItemRefeicao[] = [];

  bloco = bloco.replace(/###OBSERVACAO_SOBREMESA###[\s\S]*$/i, "");

  const blocoItens = bloco.split(/Observa[çc][õo]e?s?:/i)[0];
  console.log(
    "BLOCO ITENS (antes do split por •):",
    JSON.stringify(blocoItens),
  );

  const linhas = blocoItens.split("•");
  console.log("QUANTIDADE DE LINHAS APÓS SPLIT POR •:", linhas.length);
  console.log(
    "LINHAS:",
    linhas.map((l) => JSON.stringify(l.trim())),
  );

  for (const linha of linhas) {
    const texto = linha.trim();
    if (!texto) continue;
    const textoLimpo = texto
      .replace(/###OBSERVACAO_SOBREMESA###[\s\S]*/i, "")
      .trim();

    if (!textoLimpo) continue;
    if (/^-?\s*opção\s*\d+/i.test(textoLimpo)) continue;

    let partes = textoLimpo.split(/\s+-\s+ou\s+-\s+/i);
    if (partes.length === 1) {
      partes = textoLimpo.split(
        /\s+-\s+ou-\s+|\s+-ou\s+-|\s+-ou-\s+|\s+ou-\s+|\s+ou\s+-|\s+-\s+ou\s+|\s+-ou\s+/i,
      );
    }
    partes = partes.map((p) => p.trim()).filter(Boolean);

    console.log("LINHA:", JSON.stringify(textoLimpo), "→ PARTES:", partes);

    if (partes.length === 0) continue;

    if (partes.length === 1) {
      const parsed = parseNomeQtd(partes[0]);
      console.log("  PARSED (item simples):", parsed);
      if (!parsed || !parsed.nome) continue;
      itens.push({
        nome: parsed.nome,
        quantidade: parsed.quantidade,
        observacao: parsed.observacao,
      });
    } else {
      let observacaoGrupo = "";
      const OBS_PATTERNS = [
        /\s*com café sem açúcar ou com adoçante\.?/gi,
        /\s*retire bem o excesso de óleo\.?/gi,
        /\s*tempere e pese cru\.?/gi,
      ];

      const partesLimpas = partes.map((p) => {
        let limpa = p;
        for (const re of OBS_PATTERNS) {
          const m = limpa.match(re);
          if (m && !observacaoGrupo) observacaoGrupo = m[0].trim();
          limpa = limpa.replace(re, "").trim();
        }
        return limpa;
      });

      const alternativas = partesLimpas
        .map((p) => parseNomeQtd(p))
        .filter((p): p is NonNullable<typeof p> => !!p && !!p.nome)
        .map((p) => ({ nome: p.nome, quantidade: p.quantidade }));

      console.log("  ALTERNATIVAS parseadas:", alternativas);

      if (alternativas.length === 0) continue;

      itens.push({
        nome: alternativas[0].nome,
        quantidade: alternativas[0].quantidade,
        observacao: observacaoGrupo || undefined,
        alternativas,
      });
    }
  }

  console.log("ITENS FINAIS DESTE BLOCO:", itens);
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
