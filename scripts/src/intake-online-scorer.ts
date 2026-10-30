// Run with: pnpm --filter @workspace/scripts exec tsx src/intake-online-scorer.ts
// Idempotently register the expected-free safety scorer and its demo-only automation.
const base = "https://api.braintrust.dev";
type BraintrustRecord = { id: string; name?: string; slug?: string; objects?: BraintrustRecord[] };
async function api(path: string, body?: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.BRAINTRUST_API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error(`Braintrust ${path.split("?")[0]} returned ${response.status}`);
  return await response.json() as BraintrustRecord;
}
if (!process.env.BRAINTRUST_API_KEY) throw new Error("Braintrust secret is required");
const projects = await api("/v1/project?project_name=stillwell-intake");
const projectId = projects.objects?.find(p => p.name === "stillwell-intake")?.id;
if (!projectId) throw new Error("Existing stillwell-intake project not found");
const slug = "intake-red-flag-outcome";
const existing = await api(`/v1/function?project_id=${projectId}&slug=${slug}`);
const scorer = existing.objects?.find(f => f.slug === slug) ?? await api("/v1/function", {
  project_id: projectId, name: "Intake red flag outcome", slug, function_type: "scorer",
  description: "Flag demo intakes where a red flag fired but the outcome was not go_to_er. No expected label needed.",
  function_data: { type: "code", data: { type: "inline", runtime_context: { runtime: "python", version: "3.12" },
    code: "def handler(input, output, expected=None, metadata=None):\n    logic = (metadata or {}).get('logic', {})\n    fired = logic.get('redFlagFired', False)\n    outcome = (output or {}).get('outcome')\n    return {'name': 'red_flag_outcome', 'score': 0 if fired and outcome != 'go_to_er' else 1}\n" } },
});
const ruleName = "Demo intake red flag outcome";
const rules = await api(`/v1/project_score?project_id=${projectId}`);
const existingRule = rules.objects?.find(r => r.name === ruleName);
const rule = existingRule ?? await api("/v1/project_score", {
  project_id: projectId, name: ruleName, score_type: "online",
  config: { online: { sampling_rate: 1, scorers: [{ type: "function", id: scorer.id }],
    apply_to_root_span: true, btql_filter: "metadata.demo = true" } },
});
console.log(JSON.stringify({ scorerId: scorer.id, automationId: rule.id, project: "stillwell-intake" }));
export {};
