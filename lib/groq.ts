export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function chamarGroq(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY não configurada. Define a variável de ambiente para activar as respostas de IA."
    );
  }

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, messages }),
  });

  const json = await res.json();
  if (json.error) throw new Error(json.error.message || "Erro desconhecido do Groq");
  return String(json.choices[0].message.content).trim();
}
