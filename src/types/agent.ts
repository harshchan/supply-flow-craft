export type AgentStatus = "Draft" | "Deployed";

export type OutputFormat = "JSON" | "CSV" | "Formatted Table" | "Natural Language";

export type LLMProvider = "Azure OpenAI" | "OpenAI" | "Claude" | "Gemini" | "DeepSeek" | "";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  temperature: number; // 0-1
  top_p: number; // 0-1
  top_k: number; // integer
  streaming: boolean;
  maxTokens: number;
  costEstimate: number; // dollars per run
}

export interface DBToolConfig {
  selected: boolean;
  datasourceType: "SSMS" | "SQL" | "Azure SQL" | "SAP" | "Blue Yonder" | "MES" | "Oracle DB" | "";
  host: string;
  port: number | "";
  username: string;
  password: string;
  schema: string;
  allowedOperations: { read: boolean; write: boolean; update: boolean; delete: boolean };
  errorHandling: "Retry" | "Skip" | "Alert" | "Rollback" | "";
}

export interface ToolsConfig {
  calculator: boolean;
  getDate: boolean;
  currencyConverter: boolean;
  pythonRepl: boolean;
  webSearch: boolean;
  dbTool: DBToolConfig;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  task: string;
  decisionLogic: string;
  requiredTables: ("InventoryLevels" | "PurchaseOrders" | "SalesHistory")[];
  process: string;
  calculations: string;
  outputFormat: OutputFormat;
  triggerEvents: string[];
  dependencies: string[];
  confidenceThreshold: number; // 0-1
  fallbackPlan: string;
  executionFrequency: "One-time" | "Hourly" | "Daily" | "Real-time" | "";
  llmConfig: LLMConfig;
  tools: ToolsConfig;
  lastModified: string; // ISO
  status: AgentStatus;
}
