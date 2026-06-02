import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

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
      max_tokens: 1000,
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

// ── Gera missões personalizadas com IA ────────────────
export async function gerarMissoesComIA(
  pacienteId: string,
  dadosAnamnese: Record<string, unknown>,
): Promise<MissaoGerada[]> {
  const prompt = `
Crie 6 a 8 missões para este paciente.

Dados:
${JSON.stringify(dadosAnamnese)}

Retorne APENAS JSON:

[
 {
   "titulo":"",
   "descricao":"",
   "tipo":"hidratacao",
   "icone":"💧",
   "xp_recompensa":20,
   "prioridade":8
 }
]

Tipos:
hidratacao
alimentacao
atividade
educacional

Personalize conforme dificuldades e objetivo.
`;

  const resposta = await chamarGroq(prompt);

  console.log("RESPOSTA GROQ:");
  console.log(resposta);

  try {
    const limpo = resposta.replace(/```json|```/g, "").trim();
    const missoes = JSON.parse(limpo) as MissaoGerada[];

    return missoes.map((m) => ({
      ...m,
      paciente_id: pacienteId,
      aprovada_nutri: false,
      ativa: true,
    }));
  } catch {
    console.error("Erro ao parsear missões do Groq:", resposta);
    return [];
  }
}

export interface MissaoGerada {
  paciente_id: string;
  titulo: string;
  descricao: string;
  tipo: "hidratacao" | "alimentacao" | "atividade" | "educacional";
  icone: string;
  xp_recompensa: number;
  prioridade: number;
  aprovada_nutri: boolean;
  ativa: boolean;
  id?: string;
}

// ── Extrai refeições do plano alimentar com IA ────────
export async function extrairRefeicoesComIA(texto: string) {
  const prompt = `
Converta o plano alimentar em JSON.

TEXTO:
${texto.slice(0, 5000)}

Retorne APENAS JSON:

[
 {
   "tipo":"cafe",
   "horario":"06:30",
   "opcoes":[
     {
       "numero":1,
       "itens":[
         {
           "nome":"",
           "quantidade":"",
           "alternativas":[]
         }
       ],
       "observacoes":""
     }
   ]
 }
]

Regras:
- tipos: cafe, almoco, sobremesa, lanche, jantar
- horario HH:MM
- alimentos substitutos devem ficar em alternativas
- não inventar alimentos
- não duplicar alimentos
- observacoes máximo 150 caracteres
- JSON válido
`;

  const resposta = await chamarGroq(prompt);

  console.log("=== RESPOSTA REFEIÇÕES ===");
  console.log(resposta);

  try {
    const limpo = resposta
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(limpo);
  } catch (e) {
    console.error("Erro parse refeições:", e);
    console.error("Resposta:", resposta);
    return [];
  }
}
