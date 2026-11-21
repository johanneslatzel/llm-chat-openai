import { ChatServiceConfiguration } from '@johannes.latzel/llm-chat';
import {
    Tool,
    ToolParameters,
    ResultStatus,
    type PartialToolResult,
} from '@johannes.latzel/llm-chat-tool';
import { MockChunk } from './mock-openai.js';

export class TestOpenAITool extends Tool {
    constructor() {
        super('test_tool', 'A test tool', new ToolParameters({}));
    }
    protected async onExecute(_args: Record<string, unknown>): Promise<PartialToolResult> {
        return { result: 'ok', status: ResultStatus.Success };
    }
}

export function makeChunks(chunks: MockChunk[]) {
    return chunks;
}

export function createOpenAIConfig(): ChatServiceConfiguration {
    const config = new ChatServiceConfiguration();
    config.userPromptPaths = [];
    return config;
}
