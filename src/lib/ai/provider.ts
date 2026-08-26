import {createGroq} from '@ai-sdk/groq';
import {createOpenAI} from '@ai-sdk/openai';
import type {LanguageModel} from 'ai';

export type AiProviderName = 'groq' | 'openai';
export type ProgramGeneratorMode = 'ai' | 'rules';

export type AiFallbackCategory =
  | 'ai_quota_exhausted'
  | 'ai_rate_limited'
  | 'ai_timeout'
  | 'ai_network_failure'
  | 'ai_provider_5xx'
  | 'ai_schema_validation_failed'
  | 'ai_configuration_error';

export interface ResolvedAiProvider {
  generator: ProgramGeneratorMode;
  provider: AiProviderName | null;
  model: LanguageModel | null;
  modelName: string | null;
}

export interface GenerationMetadata {
  source: 'ai' | 'rules';
  provider: AiProviderName | null;
  model: string | null;
  fallbackReason: AiFallbackCategory | null;
  engineVersion: string;
}

export class AiProviderConfigurationError extends Error {
  readonly category = 'ai_configuration_error' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AiProviderConfigurationError';
  }
}

function valueOf(env: Record<string, string | undefined>, key: string): string | undefined {
  const value = env[key]?.trim();
  return value || undefined;
}

/** Resolves the explicitly configured generator/provider; keys never imply provider selection. */
export function resolveAiProvider(
  env: Record<string, string | undefined> = process.env,
): ResolvedAiProvider {
  const generator = (valueOf(env, 'PROGRAM_GENERATOR') ?? 'ai').toLowerCase();
  if (generator === 'rules') return {generator: 'rules', provider: null, model: null, modelName: null};
  if (generator !== 'ai') throw new AiProviderConfigurationError('PROGRAM_GENERATOR must be ai or rules.');

  const provider = (valueOf(env, 'AI_PROVIDER') ?? 'openai').toLowerCase() as AiProviderName;
  if (provider !== 'groq' && provider !== 'openai') throw new AiProviderConfigurationError('AI_PROVIDER is not supported.');

  const keyName = provider === 'groq' ? 'GROQ_API_KEY' : 'OPENAI_API_KEY';
  const apiKey = valueOf(env, keyName);
  if (!apiKey) throw new AiProviderConfigurationError(`${keyName} is not configured.`);

  const modelName = valueOf(env, 'AI_MODEL')
    ?? (provider === 'groq'
      ? valueOf(env, 'GROQ_MODEL') ?? 'openai/gpt-oss-120b'
      : valueOf(env, 'OPENAI_MODEL') ?? 'gpt-4o-mini');
  const model = provider === 'groq' ? createGroq({apiKey})(modelName) : createOpenAI({apiKey})(modelName);
  return {generator: 'ai', provider, model, modelName};
}

/** Classifies only known provider/generation failures; unknown errors do not fall back. */
export function classifyAiGenerationError(error: unknown): AiFallbackCategory | null {
  const seen = new WeakSet<object>();
  const inspect = (value: unknown, depth: number): AiFallbackCategory | null => {
    if (depth > 4 || value == null) return null;
    if (typeof value === 'number') {
      if (value === 429) return 'ai_rate_limited';
      if (value >= 500 && value <= 599) return 'ai_provider_5xx';
      return null;
    }
    if (typeof value === 'string') {
      if (/insufficient_quota|credit_balance_exhausted|quota/i.test(value)) return 'ai_quota_exhausted';
      if (/timeout|timed out|deadline/i.test(value)) return 'ai_timeout';
      if (/eai_again|econnreset|fetch failed|network|connection/i.test(value)) return 'ai_network_failure';
      if (/schema|validation|no object|invalid output|could not parse/i.test(value)) return 'ai_schema_validation_failed';
      return null;
    }
    if (typeof value !== 'object' || seen.has(value)) return null;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (record instanceof AiProviderConfigurationError) return 'ai_configuration_error';
    for (const key of ['code', 'name', 'message', 'status', 'statusCode', 'responseBody', 'cause', 'lastError']) {
      let nested: unknown;
      try { nested = record[key]; } catch { continue; }
      const result = inspect(nested, depth + 1);
      if (result) return result;
    }
    return null;
  };
  return inspect(error, 0);
}

export function isFallbackEligibleAiError(error: unknown): boolean {
  return classifyAiGenerationError(error) !== null;
}

export const AI_ENGINE_VERSION = 'rules-v1/provider-v1';
