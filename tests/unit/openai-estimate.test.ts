import { describe, expect, it } from 'vitest';
import {
    ChatServiceConfiguration,
    ResponseFormatType,
    type TokenEstimator,
} from '@johannes.latzel/llm-chat';
import { ChatMessageOrigin, ChatRole, type ChatMessage } from '@johannes.latzel/llm-chat-message';
import { OpenAIChatService, OpenAIChatServiceConfiguration } from '../../src/index.js';
import { createMockOpenAI } from '../index.js';

function makeService(
    openaiConfig: OpenAIChatServiceConfiguration,
    serviceConfig = new ChatServiceConfiguration(),
): OpenAIChatService {
    serviceConfig.userPromptPaths = [];
    return new OpenAIChatService(createMockOpenAI([]), openaiConfig, serviceConfig);
}

function config(
    overrides: Partial<OpenAIChatServiceConfiguration> = {},
): OpenAIChatServiceConfiguration {
    const cfg = new OpenAIChatServiceConfiguration();
    cfg.model = 'test-model';
    Object.assign(cfg, overrides);
    return cfg;
}

const REASONING: ChatMessage = {
    role: ChatRole.Reasoning,
    content: 'thinking',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    origin: ChatMessageOrigin.Model,
};

const USER: ChatMessage = {
    role: ChatRole.User,
    content: 'hello',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    origin: ChatMessageOrigin.User,
};

describe('OpenAIChatService estimate hooks', () => {
    it('filters reasoning when filterReasoning is enabled', () => {
        const service = makeService(config({ filterReasoning: true }));
        expect((service as any).shouldSendMessage(REASONING)).toBe(false);
        expect((service as any).shouldSendMessage(USER)).toBe(true);
    });

    it('keeps reasoning when filterReasoning is disabled', () => {
        const service = makeService(config({ filterReasoning: false }));
        expect((service as any).shouldSendMessage(REASONING)).toBe(true);
    });

    it('applies a timestamp prefix when enabled', () => {
        const service = makeService(config({ prefixWithTimestamp: true }));
        const content = (service as any).toOutgoingContent(USER);
        expect(content).toMatch(/^2026-01-01T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}: hello$/);
    });

    it('returns raw content when the timestamp prefix is disabled', () => {
        const service = makeService(config({ prefixWithTimestamp: false }));
        expect((service as any).toOutgoingContent(USER)).toBe('hello');
    });

    it('prefers maxCompletionTokens for the output reserve', () => {
        const service = makeService(config({ maxCompletionTokens: 400, maxTokens: 200 }));
        expect((service as any).estimateCompletionTokens()).toBe(400);
    });

    it('falls back to maxTokens for the output reserve', () => {
        const service = makeService(config({ maxTokens: 200 }));
        expect((service as any).estimateCompletionTokens()).toBe(200);
    });

    it('returns zero when no output reserve is configured', () => {
        const service = makeService(config());
        expect((service as any).estimateCompletionTokens()).toBe(0);
    });

    it('does not count a request format when none is configured', () => {
        const service = makeService(config());
        const estimator: TokenEstimator = { estimate: () => 99 };
        expect((service as any).estimateRequestTokens(estimator)).toBe(0);
    });

    it('counts the serialized request format', () => {
        const service = makeService(
            config({ responseFormat: { type: ResponseFormatType.JsonObject } }),
        );
        const estimator: TokenEstimator = { estimate: (text) => text.length };
        expect((service as any).estimateRequestTokens(estimator)).toBe(
            JSON.stringify({ type: ResponseFormatType.JsonObject }).length,
        );
    });
});
