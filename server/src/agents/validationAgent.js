/**
 * Validation Agent
 * Pure agent: Inspects output fields emitted by the Execution Agent, checks for missing
 * mandatory attributes, verifies data integrity, and validates execution contracts.
 */
class ValidationAgent {
  validate({ node, result }) {
    const issues = [];
    const output = result.output || {};
    const nodeType = node.data?.nodeType || 'action';

    if (!output || (typeof output === 'object' && Object.keys(output).length === 0)) {
      issues.push('MISSING_FIELDS: Node emitted empty output payload');
    }

    if (nodeType === 'gmail_send') {
      if (!output.delivered) {
        issues.push('MISSING_FIELDS: Gmail delivery confirmation missing');
      }
    } else if (nodeType === 'slack_post' || nodeType === 'discord_post') {
      if (!output.delivered) {
        issues.push('MISSING_FIELDS: Message delivery confirmation missing');
      }
    } else if (nodeType === 'sheets_append') {
      if (!output.appended) {
        issues.push('MISSING_FIELDS: Spreadsheet append confirmation missing');
      }
    } else if (nodeType === 'ai_summarize' || nodeType === 'ai_classify') {
      if (!output.result) {
        issues.push('MISSING_FIELDS: AI output text missing');
      }
    }

    const isValid = issues.length === 0;

    return {
      isValid,
      nodeId: node.id,
      issues,
      summary: isValid
        ? `Output validation passed for node [${node.data?.label || node.id}].`
        : `Output validation failed: ${issues.join('; ')}`,
      validatedAt: new Date().toISOString(),
    };
  }
}

module.exports = new ValidationAgent();
