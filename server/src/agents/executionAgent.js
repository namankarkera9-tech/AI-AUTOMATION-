const ApiError = require('../utils/apiError');

/**
 * Execution Agent
 * Pure agent: Executes an individual workflow node by dispatching to the integration service,
 * executing AI tasks, or evaluating conditional logic.
 */
class ExecutionAgent {
  resolveTemplates(value, context) {
    if (typeof value === 'string') {
      return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
        const resolved = key.split('.').reduce((current, part) => current?.[part], context);
        return resolved === undefined || resolved === null ? '' : String(resolved);
      });
    }
    if (Array.isArray(value)) return value.map((item) => this.resolveTemplates(item, context));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, this.resolveTemplates(item, context)]));
    }
    return value;
  }

  async executeNode({ node, nodeInput = {}, executionContext = {}, integrationService, aiService, userId }) {
    const startTime = Date.now();
    const data = node.data || {};
    const nodeType = data.nodeType || 'action';
    const config = data.config || {};
    const resolvedConfig = this.resolveTemplates(config, nodeInput);

    let output = {};

    switch (nodeType) {
      case 'trigger': {
        output = {
          triggeredAt: new Date().toISOString(),
          triggerType: config.triggerType || 'manual',
          payload: JSON.parse(JSON.stringify(nodeInput)),
          message: `Trigger '${data.label || 'Workflow Trigger'}' fired successfully.`,
        };
        break;
      }

      case 'gmail_send': {
        const to = resolvedConfig.to || nodeInput.to || nodeInput.email;
        const subject = resolvedConfig.subject || nodeInput.subject || 'Automated Update from Agentflow AI';
        const body = resolvedConfig.body || nodeInput.body || nodeInput.message || 'Workflow executed step successfully.';

        output = await integrationService.executeIntegrationAction(userId, 'gmail', 'send_email', {
          to,
          subject,
          body,
        });
        break;
      }

      case 'gmail_read': {
        output = await integrationService.executeIntegrationAction(userId, 'gmail', 'read_emails', {
          query: config.query || 'is:unread',
          maxResults: config.maxResults || 5,
        });
        break;
      }

      case 'slack_post': {
        const channel = resolvedConfig.channel || '#ops-general';
        const message = resolvedConfig.message || nodeInput.message || `Automated notification: Node [${data.label}] executed.`;

        output = await integrationService.executeIntegrationAction(userId, 'slack', 'post_message', {
          channel,
          message,
        });
        break;
      }

      case 'slack_channels': {
        output = await integrationService.executeIntegrationAction(userId, 'slack', 'list_channels', {});
        break;
      }

      case 'discord_post': {
        const channelId = resolvedConfig.channelId;
        const content = resolvedConfig.content || nodeInput.content || `[Discord Alert] Node [${data.label}] dispatched.`;

        output = await integrationService.executeIntegrationAction(userId, 'discord', 'post_message', {
          channelId,
          content,
        });
        break;
      }

      case 'sheets_append': {
        const spreadsheetId = resolvedConfig.spreadsheetId;
        const range = resolvedConfig.range || 'Sheet1!A:E';
        let values = resolvedConfig.values || nodeInput.values || [
          new Date().toISOString(),
          node.id,
          data.label,
          JSON.stringify(nodeInput).slice(0, 50),
          'SUCCESS',
        ];
        if (typeof values === 'string') {
          try { values = JSON.parse(values); } catch { throw ApiError.badRequest('Sheets row values must be valid JSON'); }
        }

        output = await integrationService.executeIntegrationAction(userId, 'google-sheets', 'append_row', {
          spreadsheetId,
          range,
          values,
        });
        break;
      }

      case 'sheets_read': {
        output = await integrationService.executeIntegrationAction(userId, 'google-sheets', 'read_range', {
          spreadsheetId: config.spreadsheetId || 'ops_ledger',
          range: config.range || 'Sheet1!A1:D10',
        });
        break;
      }

      case 'ai_summarize':
      case 'ai_classify':
      case 'ai_node': {
        const prompt = resolvedConfig.prompt || `Summarize and classify the supplied workflow data for ${data.label || 'this step'}.`;
        const completion = await aiService.generateText({ prompt, input: nodeInput, model: resolvedConfig.model });
        output = { ...completion, timestamp: new Date().toISOString() };
        break;
      }

      case 'condition': {
        // Logic evaluation
        const conditionField = config.field || 'status';
        const conditionValue = config.value || 'SUCCESS';
        const actualValue = nodeInput[conditionField] || 'SUCCESS';
        const passed = String(actualValue).toLowerCase() === String(conditionValue).toLowerCase();

        output = {
          conditionEvaluated: `${conditionField} == ${conditionValue}`,
          actualValue,
          passed,
          branch: passed ? 'true' : 'false',
        };
        break;
      }

      default: {
        // General action
        output = {
          nodeId: node.id,
          label: data.label,
          executed: true,
          inputReceived: nodeInput,
          timestamp: new Date().toISOString(),
        };
      }
    }

    const duration = Date.now() - startTime;
    return {
      nodeId: node.id,
      label: data.label,
      output,
      duration,
      status: 'success',
    };
  }
}

module.exports = new ExecutionAgent();
