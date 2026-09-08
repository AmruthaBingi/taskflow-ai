const priorities = new Set(['low', 'medium', 'high']);

class AIServiceError extends Error {
  constructor(message, code = 'AI_UNAVAILABLE', status = 503) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function getConfig() {
  const provider = process.env.AI_PROVIDER || 'openai-compatible';
  const apiKey = process.env.AI_API_KEY;

  if (provider === 'disabled' || !apiKey) {
    throw new AIServiceError('AI assistance is not configured yet', 'AI_NOT_CONFIGURED');
  }
  if (provider !== 'openai-compatible') {
    throw new AIServiceError('The configured AI provider is not supported', 'AI_PROVIDER_UNSUPPORTED');
  }

  return {
    apiKey,
    baseUrl: (process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, ''),
    model: process.env.AI_MODEL || 'gemini-3.8-flash',
  };
}

function parseJsonContent(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new AIServiceError('The AI returned invalid JSON. Please retry.', 'AI_INVALID_RESPONSE');
  }
}

function validateTaskBreakdown(value) {
  if (!value || !Array.isArray(value.tasks) || value.tasks.length < 1 || value.tasks.length > 7) throw new AIServiceError('The AI returned invalid task suggestions. Please retry.', 'AI_INVALID_RESPONSE');
  return {
    tasks: value.tasks.map((task) => {
      if (!task || typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200) throw new AIServiceError('The AI returned invalid task suggestions. Please retry.', 'AI_INVALID_RESPONSE');
      if (task.description !== undefined && typeof task.description !== 'string') throw new AIServiceError('The AI returned invalid task suggestions. Please retry.', 'AI_INVALID_RESPONSE');
      if (task.priority !== undefined && !priorities.has(task.priority)) throw new AIServiceError('The AI returned invalid task suggestions. Please retry.', 'AI_INVALID_RESPONSE');
      return { title: task.title.trim(), description: task.description?.trim() || '', priority: task.priority || 'medium' };
    }),
  };
}

function validateImprovement(value) {
  if (!value || typeof value.improvedTitle !== 'string' || !value.improvedTitle.trim() || typeof value.suggestion !== 'string' || !value.suggestion.trim()) throw new AIServiceError('The AI returned an invalid task improvement. Please retry.', 'AI_INVALID_RESPONSE');
  return { improvedTitle: value.improvedTitle.trim(), suggestion: value.suggestion.trim(), priority: priorities.has(value.priority) ? value.priority : 'medium' };
}

function validatePriority(value) {
  if (!value || !priorities.has(value.priority) || typeof value.reason !== 'string' || !value.reason.trim()) throw new AIServiceError('The AI returned an invalid priority suggestion. Please retry.', 'AI_INVALID_RESPONSE');
  return { priority: value.priority, reason: value.reason.trim() };
}

function validateInsights(value) {
  if (!value || !Array.isArray(value.insights) || value.insights.length > 5) throw new AIServiceError('The AI returned invalid productivity insights. Please retry.', 'AI_INVALID_RESPONSE');
  return { insights: value.insights.map((insight) => { if (typeof insight !== 'string' || !insight.trim()) throw new AIServiceError('The AI returned invalid productivity insights. Please retry.', 'AI_INVALID_RESPONSE'); return insight.trim(); }) };
}

async function callProvider(config, system, user) {
  let response;
  const isGemini = config.baseUrl.includes('generativelanguage.googleapis.com');
  const requestBody = {
    model: config.model,
    temperature: 0.2,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  };

  // Gemini's OpenAI-compatible endpoint can reject OpenAI's JSON-mode field.
  if (!isGemini) requestBody.response_format = { type: 'json_object' };

  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') throw new AIServiceError('The AI provider timed out. Please retry.', 'AI_TIMEOUT');
    throw new AIServiceError('The AI provider could not be reached. Please retry.', 'AI_NETWORK');
  }

  if (response.status === 401 || response.status === 403) throw new AIServiceError('The AI provider rejected the configured API key.', 'AI_AUTHENTICATION');
  if (response.status === 429) throw new AIServiceError('The AI provider rate limit was reached. Please retry shortly.', 'AI_RATE_LIMIT', 429);
  if (response.status >= 500) throw new AIServiceError(`The AI provider is temporarily unavailable (HTTP ${response.status}). Please retry.`, 'AI_PROVIDER');
  if (!response.ok) throw new AIServiceError(`The AI provider rejected the request (HTTP ${response.status}). Check the configured model and endpoint.`, 'AI_REQUEST_REJECTED');

  const payload = await response.json().catch(() => null);
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new AIServiceError('The AI returned no usable response. Please retry.', 'AI_INVALID_RESPONSE');
  return content;
}

async function completeJson({ system, user, validate, correction }) {
  const config = getConfig();
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callProvider(config, attempt === 0 ? system : `${system}\n\nCorrection: ${correction} Return only the requested JSON object, with no Markdown or commentary.`, user);
      return validate(parseJsonContent(content));
    } catch (error) {
      lastError = error;
      if (error.code !== 'AI_INVALID_RESPONSE' || attempt === 1) throw error;
    }
  }
  throw lastError;
}

async function breakDownGoal(goal, project = {}) {
  return completeJson({
    system: 'You are TaskFlow AI, a practical productivity assistant. Break one goal into 3 to 7 logically ordered, concrete actions. Return JSON exactly as {"tasks":[{"title":"...","description":"...","priority":"low|medium|high"}]}. Keep titles concise, descriptions useful, and priorities realistic. Never invent completed work or unsupported deadlines.',
    user: JSON.stringify({ goal, project: { name: project.name || '', description: project.description || '' } }),
    validate: validateTaskBreakdown,
    correction: 'tasks must be an array with 1 to 7 items; every item needs a non-empty title, optional string description, and optional priority of low, medium, or high.',
  });
}

async function improveTask({ title, description = '', priority = 'medium' }) {
  return completeJson({
    system: 'You are TaskFlow AI. Improve a vague task into one specific, actionable task. Return JSON exactly as {"improvedTitle":"...","suggestion":"...","priority":"low|medium|high"}. Do not claim the task is complete.',
    user: JSON.stringify({ title, description, priority }),
    validate: validateImprovement,
    correction: 'improvedTitle and suggestion must be non-empty strings; priority must be low, medium, or high.',
  });
}

async function suggestPriority(context) {
  return completeJson({
    system: 'You are TaskFlow AI. Suggest a conservative task priority based on urgency, wording, due date, project, and workload. Return JSON exactly as {"priority":"low|medium|high","reason":"..."}. Do not modify any data.',
    user: JSON.stringify(context),
    validate: validatePriority,
    correction: 'priority must be low, medium, or high and reason must be a non-empty string.',
  });
}

async function generateInsights(context) {
  return completeJson({
    system: 'You are TaskFlow AI analyzing one authenticated user\'s productivity summary. Return JSON exactly as {"insights":["..."]}. Provide 2 to 5 concise, evidence-based, actionable strings. Use only supplied aggregate data; do not invent facts or identify other users.',
    user: JSON.stringify(context),
    validate: validateInsights,
    correction: 'insights must be an array of 2 to 5 meaningful strings.',
  });
}

module.exports = { AIServiceError, breakDownGoal, generateInsights, improveTask, parseJsonContent, suggestPriority, validateInsights, validateImprovement, validatePriority, validateTaskBreakdown };
