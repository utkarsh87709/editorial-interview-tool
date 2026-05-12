import type { InterviewTemplate, TemplateId } from "./templates";
import { anthropicMessages, buildResearchPrompt, buildQuestionsPrompt } from "../anthropic";

type Fields = {
  typeId: TemplateId | "";
  name: string;
  title: string;
  org: string;
  countryInFocus: string;
  publication: string;
  mediaPartnerCountry: string;
};

export type ResearchOut = { topicId: string; text: string };

export type GenerateResearchResult = { research: ResearchOut[]; legalFlag: string | null };

export type GenerateQuestionsResult = { questions: string[]; legalFlag: string | null };

function parseQuestionsPayload(raw: string): GenerateQuestionsResult {
  const data = JSON.parse(raw) as unknown;
  if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray((data as { questions?: unknown }).questions)) {
    const obj = data as { questions: unknown[]; legal_flag?: unknown; legalFlag?: unknown };
    const qs = obj.questions.map((x) => String(x ?? "").trim()).slice(0, 8);
    if (qs.length !== 8 || qs.some((q) => !q)) {
      throw new Error("Questions response must contain 8 non-empty strings.");
    }
    const lf = obj.legal_flag ?? obj.legalFlag;
    return { questions: qs, legalFlag: typeof lf === "string" ? lf.trim() : null };
  }
  if (Array.isArray(data)) {
    const qs = data.map((x) => String(x ?? "").trim()).slice(0, 8);
    if (qs.length !== 8 || qs.some((q) => !q)) {
      throw new Error("Questions response must contain 8 non-empty strings.");
    }
    return { questions: qs, legalFlag: null };
  }
  throw new Error("Questions response invalid JSON shape.");
}

export async function generateResearch(opts: {
  fields: Fields;
  template: InterviewTemplate;
  apiKey: string;
}): Promise<GenerateResearchResult> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("Claude API key is required");

  const { system, user } = buildResearchPrompt(
    opts.fields,
    opts.template.topics,
    opts.template.label,
    opts.template.id
  );
  const responseText = await anthropicMessages(apiKey, user, { system, max_tokens: 12000 });

  try {
    const data = JSON.parse(responseText) as ResearchOut[];
    if (!Array.isArray(data)) throw new Error("Research response invalid.");
    const legal = data.find((x) => x.topicId === "legal_flag");
    const topics = data.filter((x) => x.topicId !== "legal_flag");
    return {
      research: topics,
      legalFlag: legal?.text?.trim() ? legal.text.trim() : null
    };
  } catch (e) {
    throw new Error(`Failed to parse research response: ${e instanceof Error ? e.message : String(e)} — ${responseText.slice(0, 500)}`);
  }
}

export async function generateQuestions(opts: {
  fields: Fields;
  template: InterviewTemplate;
  research: Array<{ topicId: string; label: string; text: string }>;
  apiKey: string;
}): Promise<GenerateQuestionsResult> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("Claude API key is required");

  const { system, user } = buildQuestionsPrompt(opts.fields, opts.template, opts.research);
  const responseText = await anthropicMessages(apiKey, user, { system, max_tokens: 4096 });

  try {
    return parseQuestionsPayload(responseText);
  } catch (e) {
    throw new Error(`Failed to parse questions response: ${e instanceof Error ? e.message : String(e)} — ${responseText.slice(0, 500)}`);
  }
}
