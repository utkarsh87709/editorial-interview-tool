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

export async function generateResearch(opts: {
  fields: Fields;
  template: InterviewTemplate;
  apiKey: string;
}): Promise<ResearchOut[]> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("Claude API key is required");

  const prompt = buildResearchPrompt(opts.fields, opts.template.topics);
  const responseText = await anthropicMessages(apiKey, prompt);

  try {
    const data = JSON.parse(responseText) as ResearchOut[];
    if (!Array.isArray(data)) throw new Error("Research response invalid.");
    return data;
  } catch (e) {
    throw new Error(`Failed to parse research response: ${responseText}`);
  }
}

export async function generateQuestions(opts: {
  fields: Fields;
  template: InterviewTemplate;
  research: Array<{ topicId: string; label: string; text: string }>;
  apiKey: string;
}): Promise<string[]> {
  const apiKey = opts.apiKey;
  if (!apiKey) throw new Error("Claude API key is required");

  const prompt = buildQuestionsPrompt(opts.fields, opts.template.topics, opts.template.qFocuses, opts.research);
  const responseText = await anthropicMessages(apiKey, prompt);

  try {
    const data = JSON.parse(responseText) as string[];
    if (!Array.isArray(data)) throw new Error("Questions response invalid.");
    return data;
  } catch (e) {
    throw new Error(`Failed to parse questions response: ${responseText}`);
  }
}

