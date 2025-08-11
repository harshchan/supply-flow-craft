import { useMemo, useState } from "react";
import AgentCard from "@/components/AgentCard";
import { AgentTabs, type ActiveTab } from "@/components/AgentTabs";
import AgentTable from "@/components/AgentTable";
import type { AgentConfig, LLMConfig, DBToolConfig } from "@/types/agent";
import { Boxes, ClipboardList, Factory, DollarSign, Scale, UserCheck } from "lucide-react";
import { toast as notify } from "sonner";

const agentTemplates = [
  {
    id: "order-management-agent-01",
    name: "Order Management Agent",
    description: "Automates order entry, validation, and fulfillment.",
  },
  {
    id: "inventory-agent-01",
    name: "Inventory Agent",
    description: "Monitors stock levels, forecasts, triggers replenishment.",
  },
  {
    id: "capacity-agent-01",
    name: "Capacity Agent",
    description: "Production scheduling and resource optimization.",
  },
  {
    id: "pricing-agent-01",
    name: "Pricing Agent",
    description: "Dynamic pricing adjustments.",
  },
  {
    id: "tradeoff-governance-agent-01",
    name: "Tradeoff and Governance Agent",
    description: "Balances KPIs and enforces compliance rules.",
  },
  {
    id: "human-in-loop-agent-01",
    name: "Human in Loop Agent",
    description: "Human approvals for critical decisions.",
  },
] as const;

const icons = {
  "Order Management Agent": ClipboardList,
  "Inventory Agent": Boxes,
  "Capacity Agent": Factory,
  "Pricing Agent": DollarSign,
  "Tradeoff and Governance Agent": Scale,
  "Human in Loop Agent": UserCheck,
};

function buildDefaultLLM(): LLMConfig {
  return {
    provider: "Azure OpenAI",
    model: "gpt-4o-mini",
    systemPrompt: "You are an AI agent for supply chain inventory management...",
    temperature: 0.2,
    top_p: 0.95,
    top_k: 50,
    streaming: true,
    maxTokens: 1500,
    costEstimate: 0.04,
  };
}

function buildDefaultDB(): DBToolConfig {
  return {
    selected: true,
    datasourceType: "Azure SQL",
    host: "azure-sql-prod.database.windows.net",
    port: 1433,
    username: "inventory_admin",
    password: "******",
    schema: "dbo",
    allowedOperations: { read: true, write: true, update: true, delete: false },
    errorHandling: "Retry",
  };
}

function buildAgentFromTemplate(t: typeof agentTemplates[number]): AgentConfig {
  const base: AgentConfig = {
    id: t.id,
    name: t.name.replace(/\s+/g, "") + "01",
    role: "Monitor and maintain optimal stock levels across all warehouses.",
    task: "Check inventory daily, predict stockouts, and create replenishment orders.",
    decisionLogic: "If stock < safety stock threshold, trigger purchase order.",
    requiredTables: ["InventoryLevels", "PurchaseOrders", "SalesHistory"],
    process: "...",
    calculations: "...",
    outputFormat: "JSON",
    triggerEvents: ["Daily at 06:00", "Manual"],
    dependencies: ["Order Management Agent"],
    confidenceThreshold: 0.85,
    fallbackPlan: "...",
    executionFrequency: "Daily",
    llmConfig: buildDefaultLLM(),
    tools: {
      calculator: false,
      getDate: true,
      currencyConverter: false,
      pythonRepl: false,
      webSearch: false,
      dbTool: buildDefaultDB(),
    },
    lastModified: new Date().toISOString(),
    status: "Draft",
  };

  // Customize base texts per agent type minimally
  if (t.name === "Order Management Agent") {
    base.role = "Automate order entry, validation, and fulfillment.";
    base.task = "Ingest orders, validate SKUs, and dispatch to WMS.";
  }
  if (t.name === "Pricing Agent") {
    base.role = "Dynamic pricing management across channels.";
    base.task = "Analyze demand elasticity and adjust prices.";
  }
  if (t.name === "Capacity Agent") {
    base.role = "Production scheduling and resource optimization.";
    base.task = "Align capacity to forecast while minimizing changeovers.";
  }
  if (t.name === "Tradeoff and Governance Agent") {
    base.role = "Balance KPIs and enforce compliance rules.";
    base.task = "Apply policy rules to resolve KPI tradeoffs.";
  }
  if (t.name === "Human in Loop Agent") {
    base.role = "Require human approvals for critical decisions.";
    base.task = "Pause on risky actions and request manager approval.";
  }

  return base;
}

export default function Index() {
  const [selectedId, setSelectedId] = useState<string>("inventory-agent-01");
  const [activeTab, setActiveTab] = useState<ActiveTab>("Agent");

  const [form, setForm] = useState<AgentConfig>(() => buildAgentFromTemplate(agentTemplates[1]));
  const [agentList, setAgentList] = useState<AgentConfig[]>([]);

  const allAgentNames = useMemo(() => agentTemplates.map((t) => t.name), []);

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    const t = agentTemplates.find((x) => x.id === id)!;
    setForm(buildAgentFromTemplate(t));
    setActiveTab("Agent");
  };

  const upsertAgent = (status: "Draft" | "Deployed") => {
    const payload: AgentConfig = { ...form, status, lastModified: new Date().toISOString() };
    setForm(payload);
    setAgentList((prev) => {
      const exists = prev.some((a) => a.id === payload.id);
      const next = exists ? prev.map((a) => (a.id === payload.id ? payload : a)) : [...prev, payload];
      return next;
    });

    if (form.id.includes("inventory-agent")) {
      notify("✅ Agent 'Inventory Agent' configured and added to the list.");
    } else {
      notify(`Agent '${form.name}' ${status === "Deployed" ? "deployed" : "saved as draft"}.`);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-6 space-y-6">
        <header className="space-y-1">
          <h1 className="text-3xl font-bold">Supply Chain Agent Configuration</h1>
          <p className="text-muted-foreground">Create, configure, preview, and deploy supply chain agents.</p>
        </header>

        <section aria-label="Agents" className="space-y-3">
          <h2 className="text-lg font-semibold">Select an Agent</h2>
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max">
              {agentTemplates.map((a) => {
                const Icon = icons[a.name as keyof typeof icons];
                return (
                  <AgentCard
                    key={a.id}
                    name={a.name}
                    description={a.description}
                    selected={selectedId === a.id}
                    onClick={() => selectTemplate(a.id)}
                    Icon={Icon}
                  />
                );
              })}
            </div>
          </div>
        </section>

        <section aria-label="Configuration">
          <AgentTabs
            form={form}
            setForm={setForm}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            allAgentNames={allAgentNames}
            onSaveDraft={() => upsertAgent("Draft")}
            onDeploy={() => upsertAgent("Deployed")}
          />
        </section>

        <section aria-label="Agent List">
          <AgentTable agents={agentList} onSelect={(id) => {
            const found = agentList.find((a) => a.id === id);
            if (found) {
              setForm(found);
              setSelectedId(found.id);
              setActiveTab("Agent");
            }
          }} />
        </section>
      </div>
    </main>
  );
}
