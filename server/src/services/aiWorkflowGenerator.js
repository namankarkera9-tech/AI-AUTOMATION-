const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

class AiWorkflowGenerator {
  async generateWorkflow(prompt) {
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt is required for workflow generation');
    }

    const cleanPrompt = prompt.trim();

    // 1. Try OpenRouter if API key exists
    if (config.ai.openrouterApiKey) {
      try {
        const result = await this._generateWithOpenRouter(cleanPrompt);
        if (result) return result;
      } catch (err) {
        console.warn(`[AiGenerator] OpenRouter failed (${err.message}), falling back to Gemini...`);
      }
    }

    // 2. Try Google Gemini if API key exists
    if (config.ai.geminiApiKey) {
      try {
        const result = await this._generateWithGemini(cleanPrompt);
        if (result) return result;
      } catch (err) {
        console.warn(`[AiGenerator] Gemini failed (${err.message}), falling back to deterministic builder...`);
      }
    }

    // 3. Deterministic rule-based fallback builder
    return this._generateDeterministic(cleanPrompt);
  }

  async _generateWithOpenRouter(prompt) {
    const systemPrompt = this._getSystemPrompt();
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-sonnet',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${config.ai.openrouterApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    return this._cleanAndParseJSON(content);
  }

  async _generateWithGemini(prompt) {
    const genAI = new GoogleGenerativeAI(config.ai.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const fullPrompt = `${this._getSystemPrompt()}\n\nUser request:\n${prompt}\n\nReturn strictly valid JSON only.`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();
    return this._cleanAndParseJSON(text);
  }

  _cleanAndParseJSON(raw) {
    if (!raw) return null;
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    return this._validateAndNormalizeGraph(parsed);
  }

  _getSystemPrompt() {
    return `You are an expert AI Operations Architect. You transform natural language automation requests into executable visual workflow graphs for Agentflow_AI.
Output STRICTLY valid JSON with structure:
{
  "name": "Title of Workflow",
  "description": "Short explanation of the automation",
  "tags": ["tag1", "tag2"],
  "trigger": { "type": "manual|webhook|schedule|event", "config": {} },
  "nodes": [
    {
      "id": "node_1",
      "type": "custom",
      "position": { "x": 100, "y": 150 },
      "data": {
        "label": "Human friendly label",
        "nodeType": "trigger|gmail_send|gmail_read|slack_post|discord_post|sheets_append|sheets_read|ai_summarize|ai_classify|condition",
        "category": "trigger|action|ai|logic",
        "config": {}
      }
    }
  ],
  "edges": [
    { "id": "e_node_1_node_2", "source": "node_1", "target": "node_2", "animated": true }
  ]
}`;
  }

  _generateDeterministic(prompt) {
    const lower = prompt.toLowerCase();

    // Template 1: Invoice routing & processing
    if (lower.includes('invoice') || lower.includes('billing') || lower.includes('receipt')) {
      return {
        name: 'Automated Invoice Processing & Approval Flow',
        description: 'Reads inbound invoices from Gmail, uses AI to extract key line items, logs to Google Sheets, and notifies the finance Slack channel.',
        tags: ['finance', 'invoices', 'gmail', 'slack', 'sheets'],
        trigger: { type: 'schedule', config: { interval: 'hourly' } },
        nodes: [
          {
            id: 'node_trigger',
            type: 'custom',
            position: { x: 250, y: 50 },
            data: {
              label: 'Hourly Inbound Scanner',
              nodeType: 'trigger',
              category: 'trigger',
              config: { triggerType: 'schedule', interval: '60m' },
            },
          },
          {
            id: 'node_gmail_read',
            type: 'custom',
            position: { x: 250, y: 170 },
            data: {
              label: 'Fetch Invoice Emails',
              nodeType: 'gmail_read',
              category: 'action',
              config: { query: 'subject:invoice has:attachment', maxResults: 10 },
            },
          },
          {
            id: 'node_ai_extract',
            type: 'custom',
            position: { x: 250, y: 290 },
            data: {
              label: 'AI Invoice Data Extractor',
              nodeType: 'ai_classify',
              category: 'ai',
              config: { model: 'gemini-1.5-pro', targetFields: ['vendor', 'amount', 'dueDate', 'taxId'] },
            },
          },
          {
            id: 'node_sheets_log',
            type: 'custom',
            position: { x: 100, y: 430 },
            data: {
              label: 'Append to Finance Sheet',
              nodeType: 'sheets_append',
              category: 'action',
              config: { spreadsheetId: 'finance_ledger_2026', range: 'Invoices!A:E' },
            },
          },
          {
            id: 'node_slack_alert',
            type: 'custom',
            position: { x: 420, y: 430 },
            data: {
              label: 'Notify Finance Slack',
              nodeType: 'slack_post',
              category: 'action',
              config: { channel: '#finance-approvals', message: 'New invoice processed and logged to ledger.' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'node_trigger', target: 'node_gmail_read', animated: true },
          { id: 'e2', source: 'node_gmail_read', target: 'node_ai_extract', animated: true },
          { id: 'e3', source: 'node_ai_extract', target: 'node_sheets_log', animated: true },
          { id: 'e4', source: 'node_ai_extract', target: 'node_slack_alert', animated: true },
        ],
      };
    }

    // Template 2: Customer onboarding & email response
    if (lower.includes('email') || lower.includes('customer') || lower.includes('welcome') || lower.includes('support')) {
      return {
        name: 'AI Customer Onboarding & Welcome Stream',
        description: 'Triggers on new user signup, drafts a tailored onboarding message with AI, sends via Gmail, and records in Google Sheets.',
        tags: ['customer-success', 'onboarding', 'gmail', 'ai'],
        trigger: { type: 'webhook', config: { path: '/webhook/new-customer' } },
        nodes: [
          {
            id: 'node_webhook',
            type: 'custom',
            position: { x: 250, y: 50 },
            data: {
              label: 'Customer Signup Webhook',
              nodeType: 'trigger',
              category: 'trigger',
              config: { triggerType: 'webhook', endpoint: '/webhook/customer-signup' },
            },
          },
          {
            id: 'node_ai_personalize',
            type: 'custom',
            position: { x: 250, y: 170 },
            data: {
              label: 'AI Personalized Briefing Generator',
              nodeType: 'ai_summarize',
              category: 'ai',
              config: { prompt: 'Generate warm tailored welcome message with starter links' },
            },
          },
          {
            id: 'node_gmail_send',
            type: 'custom',
            position: { x: 250, y: 290 },
            data: {
              label: 'Send Welcome Email via Gmail',
              nodeType: 'gmail_send',
              category: 'action',
              config: { subject: 'Welcome to Agentflow AI!', to: 'user@example.com' },
            },
          },
          {
            id: 'node_slack_notify',
            type: 'custom',
            position: { x: 250, y: 410 },
            data: {
              label: 'Alert Growth Team in Slack',
              nodeType: 'slack_post',
              category: 'action',
              config: { channel: '#growth-wins', message: 'Welcomed a new customer via AI personalized onboarding!' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'node_webhook', target: 'node_ai_personalize', animated: true },
          { id: 'e2', source: 'node_ai_personalize', target: 'node_gmail_send', animated: true },
          { id: 'e3', source: 'node_gmail_send', target: 'node_slack_notify', animated: true },
        ],
      };
    }

    // Template 3: Incident response / Discord & Slack monitoring
    if (lower.includes('incident') || lower.includes('alert') || lower.includes('discord') || lower.includes('slack')) {
      return {
        name: 'Multi-Channel Incident Broadcast & Triage Flow',
        description: 'Captures urgent system monitoring events, uses AI to classify severity, broadcasts to Discord ops and Slack devops.',
        tags: ['devops', 'incident', 'discord', 'slack', 'ai'],
        trigger: { type: 'webhook', config: { path: '/webhook/alerts' } },
        nodes: [
          {
            id: 'node_trigger',
            type: 'custom',
            position: { x: 250, y: 50 },
            data: {
              label: 'Incident Webhook Ingest',
              nodeType: 'trigger',
              category: 'trigger',
              config: { triggerType: 'webhook' },
            },
          },
          {
            id: 'node_ai_triage',
            type: 'custom',
            position: { x: 250, y: 170 },
            data: {
              label: 'AI Severity Classifier',
              nodeType: 'ai_classify',
              category: 'ai',
              config: { prompt: 'Classify incident into P1, P2, P3 and outline mitigation steps' },
            },
          },
          {
            id: 'node_discord_post',
            type: 'custom',
            position: { x: 120, y: 310 },
            data: {
              label: 'Broadcast to Discord Ops Bot',
              nodeType: 'discord_post',
              category: 'action',
              config: { channelId: 'ops-war-room', content: 'Incident triage active: severity assessed.' },
            },
          },
          {
            id: 'node_slack_post',
            type: 'custom',
            position: { x: 380, y: 310 },
            data: {
              label: 'Post to Slack #devops-alerts',
              nodeType: 'slack_post',
              category: 'action',
              config: { channel: '#devops-alerts', message: 'Immediate engineering attention required.' },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'node_trigger', target: 'node_ai_triage', animated: true },
          { id: 'e2', source: 'node_ai_triage', target: 'node_discord_post', animated: true },
          { id: 'e3', source: 'node_ai_triage', target: 'node_slack_post', animated: true },
        ],
      };
    }

    // Default universal operational automation
    return {
      name: `AI Automation: ${prompt.length > 40 ? prompt.slice(0, 40) + '...' : prompt}`,
      description: `Autonomous agentic pipeline constructed for: "${prompt}"`,
      tags: ['agentic', 'automation', 'operations'],
      trigger: { type: 'manual', config: {} },
      nodes: [
        {
          id: 'node_start',
          type: 'custom',
          position: { x: 250, y: 50 },
          data: {
            label: 'Manual Execution Trigger',
            nodeType: 'trigger',
            category: 'trigger',
            config: { triggerType: 'manual' },
          },
        },
        {
          id: 'node_ai_reason',
          type: 'custom',
          position: { x: 250, y: 180 },
          data: {
            label: 'AI Cognitive Analysis & Plan',
            nodeType: 'ai_summarize',
            category: 'ai',
            config: { prompt: `Analyze operational parameters for: ${prompt}` },
          },
        },
        {
          id: 'node_action_dispatch',
          type: 'custom',
          position: { x: 250, y: 310 },
          data: {
            label: 'Slack Notification & Dispatch',
            nodeType: 'slack_post',
            category: 'action',
            config: { channel: '#ops-general', message: `Execution completed for automation task: ${prompt}` },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'node_start', target: 'node_ai_reason', animated: true },
        { id: 'e2', source: 'node_ai_reason', target: 'node_action_dispatch', animated: true },
      ],
    };
  }

  _validateAndNormalizeGraph(graph) {
    if (!graph || !Array.isArray(graph.nodes)) {
      throw new Error('Generated workflow graph has invalid format (missing nodes array)');
    }

    const normalizedNodes = graph.nodes.map((node, index) => {
      const id = node.id || `node_${index + 1}`;
      const position = node.position || { x: 200, y: index * 120 + 50 };
      const data = node.data || {};
      return {
        id,
        type: node.type || 'custom',
        position,
        data: {
          label: data.label || `Step ${index + 1}`,
          nodeType: data.nodeType || 'action',
          category: data.category || 'action',
          config: data.config || {},
        },
      };
    });

    const normalizedEdges = Array.isArray(graph.edges)
      ? graph.edges.map((edge, index) => ({
          id: edge.id || `e_${edge.source || 'n' + index}_${edge.target || 'n' + (index + 1)}`,
          source: edge.source,
          target: edge.target,
          ...(edge.sourceHandle ? { sourceHandle: edge.sourceHandle } : {}),
          ...(edge.targetHandle ? { targetHandle: edge.targetHandle } : {}),
          animated: edge.animated !== false,
        }))
      : [];

    return {
      name: graph.name || 'Generated AI Workflow',
      description: graph.description || 'Generated automated workflow',
      tags: Array.isArray(graph.tags) ? graph.tags : ['ai-generated'],
      trigger: graph.trigger || { type: 'manual', config: {} },
      nodes: normalizedNodes,
      edges: normalizedEdges,
    };
  }
}

module.exports = new AiWorkflowGenerator();
