const assert = require('node:assert/strict');
const test = require('node:test');
const aiService = require('../src/services/aiService');

const originalEnvironment = {
  AI_PROVIDER: process.env.AI_PROVIDER,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_MODEL: process.env.AI_MODEL,
};

function configureTestAI() {
  process.env.AI_PROVIDER = 'openai-compatible';
  process.env.AI_API_KEY = 'test-key';
  process.env.AI_BASE_URL = 'https://test-provider.example/v1';
  process.env.AI_MODEL = 'test-model';
}

test.afterEach(() => {
  global.fetch = undefined;
});

test.after(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

test('validates task breakdown output', async () => {
  configureTestAI();
  global.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ tasks: [{ title: 'Collect syllabus', description: 'List exam topics', priority: 'high' }] }) } }] }), { status: 200 });
  const result = await aiService.breakDownGoal('Prepare for exams');
  assert.equal(result.tasks[0].title, 'Collect syllabus');
  assert.equal(result.tasks[0].priority, 'high');
});

test('retries once after malformed JSON', async () => {
  configureTestAI();
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    const content = calls === 1 ? 'not json' : JSON.stringify({ tasks: [{ title: 'Review notes' }] });
    return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
  };
  const result = await aiService.breakDownGoal('Study');
  assert.equal(calls, 2);
  assert.equal(result.tasks[0].title, 'Review notes');
});

test('rejects malformed priority output', () => {
  assert.throws(() => aiService.validatePriority({ priority: 'urgent', reason: 'Too important' }), (error) => error.code === 'AI_INVALID_RESPONSE');
});

test('classifies provider rate limits safely', async () => {
  configureTestAI();
  global.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(() => aiService.suggestPriority({ title: 'Review notes' }), (error) => error.code === 'AI_RATE_LIMIT' && error.status === 429);
});
