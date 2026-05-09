import { useEffect, useMemo, useState } from "react";
import { TemplateId, getTemplateById, templateOptions } from "../workflows/templates";
import { generateResearch, generateQuestions } from "../workflows/generator";
import { downloadTextFile } from "../workflows/export";
import { cls } from "./cls";

type Stage = "research" | "questions";

type FormFields = {
  typeId: TemplateId | "";
  name: string;
  title: string;
  org: string;
  countryInFocus: string;
  publication: string;
  mediaPartnerCountry: string;
};

type ResearchItem = { topicId: string; label: string; text: string };
type QuestionItem = { id: string; text: string; selected: boolean };

const STORAGE_KEY = "eit_proto_state_v1";

type PersistedState = {
  stage: Stage;
  fields: FormFields;
  researchByTopicId: Record<string, string>;
  questions: { text: string; selected: boolean }[];
};

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function App() {
  const [stage, setStage] = useState<Stage>("research");
  const [fields, setFields] = useState<FormFields>({
    typeId: "",
    name: "",
    title: "",
    org: "",
    countryInFocus: "",
    publication: "",
    mediaPartnerCountry: ""
  });

  const template = useMemo(() => {
    if (!fields.typeId) return null;
    return getTemplateById(fields.typeId);
  }, [fields.typeId]);

  const [researchByTopicId, setResearchByTopicId] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<QuestionItem[]>([]);

  const [busy, setBusy] = useState<null | "research" | "questions">(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const persisted = safeJsonParse<PersistedState>(localStorage.getItem(STORAGE_KEY));
    if (!persisted) return;
    setStage(persisted.stage ?? "research");
    setFields(persisted.fields ?? fields);
    setResearchByTopicId(persisted.researchByTopicId ?? {});
    setQuestions(
      (persisted.questions ?? []).map((q, idx) => ({
        id: `q_${idx + 1}`,
        text: q.text,
        selected: q.selected
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const persisted: PersistedState = {
      stage,
      fields,
      researchByTopicId,
      questions: questions.map((q) => ({ text: q.text, selected: q.selected }))
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [stage, fields, researchByTopicId, questions]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  const researchItems: ResearchItem[] = useMemo(() => {
    if (!template) return [];
    return template.topics.map((t) => ({
      topicId: t.id,
      label: t.label,
      text: researchByTopicId[t.id] ?? ""
    }));
  }, [template, researchByTopicId]);

  const canGenerateResearch =
    Boolean(template) &&
    fields.name.trim() &&
    fields.title.trim() &&
    fields.org.trim() &&
    fields.countryInFocus.trim() &&
    fields.publication.trim() &&
    fields.mediaPartnerCountry.trim() &&
    busy === null;

  const canGenerateQuestions = Boolean(template) && researchItems.some((r) => r.text.trim().length > 0) && busy === null;

  async function onGenerateResearch() {
    if (!template) return;
    setBusy("research");
    try {
      const out = await generateResearch({
        fields,
        template
      });
      setResearchByTopicId((prev) => {
        const next = { ...prev };
        for (const item of out) next[item.topicId] = item.text;
        return next;
      });
      setToast("Research generated. Review/edit freely.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to generate research.");
    } finally {
      setBusy(null);
    }
  }

  async function onGenerateQuestions() {
    if (!template) return;
    setBusy("questions");
    try {
      const out = await generateQuestions({
        fields,
        template,
        research: researchItems.map((r) => ({ topicId: r.topicId, label: r.label, text: r.text }))
      });
      setQuestions(
        out.map((q, idx) => ({
          id: `q_${idx + 1}`,
          text: q,
          selected: true
        }))
      );
      setStage("questions");
      setToast("Questions generated. Edit/select then export.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to generate questions.");
    } finally {
      setBusy(null);
    }
  }

  async function onCopySelected() {
    const text = buildExportText();
    await navigator.clipboard.writeText(text);
    setToast("Copied to clipboard.");
  }

  function buildExportText() {
    const kept = questions.filter((q) => q.selected).map((q) => q.text.trim()).filter(Boolean);
    const header = `${fields.publication} — Interview Questions\n${fields.name} (${fields.title}, ${fields.org})\nCountry in focus: ${fields.countryInFocus}\nMedia partner country: ${fields.mediaPartnerCountry}\n\n`;
    const body = kept.map((q, idx) => `${idx + 1}. ${q}`).join("\n\n");
    return header + (body || "(No questions selected)");
  }

  function onDownloadTxt() {
    downloadTextFile(buildExportText(), `Interview Questions - ${fields.name || "Interviewee"}.txt`);
    setToast("Downloaded .txt");
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    setStage("research");
    setFields({
      typeId: "",
      name: "",
      title: "",
      org: "",
      countryInFocus: "",
      publication: "",
      mediaPartnerCountry: ""
    });
    setResearchByTopicId({});
    setQuestions([]);
    setToast("Reset prototype state.");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <header className="border-b border-slate-700/50 bg-gradient-to-r from-slate-800 to-slate-700 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25 ring-1 ring-white/10" />
              <div className="min-w-0">
         
                <div className="truncate text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">Editorial Interview Tool</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50 hover:border-slate-500 transition-colors"
              onClick={resetAll}
              type="button"
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <section className="col-span-1">
          <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm shadow-2xl shadow-black/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-sm text-slate-400">Stage</div>
                <div className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{stage === "research" ? "1) Research" : "2) Questions"}</div>
              </div>
              {stage === "questions" ? (
                <button
                  className="rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-2 text-sm hover:bg-slate-700/50 hover:border-slate-500 transition-colors"
                  type="button"
                  onClick={() => setStage("research")}
                >
                  ← Edit Research
                </button>
              ) : (
                <div className="text-sm text-slate-400">Editor stays in control (always editable)</div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-6">
              <Field label="Type">
                <select
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors"
                  value={fields.typeId}
                  onChange={(e) => {
                    const next = e.target.value as TemplateId | "";
                    setFields((p) => ({ ...p, typeId: next }));
                    // keep any existing research; just re-map topic ids in UI
                  }}
                >
                  <option value="">Select…</option>
                  {templateOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Interviewee Name">
                <input className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors" value={fields.name} onChange={(e) => setFields((p) => ({ ...p, name: e.target.value }))} />
              </Field>
              <Field label="Interviewee Title">
                <input className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors" value={fields.title} onChange={(e) => setFields((p) => ({ ...p, title: e.target.value }))} />
              </Field>
              <Field label="Organization">
                <input className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors" value={fields.org} onChange={(e) => setFields((p) => ({ ...p, org: e.target.value }))} />
              </Field>
              <Field label="Country in Focus">
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors"
                  value={fields.countryInFocus}
                  onChange={(e) => setFields((p) => ({ ...p, countryInFocus: e.target.value }))}
                />
              </Field>
              <Field label="Publication">
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors"
                  value={fields.publication}
                  onChange={(e) => setFields((p) => ({ ...p, publication: e.target.value }))}
                />
              </Field>
              <Field label="Media Partner Country">
                <input
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors"
                  value={fields.mediaPartnerCountry}
                  onChange={(e) => setFields((p) => ({ ...p, mediaPartnerCountry: e.target.value }))}
                />
              </Field>
            </div>



            {stage === "research" ? (
              <>
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <button
                    className="rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    type="button"
                    onClick={onGenerateResearch}
                    disabled={!canGenerateResearch}
                  >
                    {busy === "research" ? "Generating…" : "Generate Research"}
                  </button>
                  <button
                    className="rounded-xl px-6 py-3 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    type="button"
                    onClick={onGenerateQuestions}
                    disabled={!canGenerateQuestions}
                  >
                    {busy === "questions" ? "Generating…" : "Generate Questions →"}
                  </button>
                  <div className="ml-auto text-xs text-slate-400">
                    {template ? `${template.topics.length} topics` : "Pick a type to load the research template."}
                  </div>
                </div>

                <div className="space-y-4">
                  {!template ? (
                    <EmptyCard title="Select a Type" body="Choosing a type loads the correct research topics and writing rules." />
                  ) : (
                    template.topics.map((t) => (
                      <div key={t.id} className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-slate-900/30 backdrop-blur-sm p-4 shadow-lg">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-200">{t.label}</div>
                            {t.helper ? <div className="mt-0.5 text-xs text-slate-400">{t.helper}</div> : null}
                          </div>
                          <div className="text-xs text-slate-500">Editable</div>
                        </div>
                        <textarea
                          className="min-h-[120px] w-full resize-y rounded-xl border border-slate-600 bg-slate-800/50 p-4 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors"
                          value={researchByTopicId[t.id] ?? ""}
                          onChange={(e) => setResearchByTopicId((p) => ({ ...p, [t.id]: e.target.value }))}
                          placeholder="AI will fill this, or paste/edit manually…"
                        />
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
                    type="button"
                    onClick={() => {
                      setStage("research");
                    }}
                  >
                    ← Edit Research
                  </button>
                  <button
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-medium hover:bg-slate-900"
                    type="button"
                    onClick={onCopySelected}
                    disabled={questions.length === 0}
                  >
                    Copy selected
                  </button>
                  <button
                    className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-medium hover:bg-slate-900"
                    type="button"
                    onClick={onDownloadTxt}
                    disabled={questions.length === 0}
                  >
                    Download .txt
                  </button>
                  <div className="ml-auto text-xs text-slate-400">{questions.filter((q) => q.selected).length} selected</div>
                </div>

                <div className="mt-4 space-y-3">
                  {questions.length === 0 ? (
                    <EmptyCard title="No questions yet" body="Go back, generate research (or paste it), then generate questions." />
                  ) : (
                    questions.map((q, idx) => (
                      <div key={q.id} className="rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-800/30 to-slate-900/30 backdrop-blur-sm p-4 shadow-lg">
                        <div className="flex items-start gap-3">
                          <label className="mt-1 inline-flex select-none items-center gap-2 text-sm text-slate-300">
                            <input
                              type="checkbox"
                              checked={q.selected}
                              onChange={(e) =>
                                setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, selected: e.target.checked } : x)))
                              }
                              className="h-4 w-4 accent-emerald-500"
                            />
                            <span className="text-slate-500">{idx + 1}</span>
                          </label>
                          <div className="min-w-0 flex-1">
                            <textarea
                              className="min-h-[100px] w-full resize-y rounded-xl border border-slate-600 bg-slate-800/50 p-4 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-colors"
                              value={q.text}
                              onChange={(e) =>
                                setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, text: e.target.value } : x)))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      {busy ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
          <div className="rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm shadow-2xl shadow-black/50 p-8 text-center max-w-md">
            <div className="mb-6 h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-indigo-400 mx-auto"></div>
            <div className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2">
              {busy === "research" ? "Generating Research..." : "Generating Questions..."}
            </div>
            <div className="text-sm text-slate-400">
              This may take 20-40 seconds. Our AI is working hard to create high-quality content for you.
            </div>
            <div className="mt-4 text-xs text-slate-500">
              This may take 20-40 seconds. Please don't close this window.
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-slate-800/90 to-slate-900/90 backdrop-blur-sm px-6 py-4 text-sm text-slate-200 shadow-2xl shadow-black/50">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-slate-300">{props.label}</div>
      {props.children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-xl border border-slate-600 bg-slate-800/50 px-3 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 transition-colors";
}

function EmptyCard(props: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600/50 bg-gradient-to-br from-slate-800/20 to-slate-900/20 backdrop-blur-sm p-8 text-center">
      <div className="text-lg font-semibold text-slate-300 mb-2">{props.title}</div>
      <div className="text-sm text-slate-400">{props.body}</div>
    </div>
  );
}

