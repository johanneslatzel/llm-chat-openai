# Quick start

Install the provider and send a first message.

## Prerequisites

Node.js 22 or newer. The package is ESM-only (`"type": "module"`) and has no
CommonJS build.

## Installation

```bash
npm install @johannes.latzel/llm-chat @johannes.latzel/llm-chat-openai
```

Install `@johannes.latzel/llm-chat-tool` when defining tools.

## Configure the client

```bash
export OPENAI_API_KEY=sk-...
# Optional for OpenAI-compatible endpoints:
# export OPENAI_BASE_URL=http://localhost:1234/v1
```

## Send a message

```typescript
import { ChunkType } from '@johannes.latzel/llm-chat';
import { OpenAIChatService } from '@johannes.latzel/llm-chat-openai';

const service = OpenAIChatService.builder()
    .model('gpt-4.1')
    .systemPrompt('You are a helpful assistant.')
    .create();

// Hooks fire while send() consumes the provider stream.
service
    .stream()
    .hook()
    .chunks(ChunkType.Content)
    .do((chunk) => process.stdout.write(chunk.text));

await service.chat().user('Hello');
await service.send();
```

Chunks are emitted during `send()`, not after it. `stream().chunks()` returns
the buffered chunks as a `readonly Chunk[]`, so iterating it after `send()`
replays the response instead of streaming it. `ChunkType` is a string enum;
`ChunkType.Content` is the value `'content'`. For reasoning chunks, see
[Reasoning streams](examples/reasoning.md).

## Tools

Tools are defined with `@johannes.latzel/llm-chat-tool` and registered on the
service:

```typescript
import { Tool, ToolParameters, ResultStatus } from '@johannes.latzel/llm-chat-tool';

class TimeTool extends Tool {
    constructor() {
        super('time', 'Return the current time.', new ToolParameters({}, []));
    }

    protected async onExecute(): Promise<{ result: string; status: ResultStatus }> {
        return { result: new Date().toISOString(), status: ResultStatus.Success };
    }
}

service.tools().add(new TimeTool());
```

The provider converts each neutral `ToolDefinition` with
`toOpenAIFunctionTools()` before the request. `send()` executes registered
tools and repeats the provider call until the model stops. See
[Tool calling](https://johanneslatzel.github.io/llm-chat/examples/tool-calling/).

## Full API

See [API reference](api-reference.md).
