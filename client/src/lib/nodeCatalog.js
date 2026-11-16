// Node type catalog matching backend integration capabilities
export const NODE_CATALOG = [
  // ─── Triggers ────────────────────────────────────────────────────────────
  {
    id: 'trigger_manual',
    nodeType: 'trigger',
    category: 'trigger',
    label: 'Manual Trigger',
    description: 'Start workflow manually on-demand',
    icon: '▶',
    color: '#8b5cf6',
    defaultConfig: { triggerType: 'manual' },
  },
  {
    id: 'trigger_webhook',
    nodeType: 'trigger',
    category: 'trigger',
    label: 'Webhook Trigger',
    description: 'Fire workflow on incoming HTTP webhook',
    icon: '🔔',
    color: '#8b5cf6',
    defaultConfig: { triggerType: 'webhook', endpoint: '/webhook/my-flow' },
  },
  {
    id: 'trigger_schedule',
    nodeType: 'trigger',
    category: 'trigger',
    label: 'Schedule Trigger',
    description: 'Run workflow on a time-based schedule',
    icon: '⏰',
    color: '#8b5cf6',
    defaultConfig: { triggerType: 'schedule', interval: '60m' },
  },

  // ─── Actions ─────────────────────────────────────────────────────────────
  {
    id: 'gmail_send',
    nodeType: 'gmail_send',
    category: 'action',
    label: 'Gmail: Send Email',
    description: 'Send a personalized email via Gmail OAuth',
    icon: '✉',
    color: '#10b981',
    defaultConfig: { to: '', subject: 'Automated Update', body: '' },
  },
  {
    id: 'gmail_read',
    nodeType: 'gmail_read',
    category: 'action',
    label: 'Gmail: Read Inbox',
    description: 'Fetch emails matching a query from Gmail',
    icon: '📬',
    color: '#10b981',
    defaultConfig: { query: 'is:unread', maxResults: 5 },
  },
  {
    id: 'slack_post',
    nodeType: 'slack_post',
    category: 'action',
    label: 'Slack: Post Message',
    description: 'Post a message or alert to a Slack channel',
    icon: '💬',
    color: '#f59e0b',
    defaultConfig: { channel: '#ops-general', message: 'Workflow event triggered.' },
  },
  {
    id: 'discord_post',
    nodeType: 'discord_post',
    category: 'action',
    label: 'Discord: Bot Post',
    description: 'Broadcast a bot message to a Discord channel',
    icon: '🎮',
    color: '#7c3aed',
    defaultConfig: { channelId: 'ops-channel', content: 'Workflow notification from Agentflow.' },
  },
  {
    id: 'sheets_append',
    nodeType: 'sheets_append',
    category: 'action',
    label: 'Sheets: Append Row',
    description: 'Append a row of data to a Google Sheet',
    icon: '📊',
    color: '#06b6d4',
    defaultConfig: { spreadsheetId: '', range: 'Sheet1!A:Z', values: [] },
  },
  {
    id: 'sheets_read',
    nodeType: 'sheets_read',
    category: 'action',
    label: 'Sheets: Read Range',
    description: 'Read data from a specific range in Google Sheets',
    icon: '📋',
    color: '#06b6d4',
    defaultConfig: { spreadsheetId: '', range: 'Sheet1!A1:D10' },
  },

  // ─── AI Nodes ─────────────────────────────────────────────────────────────
  {
    id: 'ai_summarize',
    nodeType: 'ai_summarize',
    category: 'ai',
    label: 'AI: Summarize',
    description: 'Summarize and compress text using LLM',
    icon: '🧠',
    color: '#6366f1',
    defaultConfig: { model: 'gemini-1.5-pro', prompt: 'Summarize the following content:' },
  },
  {
    id: 'ai_classify',
    nodeType: 'ai_classify',
    category: 'ai',
    label: 'AI: Classify',
    description: 'Classify or extract structured data with AI',
    icon: '🤖',
    color: '#6366f1',
    defaultConfig: { model: 'gemini-1.5-pro', prompt: 'Classify the following:', targetFields: [] },
  },

  // ─── Logic Nodes ──────────────────────────────────────────────────────────
  {
    id: 'condition',
    nodeType: 'condition',
    category: 'logic',
    label: 'Condition',
    description: 'Branch execution based on a field value',
    icon: '⚡',
    color: '#ef4444',
    defaultConfig: { field: 'status', value: 'SUCCESS' },
  },
];

export const CATEGORY_META = {
  trigger: { label: 'Triggers', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.15)' },
  action: { label: 'Actions', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' },
  ai: { label: 'AI Nodes', color: '#6366f1', bgColor: 'rgba(99,102,241,0.15)' },
  logic: { label: 'Logic', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
};

export const AGENT_BADGE_META = {
  planner: { label: 'Planner', color: '#818cf8', bg: 'rgba(129,140,248,0.15)' },
  execution: { label: 'Execution', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  validation: { label: 'Validation', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  recovery: { label: 'Recovery', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
  monitoring: { label: 'Monitoring', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
};

export const getNodeByType = (nodeType) =>
  NODE_CATALOG.find((n) => n.nodeType === nodeType) || null;

export const getNodesByCategory = (category) =>
  NODE_CATALOG.filter((n) => n.category === category);

export default NODE_CATALOG;
