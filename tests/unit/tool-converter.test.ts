import { describe, expect, it } from 'vitest';
import type { ToolDefinition } from '@johannes.latzel/llm-chat-tool';
import { toOpenAIFunctionTool, toOpenAIFunctionTools } from '../../src/index.js';

const GREET: ToolDefinition = {
    name: 'greet',
    description: 'Greets a person',
    parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Person to greet' } },
        required: ['name'],
    },
};

const TIME: ToolDefinition = {
    name: 'time',
    description: 'Returns the current time',
    parameters: { type: 'object', properties: {} },
};

describe('toOpenAIFunctionTool', () => {
    it('wraps a neutral definition in the OpenAI function-tool shape', () => {
        expect(toOpenAIFunctionTool(GREET)).toEqual({
            type: 'function',
            function: {
                name: 'greet',
                description: 'Greets a person',
                parameters: GREET.parameters,
            },
        });
    });

    it('does not mutate the neutral definition', () => {
        const before = JSON.parse(JSON.stringify(GREET));
        toOpenAIFunctionTool(GREET);
        expect(GREET).toEqual(before);
    });
});

describe('toOpenAIFunctionTools', () => {
    it('converts multiple definitions in order', () => {
        const tools = toOpenAIFunctionTools([GREET, TIME]);
        expect(tools.map((tool) => tool.function.name)).toEqual(['greet', 'time']);
    });

    it('returns an empty array for no definitions', () => {
        expect(toOpenAIFunctionTools([])).toEqual([]);
    });
});
