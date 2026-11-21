import OpenAI from 'openai';
import type {
    ChatCompletionCreateParamsStreaming,
    ChatCompletionMessageParam,
    ChatCompletionToolChoiceOption,
} from 'openai/resources/chat/completions';
import type { ReasoningEffort as OpenAIReasoningEffort } from 'openai/resources/shared';
import {
    ChatService,
    ChatServiceConfiguration,
    StreamEventType,
    ResponseFormatType,
    type CompletionUsage,
    type JsonSchemaResponseOptions,
    type ResponseFormat,
    type StreamEvent,
    type TokenEstimator,
} from '@johannes.latzel/llm-chat';
import { ChatRole, FinishReason, type ChatMessage } from '@johannes.latzel/llm-chat-message';
import { OpenAIChatServiceConfiguration } from './config.js';
import { toOpenAIFunctionTools } from '../tool-converter.js';

/** Verbosity literals accepted by the OpenAI SDK. */
type OpenAIVerbosity = 'low' | 'medium' | 'high';

/** Legacy request parameter for providers that do not support `max_completion_tokens`. */
interface LegacyMaxTokensParameter {
    max_tokens: number;
}

/** A reasoning block emitted in a stream delta by OpenRouter-style routes. */
interface OpenAIReasoningDetail {
    readonly type?: string;
    readonly text?: string;
    readonly summary?: string;
}

/** Provider-specific fields that OpenAI-compatible servers add to stream deltas. */
interface OpenAIDeltaExtensions {
    /** Refusal text emitted instead of an answer (declared by the OpenAI SDK). */
    readonly refusal?: string | null;
    /** Structured reasoning emitted by OpenRouter-style routes. */
    readonly reasoning_details?: readonly OpenAIReasoningDetail[];
    /** Plain reasoning emitted by Ollama. */
    readonly reasoning?: string;
    /** Plain reasoning emitted by OpenAI, DeepSeek, vLLM and similar servers. */
    readonly reasoning_content?: string;
}

/** Narrow an unknown stream field to a reasoning-detail array. */
function isReasoningDetailArray(value: unknown): value is readonly OpenAIReasoningDetail[] {
    return Array.isArray(value);
}

function toFinishReason(raw: string | null | undefined): FinishReason | null {
    switch (raw) {
        case 'stop':
            return FinishReason.Stop;
        case 'tool_calls':
            return FinishReason.ToolCalls;
        case 'length':
            return FinishReason.Length;
        case 'content_filter':
            return FinishReason.ContentFilter;
        default:
            return null;
    }
}

function toLocalISOString(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const y = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const s = pad(d.getSeconds());
    const ms = d.getMilliseconds().toString().padStart(3, '0');
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const tzH = pad(Math.floor(Math.abs(off) / 60));
    const tzM = pad(Math.abs(off) % 60);
    return `${y}-${mo}-${dd}T${h}:${mi}:${s}.${ms}${sign}${tzH}:${tzM}`;
}

/** Translate a neutral response format into the SDK request shape. */
function toOpenAIResponseFormat(
    format: ResponseFormat,
): NonNullable<ChatCompletionCreateParamsStreaming['response_format']> {
    switch (format.type) {
        case ResponseFormatType.Text:
            return { type: 'text' };
        case ResponseFormatType.JsonObject:
            return { type: 'json_object' };
        case ResponseFormatType.JsonSchema:
            return {
                type: 'json_schema',
                json_schema: {
                    name: format.json_schema.name,
                    ...(format.json_schema.description !== undefined
                        ? { description: format.json_schema.description }
                        : {}),
                    schema: format.json_schema.schema,
                    ...(format.json_schema.strict !== undefined
                        ? { strict: format.json_schema.strict }
                        : {}),
                },
            };
    }
}

function toOpenAIMessages(
    messages: readonly ChatMessage[],
    contentOf: (message: ChatMessage) => string,
    mapSystemToDeveloper: boolean,
): ChatCompletionMessageParam[] {
    return messages.map((msg): ChatCompletionMessageParam => {
        const content = contentOf(msg);
        switch (msg.role) {
            case ChatRole.System:
                return { role: mapSystemToDeveloper ? 'developer' : 'system', content };
            case ChatRole.Developer:
                return { role: 'developer', content };
            case ChatRole.User:
                return { role: 'user', content };
            case ChatRole.Assistant:
                return {
                    role: 'assistant',
                    content,
                    ...(msg.tool_calls !== undefined ? { tool_calls: msg.tool_calls } : {}),
                };
            case ChatRole.Tool:
                if (!msg.tool_call_id) {
                    throw new Error('Cannot send a tool message without a tool_call_id.');
                }
                return { role: 'tool', content, tool_call_id: msg.tool_call_id };
            case ChatRole.Reasoning:
                return { role: 'assistant', content };
            default:
                throw new Error(`Unexpected role: ${msg.role}`);
        }
    });
}

/** OpenAI provider implementation of {@link ChatService}. */
export class OpenAIChatService extends ChatService {
    /** Create a fluent builder for a new service. */
    static builder(): OpenAIChatServiceBuilder {
        return new OpenAIChatServiceBuilder();
    }

    constructor(
        private api: OpenAI = new OpenAI(),
        private openAIConfig: OpenAIChatServiceConfiguration = new OpenAIChatServiceConfiguration(),
        config?: ChatServiceConfiguration,
    ) {
        super(config);
        if (!this.openAIConfig.model?.trim()) {
            throw new Error(
                'No model provided. Pass a model in OpenAIChatServiceConfiguration or set the LLM_CHAT_OPENAI_DEFAULT_MODEL environment variable.',
            );
        }
    }

    /**
     * Drop stored reasoning messages when {@link filterReasoning} is enabled,
     * matching the messages {@link createStream} sends.
     */
    protected shouldSendMessage(message: ChatMessage): boolean {
        return !(this.openAIConfig.filterReasoning ?? true) || message.role !== ChatRole.Reasoning;
    }

    /**
     * Apply the configured timestamp prefix to the content sent to the provider.
     */
    protected toOutgoingContent(message: ChatMessage): string {
        if (message.role === ChatRole.System || !(this.openAIConfig.prefixWithTimestamp ?? false)) {
            return message.content;
        }
        return `${toLocalISOString(message.createdAt)}: ${message.content}`;
    }

    /**
     * Reserve the configured output budget for the proactive
     * {@link isContextWindowExceeded} check only; this value is not part of
     * {@link estimateTokens}. This is a very loose upper bound: it returns the
     * configured `maxCompletionTokens`/`maxTokens`, not the expected response
     * length. Mirrors the precedence used by {@link createStream}.
     */
    protected estimateCompletionTokens(): number {
        return this.openAIConfig.maxCompletionTokens ?? this.openAIConfig.maxTokens ?? 0;
    }

    /**
     * Count the serialized response format as provider input tokens. The schema
     * is part of the request even though it is not a chat message.
     */
    protected estimateRequestTokens(estimator: TokenEstimator): number {
        const format = this.openAIConfig.responseFormat;
        return format === undefined ? 0 : estimator.estimate(JSON.stringify(format));
    }

    protected async *createStream(signal?: AbortSignal): AsyncIterable<StreamEvent> {
        const model = this.openAIConfig.model?.trim();
        if (!model) {
            throw new Error(
                'No model provided. Pass a model in OpenAIChatServiceConfiguration or set the LLM_CHAT_OPENAI_DEFAULT_MODEL environment variable.',
            );
        }

        const chatMessages = this.chatImpl._rawMessages();
        const systemMessage = this.chatImpl.getSystem();
        const allMessages = systemMessage ? [systemMessage, ...chatMessages] : chatMessages;
        const messages = toOpenAIMessages(
            allMessages.filter((message) => this.shouldSendMessage(message)),
            (message) => this.toOutgoingContent(message),
            this.openAIConfig.useDeveloperRole ?? false,
        );
        const openaiTools = toOpenAIFunctionTools(this._tools.getDefinitions());
        const legacyMaxTokens: LegacyMaxTokensParameter | undefined =
            this.openAIConfig.maxTokens !== undefined
                ? { max_tokens: this.openAIConfig.maxTokens }
                : undefined;

        // These enums hold exactly the string literals the SDK accepts; the casts
        // only bridge TypeScript's nominal typing of string enums.
        const reasoningEffort = this.openAIConfig.reasoningEffort as
            OpenAIReasoningEffort | undefined;
        const toolChoice = this.openAIConfig.toolChoice as
            ChatCompletionToolChoiceOption | undefined;
        const verbosity = this.openAIConfig.verbosity as OpenAIVerbosity | undefined;

        const params: ChatCompletionCreateParamsStreaming = {
            model,
            messages,
            stream: true,
            ...(openaiTools.length > 0 ? { tools: openaiTools } : {}),
            ...(this.openAIConfig.responseFormat !== undefined
                ? { response_format: toOpenAIResponseFormat(this.openAIConfig.responseFormat) }
                : {}),
            ...(this.openAIConfig.temperature !== undefined
                ? { temperature: this.openAIConfig.temperature }
                : {}),
            ...(this.openAIConfig.maxCompletionTokens !== undefined
                ? { max_completion_tokens: this.openAIConfig.maxCompletionTokens }
                : (legacyMaxTokens ?? {})),
            ...(this.openAIConfig.stop !== undefined ? { stop: this.openAIConfig.stop } : {}),
            ...(this.openAIConfig.topP !== undefined ? { top_p: this.openAIConfig.topP } : {}),
            ...(reasoningEffort !== undefined ? { reasoning_effort: reasoningEffort } : {}),
            ...(toolChoice !== undefined ? { tool_choice: toolChoice } : {}),
            ...(verbosity !== undefined ? { verbosity } : {}),
            ...(this.openAIConfig.includeUsage ? { stream_options: { include_usage: true } } : {}),
        };

        const stream = await this.api.chat.completions.create(params, { signal });

        let finishReason: FinishReason | null = null;
        let usage: CompletionUsage | undefined;

        for await (const chunk of stream) {
            if (chunk.usage) usage = chunk.usage;

            const choice = chunk.choices[0];
            const reason = toFinishReason(choice?.finish_reason);
            if (reason !== null) finishReason = reason;

            const delta = choice?.delta;
            if (!delta) continue;

            if (delta.content) {
                yield { type: StreamEventType.Content, text: delta.content };
            }

            const extended: OpenAIDeltaExtensions = delta;
            const refusal = extended.refusal;
            if (typeof refusal === 'string' && refusal.length > 0) {
                yield { type: StreamEventType.Refusal, text: refusal };
            }

            const details = extended.reasoning_details;
            if (isReasoningDetailArray(details)) {
                for (const detail of details) {
                    if (
                        detail?.type === 'reasoning.text' &&
                        typeof detail.text === 'string' &&
                        detail.text.length > 0
                    ) {
                        yield { type: StreamEventType.Reasoning, text: detail.text };
                    } else if (
                        detail?.type === 'reasoning.summary' &&
                        typeof detail.summary === 'string' &&
                        detail.summary.length > 0
                    ) {
                        yield { type: StreamEventType.Reasoning, text: detail.summary };
                    }
                }
            } else {
                const flat = extended.reasoning ?? extended.reasoning_content;
                if (typeof flat === 'string' && flat.length > 0) {
                    yield { type: StreamEventType.Reasoning, text: flat };
                }
            }

            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const event: StreamEvent = {
                        type: StreamEventType.ToolCallDelta,
                        index: tc.index,
                        ...(tc.id ? { id: tc.id } : {}),
                        ...(tc.function?.name ? { name: tc.function.name } : {}),
                        ...(tc.function?.arguments ? { arguments: tc.function.arguments } : {}),
                    };
                    yield event;
                }
            }
        }

        if (usage) {
            yield { type: StreamEventType.Usage, usage };
        }

        if (finishReason !== null) {
            yield { type: StreamEventType.Finish, reason: finishReason };
        }
    }
}

/** Fluent builder for {@link OpenAIChatService}. */
export class OpenAIChatServiceBuilder {
    private _api: OpenAI | undefined;
    private _openAIConfig = new OpenAIChatServiceConfiguration();
    private _serviceConfig = new ChatServiceConfiguration();

    /** Set the model name sent to the API. */
    model(model: string): this {
        this._openAIConfig.model = model.trim();
        return this;
    }

    /** Set the sampling temperature. */
    temperature(value: number): this {
        this._openAIConfig.temperature = value;
        return this;
    }

    /** Set the legacy `max_tokens` limit. */
    maxTokens(value: number): this {
        this._openAIConfig.maxTokens = value;
        return this;
    }

    /** Set the `max_completion_tokens` limit for reasoning models. */
    maxCompletionTokens(value: number): this {
        this._openAIConfig.maxCompletionTokens = value;
        return this;
    }

    /** Set a flat system prompt. Overrides any previously configured file. */
    systemPrompt(content: string): this {
        this._serviceConfig.systemPrompt = content;
        delete this._serviceConfig.systemPromptFile;
        return this;
    }

    /** Load the system prompt from a file during {@link ChatService.init}.
     *  Overrides any previously configured flat prompt. */
    systemPromptFile(path: string): this {
        this._serviceConfig.systemPromptFile = path;
        delete this._serviceConfig.systemPrompt;
        return this;
    }

    /** Set a raw OpenAI-compatible `response_format` object. */
    responseFormat(format: ResponseFormat): this {
        this._openAIConfig.responseFormat = format;
        return this;
    }

    /** Enable JSON object mode. The prompt must instruct the model to return JSON. */
    jsonObject(): this {
        return this.responseFormat({ type: ResponseFormatType.JsonObject });
    }

    /** Enable Structured Outputs with the given JSON Schema. */
    jsonSchema(options: JsonSchemaResponseOptions): this {
        return this.responseFormat({
            type: ResponseFormatType.JsonSchema,
            json_schema: {
                name: options.name,
                ...(options.description !== undefined ? { description: options.description } : {}),
                schema: options.schema,
                ...(options.strict !== undefined ? { strict: options.strict } : {}),
            },
        });
    }

    /** Use a preconfigured OpenAI client, for custom endpoints or tests. */
    withClient(api: OpenAI): this {
        this._api = api;
        return this;
    }

    /** Replace the OpenAI configuration. */
    withOpenAIConfig(config: OpenAIChatServiceConfiguration): this {
        this._openAIConfig = config;
        return this;
    }

    /** Replace the chat-service configuration. */
    withServiceConfig(config: ChatServiceConfiguration): this {
        this._serviceConfig = config;
        return this;
    }

    /** Create the service. */
    create(): OpenAIChatService {
        return new OpenAIChatService(this._api, this._openAIConfig, this._serviceConfig);
    }
}
