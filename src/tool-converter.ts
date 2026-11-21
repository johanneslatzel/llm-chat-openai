import type { ChatCompletionFunctionTool } from 'openai/resources/chat/completions';
import type { ToolDefinition } from '@johannes.latzel/llm-chat-tool';

/** Convert one provider-neutral tool definition to OpenAI's function-tool shape. */
export function toOpenAIFunctionTool(definition: ToolDefinition): ChatCompletionFunctionTool {
    return {
        type: 'function',
        function: {
            name: definition.name,
            description: definition.description,
            parameters: definition.parameters,
        },
    };
}

/** Convert provider-neutral tool definitions to OpenAI function tools, preserving order. */
export function toOpenAIFunctionTools(
    definitions: readonly ToolDefinition[],
): ChatCompletionFunctionTool[] {
    return definitions.map(toOpenAIFunctionTool);
}
