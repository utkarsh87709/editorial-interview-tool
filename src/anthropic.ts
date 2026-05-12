import type { InterviewTemplate, TemplateId } from "./workflows/templates";
import { investmentAppealPresetLine, questionsSystemBible, researchSystemBible } from "./workflows/editorialBible";

/** Per-topic cap for question calls — smaller payloads help stay under low org TPM (e.g. 10k input tokens/min). */
const MAX_RESEARCH_CHARS_PER_TOPIC_FOR_QUESTIONS = 1600;

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

type AnthropicCallOpts = {
  system: string;
  max_tokens?: number;
  /** Retries when Anthropic returns 429 rate_limit (default 6). */
  maxRetries?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function applyInterviewPlaceholders(text: string, fields: Fields): string {
  let s = text;
  s = s.replace(/\[MEDIA PARTNER NAME\]/gi, fields.publication);
  s = s.replace(/\[INTERVIEWEE NAME\]/gi, fields.name);
  s = s.replace(/\[TITLE \/ POSITION\]/gi, fields.title);
  s = s.replace(/\[TITLE\/POSITION\]/gi, fields.title);
  s = s.replace(/\[ORGANIZATION\]/gi, fields.org);
  s = s.replace(/\[COUNTRY IN FOCUS\]/gi, fields.countryInFocus);
  s = s.replace(/\[MEDIA PARTNER COUNTRY\]/gi, fields.mediaPartnerCountry);
  s = s.replace(/\[media country\]-based/gi, `${fields.mediaPartnerCountry}-based`);
  s = s.replace(/\[media country\]/gi, fields.mediaPartnerCountry);
  s = s.replace(/\[country\]/gi, fields.countryInFocus);
  s = s.replace(/\[date\]/gi, "your appointment");
  return s;
}

function extractJsonFromModelText(text: string): string {
  let cleanedText = text;

  cleanedText = cleanedText.replace(/^```(?:json)?\n?/gm, "").replace(/\n?```$/gm, "");
  cleanedText = cleanedText.replace(/^# .*$\n?/gm, "").replace(/^---+\n?/gm, "");

  if (cleanedText.includes('"questions"')) {
    const start = cleanedText.indexOf("{");
    const end = cleanedText.lastIndexOf("}");
    if (start !== -1 && end > start) return cleanedText.slice(start, end + 1).trim();
  }

  const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0].trim();

  const jsonStart = cleanedText.indexOf("[");
  const jsonEnd = cleanedText.lastIndexOf("]");
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return cleanedText.substring(jsonStart, jsonEnd + 1).trim();
  }

  return cleanedText.trim();
}

export async function anthropicMessages(
  apiKey: string,
  userText: string,
  opts: AnthropicCallOpts
): Promise<string> {
  const max_tokens = opts.max_tokens ?? 8192;
  const maxRetries = opts.maxRetries ?? 6;
  let lastErr = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
        max_tokens,
        system: opts.system,
        messages: [{ role: "user", content: userText }]
      })
    });

    const txt = await res.text().catch(() => "no response body");

    if (res.ok) {
      let data: { content?: Array<{ type?: string; text?: string }> };
      try {
        data = JSON.parse(txt) as { content?: Array<{ type?: string; text?: string }> };
      } catch {
        throw new Error(`Anthropic returned invalid JSON: ${txt.slice(0, 400)}`);
      }
      const text = data?.content?.find((c) => c?.type === "text")?.text;
      if (typeof text !== "string") {
        throw new Error("Anthropic response missing text content.");
      }
      return extractJsonFromModelText(text);
    }

    lastErr = `Anthropic error ${res.status}: ${txt}`;

    const isRateLimit = res.status === 429;
    if (isRateLimit && attempt < maxRetries) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
      const waitMs =
        !Number.isNaN(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.min(90_000, 10_000 * Math.pow(2, attempt));
      await sleep(waitMs);
      continue;
    }

    let msg = lastErr;
    if (isRateLimit) {
      msg +=
        " Your Anthropic org is limited to a low input-tokens-per-minute (TPM) budget. Wait at least one minute between \"Generate research\" and \"Generate questions\", shorten research in the editor, or request a higher limit from Anthropic.";
    } else if (/token|length|too large|context|maximum/i.test(txt) && res.status !== 429) {
      msg +=
        " If the prompt is too long, shorten research notes in the UI or generate questions again after a slimmer research pass.";
    }
    throw new Error(msg);
  }
}

function truncateForQuestionsPrompt(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars).trim()}\n\n[Truncated for length: ${t.length - maxChars} characters omitted; use only what appears above.]`;
}

function baseContext(fields: Fields): string {
  return [
    `Publication (media partner name): ${fields.publication}`,
    `Interviewee name (do not mention in questions): ${fields.name}`,
    `Interviewee title: ${fields.title}`,
    `Organization: ${fields.org}`,
    `Country in focus: ${fields.countryInFocus}`,
    `Media partner country audience: ${fields.mediaPartnerCountry}`,
    `Interviewee template type id: ${fields.typeId}`
  ].join("\n");
}

export function buildResearchPrompt(
  fields: Fields,
  topics: Topic[],
  templateLabel: string,
  templateId: TemplateId
): { system: string; user: string } {
  const topicList = topics
    .map((t, idx) => `${idx + 1}. topicId "${t.id}" -> ${t.label}`)
    .join("\n");

  const presidentResearchNote =
    templateId === "president"
      ? "\n\nFor president or ambassador: research every topic fully, including innovation and sustainability (topic 7), even though the eight interview questions generated by the app may omit that theme in favour of export strategy and international perception."
      : "";

  const user =
    `TASK: Stage 1 structured research only.\n\n` +
    `Locked interviewee template (do not switch types): ${templateLabel}\n\n` +
    `${baseContext(fields)}\n\n` +
    `Topics (strict order — research each in isolation; do not duplicate facts across topics):\n${topicList}\n\n` +
    `Each research "text" must be dense and verifiable for that theme only: multiple facts where available; each fact followed on the next line by Source: <full URL>.\n` +
    `Keep each topic under roughly 600 words so downstream question generation stays within API limits—prefer highest-value facts and citations over exhaustive lists.\n` +
    `Return ONLY valid JSON: first ${topics.length} objects in the listed order with matching topicId values, then one final object {"topicId":"legal_flag","text":"..."} as specified in the system instructions.` +
    presidentResearchNote;

  return { system: researchSystemBible(templateId), user };
}

function defaultQuestionIndices(topicCount: number): number[] {
  return Array.from({ length: Math.min(8, topicCount) }, (_, i) => i);
}

function nationInvestmentAppealTopic(topics: Topic[]): boolean {
  return topics.some((t) => /nation'?s investment appeal/i.test(t.label));
}

export function buildQuestionsPrompt(
  fields: Fields,
  template: InterviewTemplate,
  research: Array<{ topicId: string; label: string; text: string }>
): { system: string; user: string } {
  const indices =
    template.questionTopicIndices && template.questionTopicIndices.length === 8
      ? template.questionTopicIndices
      : defaultQuestionIndices(template.topics.length);

  const orderedTopics = indices.map((i) => template.topics[i]).filter(Boolean);
  const orderedFocuses = indices.map((i) =>
    applyInterviewPlaceholders(template.qFocuses[i] ?? "", fields)
  );

  const topicFocusList = orderedTopics
    .map(
      (t, idx) =>
        `Question ${idx + 1} — Topic: ${t.label} (topicId ${t.id})\n` +
        `S2 suggested focus (second sentence must implement this): ${orderedFocuses[idx] ?? ""}`
    )
    .join("\n\n");

  const preset = nationInvestmentAppealTopic(orderedTopics)
    ? investmentAppealPresetLine(fields.countryInFocus, fields.mediaPartnerCountry)
    : null;

  const investmentIdx = orderedTopics.findIndex((t) => /nation'?s investment appeal|investment appeal/i.test(t.label));
  const presetBlock =
    preset && investmentIdx !== -1
      ? `\n\nQuestion ${investmentIdx + 1} maps to national investment appeal. Use exactly this two-sentence question as the full string for questions[${investmentIdx}] unless research clearly disproves a statistic in sentence 1; if you must correct a figure, change sentence 1 only and keep sentence 2 structure and intent.\n${preset}\n`
      : preset
        ? `\n\nInvestment appeal preset (use verbatim for the question whose topic is national investment appeal):\n${preset}\n`
        : "";

  const rMap = new Map(research.map((r) => [r.topicId, r]));
  const uniqueIndices = [...new Set(indices)].sort((a, b) => a - b);
  const researchBlock = uniqueIndices
    .map((i) => {
      const t = template.topics[i];
      if (!t) return "";
      const r = rMap.get(t.id);
      const body = truncateForQuestionsPrompt(r?.text ?? "", MAX_RESEARCH_CHARS_PER_TOPIC_FOR_QUESTIONS);
      return `${t.label} [${t.id}]:\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  const system = questionsSystemBible(template.id);

  const user =
    `TASK: Stage 2 — exactly eight interview questions.\n\n` +
    `${baseContext(fields)}\n` +
    presetBlock +
    `\nQuestion-to-topic mapping: Question 1 aligns with the first mapped topic below, through question 8 with the eighth.\n\n` +
    `${topicFocusList}\n\n` +
    `Research notes for those eight topics only (each block capped for API size; do not invent facts beyond this text):\n${researchBlock}\n\n` +
    `Return ONLY valid JSON of this exact shape (no markdown):\n` +
    `{"questions":["...","...","...","...","...","...","...","..."],"legal_flag":"short factual note or N/A"}`;

  return { system, user };
}
