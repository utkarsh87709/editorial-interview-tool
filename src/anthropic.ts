import { SYSTEM_PROMPT } from "./workflows/promptRules";

export type Fields = {
  typeId: string;
  name: string;
  title: string;
  org: string;
  countryInFocus: string;
  publication: string;
  mediaPartnerCountry: string;
};

export type Topic = { id: string; label: string };

export async function anthropicMessages(apiKey: string, userText: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 3000,
      messages: [{ role: "user", content: userText }]
    })
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "no response body");
    throw new Error(`Anthropic error ${res.status}: ${txt}`);
  }

  const data = await res.json();
  const text = data?.content?.find((c: any) => c?.type === "text")?.text;
  if (typeof text !== "string") {
    throw new Error("Anthropic response missing text content.");
  }

  // Extract JSON from response - handle various formats
  let cleanedText = text;

  // Remove markdown code blocks
  cleanedText = cleanedText.replace(/^```(?:json)?\n?/gm, "").replace(/\n?```$/gm, "");

  // Remove headers and separators
  cleanedText = cleanedText.replace(/^# .*$\n?/gm, "").replace(/^---+\n?/gm, "");

  // Find JSON array (look for opening [ and closing ])
  const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    cleanedText = jsonMatch[0];
  }

  // If no JSON array found, try to find JSON object
  if (!cleanedText.trim().startsWith('[') && !cleanedText.trim().startsWith('{')) {
    const jsonStart = cleanedText.indexOf('[');
    const jsonEnd = cleanedText.lastIndexOf(']');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
    }
  }

  return cleanedText.trim();
}

function baseContext(fields: Fields): string {
  return [
    `Publication: ${fields.publication}`,
    `Interviewee name (do not mention in questions): ${fields.name}`,
    `Interviewee title: ${fields.title}`,
    `Organization: ${fields.org}`,
    `Country in focus: ${fields.countryInFocus}`,
    `Media partner country (use as [media country]): ${fields.mediaPartnerCountry}`
  ].join("\n");
}

export function buildResearchPrompt(fields: Fields, topics: Topic[]): string {
  const topicList = topics
    .map((t, idx) => `${idx + 1}. ${t.id} -> ${t.label}`)
    .join("\n");

  return (
    `${SYSTEM_PROMPT}\n\n` +
    `CRITICAL: Return ONLY a valid JSON array with NO markdown, NO headers, NO explanations.\n` +
    `Format: [{"topicId": "string", "text": "string"}, ...]\n` +
    `Provide 2-3 key facts with sources per topic.\n\n` +
    `${baseContext(fields)}\n\n` +
    `Topics:\n${topicList}\n\n` +
    `Output exactly ${topics.length} items as pure JSON.`
  );
}

export function buildQuestionsPrompt(
  fields: Fields,
  topics: Topic[],
  qFocuses: string[],
  research: Array<{ topicId: string; label: string; text: string }>
): string {
  const orderedTopics = topics.slice(0, 8);
  const orderedFocuses = qFocuses.slice(0, 8);

  const topicFocusList = orderedTopics
    .map((t, idx) => `${idx + 1}. ${t.label}\nS2 template: ${orderedFocuses[idx] ?? ""}`)
    .join("\n\n");

  return (
    `${SYSTEM_PROMPT}\n\n` +
    `CRITICAL: Return ONLY a valid JSON array of exactly 8 strings with NO markdown, NO headers, NO explanations.\n` +
    `Format: ["question1", "question2", ..., "question8"]\n` +
    `Each string = two sentences: fact + question.\n\n` +
    `${baseContext(fields)}\n\n` +
    `Topics + Templates:\n${topicFocusList}\n\n` +
    `Research:\n${research.map((r) => `${r.label}: ${r.text}`).join("\n")}`
  );
}