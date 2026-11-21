import { createEnvReader, RangePolicy } from '@johannes.latzel/env';
import type { ResponseFormat } from '@johannes.latzel/llm-chat';

/** Reader shared by the configuration defaults. Clamps numeric values to their
 *  minimum, trims optional strings, and compares enum values case-insensitively. */
const env = createEnvReader({
    rangePolicy: RangePolicy.Clamp,
    trimOptionalString: true,
    enumCaseSensitive: false,
});

/** Read an optional token limit, treating zero and invalid values as unset. */
function optionalTokenLimit(key: string): number | undefined {
    return env.int(key, 0, 0) || undefined;
}

/** How much reasoning effort the model should spend (for reasoning models like o3). */
export enum ReasoningEffort {
    None = 'none',
    Minimal = 'minimal',
    Low = 'low',
    Medium = 'medium',
    High = 'high',
    XHigh = 'xhigh',
}

/** Whether the model must, may, or must not call tools. */
export enum ToolChoice {
    None = 'none',
    Auto = 'auto',
    Required = 'required',
}

/** How verbose the streaming output should be. */
export enum Verbosity {
    Low = 'low',
    Medium = 'medium',
    High = 'high',
}

/** Configuration for {@link OpenAIChatService}. Properties that document an environment variable read it on construction; the remaining properties are set programmatically. */
export class OpenAIChatServiceConfiguration {
    /** OpenAI model name (default: `LLM_CHAT_OPENAI_DEFAULT_MODEL`). */
    model?: string = env.optionalString('LLM_CHAT_OPENAI_DEFAULT_MODEL');
    /** Sampling temperature (default: `LLM_CHAT_OPENAI_TEMPERATURE`). */
    temperature?: number = env.float('LLM_CHAT_OPENAI_TEMPERATURE');
    /** Max tokens per response (default: `LLM_CHAT_OPENAI_MAX_TOKENS`). */
    maxTokens?: number = optionalTokenLimit('LLM_CHAT_OPENAI_MAX_TOKENS');
    /** Max completion tokens for reasoning models (default: `LLM_CHAT_OPENAI_MAX_COMPLETION_TOKENS`). */
    maxCompletionTokens?: number = optionalTokenLimit('LLM_CHAT_OPENAI_MAX_COMPLETION_TOKENS');
    /** Stop sequences passed to the provider. */
    stop?: string | string[];
    /** Top-p nucleus sampling (default: `LLM_CHAT_OPENAI_TOP_P`). */
    topP?: number = env.float('LLM_CHAT_OPENAI_TOP_P');
    /** Map system messages to the `developer` role (for o-series models). */
    useDeveloperRole?: boolean = false;
    /** Drop stored reasoning messages from outgoing requests when true (default: true). Reasoning remains stored in the chat history. */
    filterReasoning?: boolean = true;
    /** Prepend each conversation message with an ISO timestamp; system prompts are never prefixed. */
    prefixWithTimestamp?: boolean = false;
    /** Reasoning effort hint (default: `LLM_CHAT_OPENAI_REASONING_EFFORT`). */
    reasoningEffort?: ReasoningEffort = env.enum(
        'LLM_CHAT_OPENAI_REASONING_EFFORT',
        Object.values(ReasoningEffort),
    );
    /** Tool call policy (default: `LLM_CHAT_OPENAI_TOOL_CHOICE`). */
    toolChoice?: ToolChoice = env.enum('LLM_CHAT_OPENAI_TOOL_CHOICE', Object.values(ToolChoice));
    /** Streaming verbosity (default: `LLM_CHAT_OPENAI_VERBOSITY`). */
    verbosity?: Verbosity = env.enum('LLM_CHAT_OPENAI_VERBOSITY', Object.values(Verbosity));
    /** Request streamed token usage by sending `stream_options.include_usage` (env: `LLM_CHAT_OPENAI_INCLUDE_USAGE`, default: `false`). Some OpenAI-compatible servers reject unknown streaming options, so this is opt-in. */
    includeUsage?: boolean = env.bool('LLM_CHAT_OPENAI_INCLUDE_USAGE', false);
    /** Optional OpenAI-compatible response format. Omitted when undefined so servers that reject the field are unaffected. */
    responseFormat?: ResponseFormat;
}
