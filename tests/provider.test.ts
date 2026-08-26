import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AI_ENGINE_VERSION,
  AiProviderConfigurationError,
  classifyAiGenerationError,
  isFallbackEligibleAiError,
  resolveAiProvider,
} from '../src/lib/ai/provider';

test('explicit Groq configuration resolves the configured model without a network call', () => {
  const resolved = resolveAiProvider({
    PROGRAM_GENERATOR: 'ai',
    AI_PROVIDER: 'groq',
    GROQ_API_KEY: 'test-groq-key',
    GROQ_MODEL: 'openai/gpt-oss-120b',
  });
  assert.equal(resolved.provider, 'groq');
  assert.equal(resolved.modelName, 'openai/gpt-oss-120b');
  assert.equal(resolved.generator, 'ai');
});

test('explicit OpenAI configuration resolves OpenAI and never infers from another key', () => {
  const resolved = resolveAiProvider({
    PROGRAM_GENERATOR: 'ai',
    AI_PROVIDER: 'openai',
    OPENAI_API_KEY: 'test-openai-key',
    GROQ_API_KEY: 'test-groq-key',
    OPENAI_MODEL: 'gpt-4o-mini',
  });
  assert.equal(resolved.provider, 'openai');
  assert.equal(resolved.modelName, 'gpt-4o-mini');
});

test('AI_MODEL overrides the provider-specific model', () => {
  const resolved = resolveAiProvider({
    AI_PROVIDER: 'groq',
    AI_MODEL: 'test-model-override',
    GROQ_API_KEY: 'test-groq-key',
    GROQ_MODEL: 'provider-default',
  });
  assert.equal(resolved.modelName, 'test-model-override');
});

test('rules mode skips provider construction and does not require an API key', () => {
  const resolved = resolveAiProvider({PROGRAM_GENERATOR: 'rules', GROQ_API_KEY: ''});
  assert.deepEqual(
    {generator: resolved.generator, provider: resolved.provider, model: resolved.model, modelName: resolved.modelName},
    {generator: 'rules', provider: null, model: null, modelName: null},
  );
});

test('missing configured provider key is a safe configuration error', () => {
  assert.throws(
    () => resolveAiProvider({PROGRAM_GENERATOR: 'ai', AI_PROVIDER: 'groq'}),
    (error: unknown) => error instanceof AiProviderConfigurationError,
  );
  assert.equal(classifyAiGenerationError(new AiProviderConfigurationError('secret value must not leak')), 'ai_configuration_error');
});

test('provider failure categories are fallback-eligible while unrelated errors are not', () => {
  const cases: Array<[unknown, string]> = [
    [{status: 429, message: 'rate limited'}, 'ai_rate_limited'],
    [{status: 503}, 'ai_provider_5xx'],
    [new Error('request timed out'), 'ai_timeout'],
    [new TypeError('fetch failed'), 'ai_network_failure'],
    [{message: 'schema validation failed'}, 'ai_schema_validation_failed'],
    [{message: 'credit_balance_exhausted'}, 'ai_quota_exhausted'],
    // Provider credential/authorization rejections (invalid, revoked or
    // restricted API key) must route to the rules engine, not a 500.
    [{status: 401, name: 'AI_APICallError', message: 'Unauthorized'}, 'ai_configuration_error'],
    [{status: 403, name: 'AI_APICallError', message: 'Forbidden'}, 'ai_configuration_error'],
    [{status: 402, name: 'AI_APICallError', message: 'Payment Required'}, 'ai_configuration_error'],
  ];
  for (const [error, category] of cases) {
    assert.equal(classifyAiGenerationError(error), category);
    assert.equal(isFallbackEligibleAiError(error), true);
  }
  assert.equal(classifyAiGenerationError({status: 422, code: 'MEDICAL_CLEARANCE_REQUIRED'}), null);
  assert.equal(isFallbackEligibleAiError(new Error('Prisma persistence failed')), false);
});

test('provider metadata exposes a stable engine version without secrets', () => {
  assert.match(AI_ENGINE_VERSION, /^rules-v2\/provider-v1$/);
});
