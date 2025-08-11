import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast as notify } from "sonner";
import type { AgentConfig, LLMConfig, DBToolConfig, LLMProvider, OutputFormat } from "@/types/agent";
import { Database, Cog, Cpu, FileCog, Sparkles, Network } from "lucide-react";

export type ActiveTab = "Agent" | "LLM" | "Tools" | "Review";

interface AgentTabsProps {
  form: AgentConfig;
  setForm: (f: AgentConfig) => void;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  allAgentNames: string[];
  onSaveDraft: () => void;
  onDeploy: () => void;
}

export function AgentTabs({ form, setForm, activeTab, setActiveTab, allAgentNames, onSaveDraft, onDeploy }: AgentTabsProps) {
  const [agentErrors, setAgentErrors] = useState<Record<string, string>>({});
  const [llmErrors, setLlmErrors] = useState<Record<string, string>>({});
  const [dbErrors, setDbErrors] = useState<Record<string, string>>({});
  const [opsConfirmOpen, setOpsConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"draft" | "deploy" | null>(null);
  const riskyOps = form.tools.dbTool.allowedOperations.write || form.tools.dbTool.allowedOperations.update || form.tools.dbTool.allowedOperations.delete;

  const validateAgent = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Agent Name is required";
    if (!form.role.trim()) e.role = "Role is required";
    if (!form.task.trim()) e.task = "Task is required";
    if (!form.decisionLogic.trim()) e.decisionLogic = "Decision Logic is required";
    if (isNaN(form.confidenceThreshold) || form.confidenceThreshold < 0 || form.confidenceThreshold > 1) e.confidenceThreshold = "Confidence must be 0.0 - 1.0";
    setAgentErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateLLM = () => {
    const e: Record<string, string> = {};
    if (form.llmConfig.provider && !form.llmConfig.model) e.model = "Model is required for selected provider";
    if (form.llmConfig.temperature < 0 || form.llmConfig.temperature > 1) e.temperature = "Temperature must be 0-1";
    if (form.llmConfig.top_p < 0 || form.llmConfig.top_p > 1) e.top_p = "Top-p must be 0-1";
    if (form.llmConfig.top_k < 0) e.top_k = "Top-k must be >= 0";
    setLlmErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateDB = () => {
    const e: Record<string, string> = {};
    const db = form.tools.dbTool;
    if (db.selected) {
      if (!db.host.trim()) e.host = "Host is required";
      if (db.port === "" || Number(db.port) <= 0) e.port = "Valid port is required";
    }
    setDbErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveDraft = () => {
    if (!validateAgent() || !validateLLM() || !validateDB()) return;
    if (form.tools.dbTool.selected && riskyOps) {
      setPendingAction("draft");
      setOpsConfirmOpen(true);
      return;
    }
    onSaveDraft();
  };

  const handleDeploy = () => {
    if (!validateAgent() || !validateLLM() || !validateDB()) return;
    if (form.tools.dbTool.selected && riskyOps) {
      setPendingAction("deploy");
      setOpsConfirmOpen(true);
      return;
    }
    onDeploy();
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="Agent">Agent</TabsTrigger>
        <TabsTrigger value="LLM">LLM</TabsTrigger>
        <TabsTrigger value="Tools">Tools</TabsTrigger>
        <TabsTrigger value="Review">Review</TabsTrigger>
      </TabsList>

      <TabsContent value="Agent">
        <AgentTab form={form} setForm={setForm} errors={agentErrors} allAgentNames={allAgentNames} />
      </TabsContent>

      <TabsContent value="LLM">
        <LLMTab form={form} setForm={setForm} errors={llmErrors} />
      </TabsContent>

      <TabsContent value="Tools">
        <ToolsTab form={form} setForm={setForm} errors={dbErrors} />
      </TabsContent>

      <TabsContent value="Review">
        <ReviewTab form={form} onEditTab={setActiveTab} onSaveDraft={handleSaveDraft} onDeploy={handleDeploy} />
      </TabsContent>

      <AlertDialog open={opsConfirmOpen} onOpenChange={setOpsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Elevated DB Operations</AlertDialogTitle>
            <AlertDialogDescription>
              You have enabled Write/Update/Delete operations. Proceeding may modify production data. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setOpsConfirmOpen(false);
              if (pendingAction === "draft") onSaveDraft();
              else if (pendingAction === "deploy") onDeploy();
              setPendingAction(null);
            }}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-sm text-destructive">{msg}</p>;
}

function AgentTab({ form, setForm, errors, allAgentNames }: { form: AgentConfig; setForm: (f: AgentConfig) => void; errors: Record<string, string>; allAgentNames: string[]; }) {
  const tables = ["InventoryLevels", "PurchaseOrders", "SalesHistory"] as const;
  const outputFormats: OutputFormat[] = ["JSON", "CSV", "Formatted Table", "Natural Language"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Agent Name/Identifier</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FieldError msg={errors.name} />
          </div>
          <div>
            <Label htmlFor="frequency">Execution Frequency</Label>
            <Select value={form.executionFrequency} onValueChange={(v) => setForm({ ...form, executionFrequency: v as any })}>
              <SelectTrigger id="frequency"><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="One-time">One-time</SelectItem>
                <SelectItem value="Hourly">Hourly</SelectItem>
                <SelectItem value="Daily">Daily</SelectItem>
                <SelectItem value="Real-time">Real-time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <Label>Confidence Threshold</Label>
            <div className="flex items-center gap-3">
              <Slider value={[form.confidenceThreshold]} min={0} max={1} step={0.01} onValueChange={(v) => setForm({ ...form, confidenceThreshold: v[0] })} className="flex-1" />
              <span className="text-sm text-muted-foreground w-10 text-right">{form.confidenceThreshold.toFixed(2)}</span>
            </div>
            <FieldError msg={errors.confidenceThreshold} />
          </div>

          <div className="md:col-span-2">
            <Label>Required Tables</Label>
            <div className="flex flex-wrap gap-4 pt-2">
              {tables.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.requiredTables.includes(t)} onCheckedChange={(c) => {
                    const next = c
                      ? [...form.requiredTables, t]
                      : form.requiredTables.filter((x) => x !== t);
                    setForm({ ...form, requiredTables: next });
                  }} />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Textarea id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} rows={3} />
          <FieldError msg={errors.role} />
        </div>
        <div>
          <Label htmlFor="task">Task</Label>
          <Textarea id="task" value={form.task} onChange={(e) => setForm({ ...form, task: e.target.value })} rows={3} />
          <FieldError msg={errors.task} />
        </div>
        <div>
          <Label htmlFor="logic">Decision Logic</Label>
          <Textarea id="logic" value={form.decisionLogic} onChange={(e) => setForm({ ...form, decisionLogic: e.target.value })} rows={3} />
          <FieldError msg={errors.decisionLogic} />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="process">Process</Label>
            <Textarea id="process" value={form.process} onChange={(e) => setForm({ ...form, process: e.target.value })} rows={3} />
          </div>
          <div>
            <Label htmlFor="calculations">Calculations</Label>
            <Textarea id="calculations" value={form.calculations} onChange={(e) => setForm({ ...form, calculations: e.target.value })} rows={3} />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Output Format</Label>
            <Select value={form.outputFormat} onValueChange={(v) => setForm({ ...form, outputFormat: v as OutputFormat })}>
              <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="JSON">JSON</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
                <SelectItem value="Formatted Table">Formatted Table</SelectItem>
                <SelectItem value="Natural Language">Natural Language</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dependencies</Label>
            <div className="flex flex-wrap gap-3 pt-2">
              {allAgentNames.filter((n) => n !== form.name).map((n) => (
                <label key={n} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.dependencies.includes(n)} onCheckedChange={(c) => {
                    const next = c ? [...form.dependencies, n] : form.dependencies.filter((x) => x !== n);
                    setForm({ ...form, dependencies: next });
                  }} />
                  {n}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Label>Trigger Events</Label>
          <div className="flex flex-wrap gap-4 pt-2">
            {(["On Demand", "Schedule (time picker)", "Event Triggered"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.triggerEvents.includes(t)} onCheckedChange={(c) => {
                  const next = c ? [...form.triggerEvents, t] : form.triggerEvents.filter((x) => x !== t);
                  setForm({ ...form, triggerEvents: next });
                }} />
                {t}
              </label>
            ))}
            {form.triggerEvents.includes("Schedule (time picker)") && (
              <input type="time" className="border rounded-md px-2 py-1 text-sm" aria-label="Schedule time" onChange={(e) => {
                const time = e.target.value;
                const list = form.triggerEvents.filter((x) => !x.includes("Daily"));
                if (time) list.push(`Daily at ${time}`);
                setForm({ ...form, triggerEvents: list });
              }} />
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="fallback">Fallback Plan</Label>
          <Textarea id="fallback" value={form.fallbackPlan} onChange={(e) => setForm({ ...form, fallbackPlan: e.target.value })} rows={3} />
        </div>
      </CardContent>
    </Card>
  );
}

function LLMTab({ form, setForm, errors }: { form: AgentConfig; setForm: (f: AgentConfig) => void; errors: Record<string, string>; }) {
  const providers: { key: LLMProvider; label: LLMProvider; Icon: any; models: string[] }[] = [
    { key: "Azure OpenAI", label: "Azure OpenAI", Icon: Cpu, models: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4o"] },
    { key: "OpenAI", label: "OpenAI", Icon: Sparkles, models: ["gpt-4o-mini", "o4-mini", "gpt-4.1"] },
    { key: "Claude", label: "Claude", Icon: Cog, models: ["claude-3.5-sonnet", "claude-3-haiku"] },
    { key: "Gemini", label: "Gemini", Icon: Network, models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
    { key: "DeepSeek", label: "DeepSeek", Icon: FileCog, models: ["deepseek-chat", "deepseek-coder"] },
  ];

  const selectProvider = (p: LLMProvider) => {
    const models = providers.find((x) => x.key === p)?.models ?? [];
    setForm({ ...form, llmConfig: { ...form.llmConfig, provider: p, model: models[0] ?? "" } });
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-5 gap-3">
        {providers.map(({ key, label, Icon }) => {
          const selected = form.llmConfig.provider === key;
          return (
            <button key={key} type="button" onClick={() => selectProvider(key)} className={`border rounded-md p-3 text-left hover:bg-accent/40 transition ${selected ? "border-primary ring-1 ring-primary" : "border-border"}`}>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-md bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                <span className="font-medium">{label}</span>
              </div>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle>Model & Parameters</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Model Name</Label>
              <Select value={form.llmConfig.model} onValueChange={(v) => setForm({ ...form, llmConfig: { ...form.llmConfig, model: v } })}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {(["gpt-4o-mini", "gpt-4.1-mini", "o4-mini", "claude-3.5-sonnet", "gemini-1.5-pro", "deepseek-chat"]) .map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.model} />
            </div>
            <div>
              <Label>Temperature</Label>
              <div className="flex items-center gap-3">
                <Slider value={[form.llmConfig.temperature]} min={0} max={1} step={0.1} onValueChange={(v) => setForm({ ...form, llmConfig: { ...form.llmConfig, temperature: v[0] } })} className="flex-1" />
                <span className="text-sm text-muted-foreground w-10 text-right">{form.llmConfig.temperature.toFixed(1)}</span>
              </div>
              <FieldError msg={errors.temperature} />
            </div>
            <div>
              <Label>Top-p</Label>
              <div className="flex items-center gap-3">
                <Slider value={[form.llmConfig.top_p]} min={0} max={1} step={0.05} onValueChange={(v) => setForm({ ...form, llmConfig: { ...form.llmConfig, top_p: v[0] } })} className="flex-1" />
                <span className="text-sm text-muted-foreground w-10 text-right">{form.llmConfig.top_p.toFixed(2)}</span>
              </div>
              <FieldError msg={errors.top_p} />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="topk">Top-k</Label>
              <Input id="topk" type="number" value={form.llmConfig.top_k} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, top_k: Number(e.target.value) } })} />
              <FieldError msg={errors.top_k} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="streaming">Streaming Output</Label>
                <div className="pt-2"><Switch id="streaming" checked={form.llmConfig.streaming} onCheckedChange={(c) => setForm({ ...form, llmConfig: { ...form.llmConfig, streaming: Boolean(c) } })} /></div>
              </div>
            </div>
            <div>
              <Label htmlFor="maxTokens">Max Tokens Allowed</Label>
              <Input id="maxTokens" type="number" value={form.llmConfig.maxTokens} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, maxTokens: Number(e.target.value) } })} />
            </div>
          </div>

          <Accordion type="single" collapsible>
            <AccordionItem value="system-prompt">
              <AccordionTrigger>Advanced: System Prompt</AccordionTrigger>
              <AccordionContent>
                <Textarea rows={4} value={form.llmConfig.systemPrompt} onChange={(e) => setForm({ ...form, llmConfig: { ...form.llmConfig, systemPrompt: e.target.value } })} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <Separator />
          <div className="text-sm text-muted-foreground">
            Cost Estimator: ~${form.llmConfig.costEstimate.toFixed(2)}/run based on selected model and frequency
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToolsTab({ form, setForm, errors }: { form: AgentConfig; setForm: (f: AgentConfig) => void; errors: Record<string, string>; }) {
  const tools = [
    { key: "calculator", label: "Calculator" },
    { key: "getDate", label: "Get Date" },
    { key: "currencyConverter", label: "Currency Converter" },
    { key: "pythonRepl", label: "Python REPL" },
    { key: "webSearch", label: "Web Search" },
    { key: "dbTool", label: "DB Tool" },
  ] as const;

  const db = form.tools.dbTool;
  const setDb = (next: Partial<DBToolConfig>) => setForm({ ...form, tools: { ...form.tools, dbTool: { ...db, ...next } } });

  const testConnection = () => {
    const success = Math.random() > 0.4;
    if (success) {
      notify("DB connection successful");
    } else {
      notify("DB connection failed");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Tool Selector</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {tools.map((t) => (
            <label key={t.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={(form.tools as any)[t.key] || (t.key === "dbTool" && db.selected)} onCheckedChange={(c) => {
                if (t.key === "dbTool") setDb({ selected: Boolean(c) });
                else setForm({ ...form, tools: { ...form.tools, [t.key]: Boolean(c) } as any });
              }} />
              {t.label}
            </label>
          ))}
        </CardContent>
      </Card>

      {db.selected && (
        <Card>
          <CardHeader><CardTitle>Database Tool</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Datasource Type</Label>
                <Select value={db.datasourceType} onValueChange={(v) => setDb({ datasourceType: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {["SSMS", "SQL", "Azure SQL", "SAP", "Blue Yonder", "MES", "Oracle DB"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="host">Host</Label>
                <Input id="host" value={db.host} onChange={(e) => setDb({ host: e.target.value })} />
                <FieldError msg={errors.host} />
              </div>
              <div>
                <Label htmlFor="port">Port</Label>
                <Input id="port" type="number" value={db.port} onChange={(e) => setDb({ port: Number(e.target.value) })} />
                <FieldError msg={errors.port} />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={db.username} onChange={(e) => setDb({ username: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={db.password} onChange={(e) => setDb({ password: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="schema">Schema</Label>
                <Input id="schema" value={db.schema} onChange={(e) => setDb({ schema: e.target.value })} />
              </div>
              <div>
                <Label>Error Handling Policy</Label>
                <Select value={db.errorHandling} onValueChange={(v) => setDb({ errorHandling: v as any })}>
                  <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                  <SelectContent>
                    {(["Retry", "Skip", "Alert", "Rollback"] as const).map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Allowed Operations</Label>
              <div className="flex flex-wrap gap-4 pt-2">
                {(["read", "write", "update", "delete"] as const).map((op) => (
                  <label key={op} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={db.allowedOperations[op]} onCheckedChange={(c) => setDb({ allowedOperations: { ...db.allowedOperations, [op]: Boolean(c) } })} />
                    {op.charAt(0).toUpperCase() + op.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={testConnection}>Test Connection</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReviewTab({ form, onEditTab, onSaveDraft, onDeploy }: { form: AgentConfig; onEditTab: (t: ActiveTab) => void; onSaveDraft: () => void; onDeploy: () => void; }) {
  const summaryItems = [
    { label: "Role", value: form.role },
    { label: "Task", value: form.task },
    { label: "Decision Logic", value: form.decisionLogic },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            {form.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Key Agent Settings</h4>
              <div className="space-y-2">
                {summaryItems.map((s) => (
                  <div key={s.label}>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className="text-sm line-clamp-3">{s.value}</div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="mt-3" onClick={() => onEditTab("Agent")}>Edit Agent</Button>
            </div>
            <div>
              <h4 className="font-medium mb-2">LLM Summary</h4>
              <div className="text-sm text-muted-foreground">
                Provider: <span className="text-foreground font-medium">{form.llmConfig.provider || "-"}</span>, Model: <span className="text-foreground font-medium">{form.llmConfig.model || "-"}</span>, Temp: {form.llmConfig.temperature}, Streaming: {form.llmConfig.streaming ? "Yes" : "No"}
              </div>
              <Button variant="outline" className="mt-3" onClick={() => onEditTab("LLM")}>Edit LLM</Button>
            </div>
          </div>

          <Separator />

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Tools Summary</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {form.tools.calculator && <li>Calculator</li>}
                {form.tools.getDate && <li>Get Date</li>}
                {form.tools.currencyConverter && <li>Currency Converter</li>}
                {form.tools.pythonRepl && <li>Python REPL</li>}
                {form.tools.webSearch && <li>Web Search</li>}
                {form.tools.dbTool.selected && <li>DB Tool: {form.tools.dbTool.datasourceType} ({form.tools.dbTool.host}:{String(form.tools.dbTool.port)})</li>}
              </ul>
              <Button variant="outline" className="mt-3" onClick={() => onEditTab("Tools")}>Edit Tools</Button>
            </div>
            <div>
              <Accordion type="single" collapsible>
                <AccordionItem value="json">
                  <AccordionTrigger>View JSON</AccordionTrigger>
                  <AccordionContent>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-64">
{JSON.stringify(form, null, 2)}
                    </pre>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="secondary" onClick={onSaveDraft}>Save as Draft</Button>
            <Button onClick={onDeploy}>Deploy Now</Button>
            <Button variant="outline" onClick={onDeploy}>Done</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
