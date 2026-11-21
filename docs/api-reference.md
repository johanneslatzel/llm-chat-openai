# API reference

Reference for the provider service, builder, configuration, and exported enums.

## OpenAIChatService

`OpenAIChatService` extends `ChatService` and implements the OpenAI-compatible streaming provider.

### `constructor(api?, openAIConfig?, config?)`

| Param          | Type                             | Default           | Description                 |
| -------------- | -------------------------------- | ----------------- | --------------------------- |
| `api`          | `OpenAI`                         | `new OpenAI()`    | Preconfigured OpenAI client |
| `openAIConfig` | `OpenAIChatServiceConfiguration` | new configuration | Provider configuration      |
| `config`       | `ChatServiceConfiguration`       | new configuration | Base service configuration  |

When no model is configured, the constructor throws. The default client reads
`OPENAI_API_KEY` and `OPENAI_BASE_URL` at construction.

### `static builder()`

Returns `OpenAIChatServiceBuilder`.

## OpenAIChatServiceBuilder

Fluent builder for the service.

### `model(name)`

| Param  | Type     | Default | Description |
| ------ | -------- | ------- | ----------- |
| `name` | `string` |         | Model name  |

Returns `this`.

### `temperature(value)`

| Param   | Type     | Default | Description          |
| ------- | -------- | ------- | -------------------- |
| `value` | `number` |         | Sampling temperature |

Returns `this`.

### `maxTokens(value)`

| Param   | Type     | Default | Description               |
| ------- | -------- | ------- | ------------------------- |
| `value` | `number` |         | Legacy `max_tokens` limit |

Returns `this`.

### `maxCompletionTokens(value)`

| Param   | Type     | Default | Description                   |
| ------- | -------- | ------- | ----------------------------- |
| `value` | `number` |         | `max_completion_tokens` limit |

Returns `this`.

### `systemPrompt(content)`

| Param     | Type     | Default | Description        |
| --------- | -------- | ------- | ------------------ |
| `content` | `string` |         | Flat system prompt |

Returns `this`.

### `systemPromptFile(path)`

| Param  | Type     | Default | Description             |
| ------ | -------- | ------- | ----------------------- |
| `path` | `string` |         | System prompt file path |

Returns `this`.

### `responseFormat(format)`

| Param    | Type             | Default | Description                 |
| -------- | ---------------- | ------- | --------------------------- |
| `format` | `ResponseFormat` |         | Raw `response_format` value |

Returns `this`.

### `jsonObject()`

Enables JSON object mode. Returns `this`.

### `jsonSchema(options)`

| Param     | Type                        | Default | Description                                      |
| --------- | --------------------------- | ------- | ------------------------------------------------ |
| `options` | `JsonSchemaResponseOptions` |         | Schema name, schema, description and strict flag |

Returns `this`.

### `withClient(api)`

| Param | Type     | Default | Description                 |
| ----- | -------- | ------- | --------------------------- |
| `api` | `OpenAI` |         | Preconfigured OpenAI client |

Returns `this`.

### `withOpenAIConfig(config)`

| Param    | Type                             | Default | Description            |
| -------- | -------------------------------- | ------- | ---------------------- |
| `config` | `OpenAIChatServiceConfiguration` |         | Provider configuration |

Returns `this`.

### `withServiceConfig(config)`

| Param    | Type                       | Default | Description                |
| -------- | -------------------------- | ------- | -------------------------- |
| `config` | `ChatServiceConfiguration` |         | Base service configuration |

Returns `this`.

### `create()`

Creates and returns `OpenAIChatService`.

## Inherited from ChatService

The provider inherits the session API from `ChatService`. See the
[ChatService reference](https://johanneslatzel.github.io/llm-chat/services/chat-service/).

| Method                   | Returns                | Description                                              |
| ------------------------ | ---------------------- | -------------------------------------------------------- |
| `chat()`                 | `ChatInterface`        | Build the history; `chat().user()` appends user messages |
| `send()`                 | `Promise<void>`        | Drain the queue, run the tool-call loop, and fire hooks  |
| `stream()`               | `ChunkStreamInterface` | Chunk stream produced by the last send                   |
| `stream().chunks()`      | `readonly Chunk[]`     | Buffered chunks                                          |
| `tools()`                | `ToolSuiteInterface`   | Tool registry                                            |
| `lastAssistantContent()` | `string \| undefined`  | Most recent assistant content                            |
| `lastAssistantJson<T>()` | `T \| undefined`       | Parse the most recent assistant content as JSON          |

## OpenAIChatServiceConfiguration

| Property              | Type                 | Env var                                 |
| --------------------- | -------------------- | --------------------------------------- |
| `model`               | `string`             | `LLM_CHAT_OPENAI_DEFAULT_MODEL`         |
| `temperature`         | `number`             | `LLM_CHAT_OPENAI_TEMPERATURE`           |
| `maxTokens`           | `number`             | `LLM_CHAT_OPENAI_MAX_TOKENS`            |
| `maxCompletionTokens` | `number`             | `LLM_CHAT_OPENAI_MAX_COMPLETION_TOKENS` |
| `stop`                | `string \| string[]` | none                                    |
| `topP`                | `number`             | `LLM_CHAT_OPENAI_TOP_P`                 |
| `useDeveloperRole`    | `boolean`            | none                                    |
| `filterReasoning`     | `boolean`            | none                                    |
| `prefixWithTimestamp` | `boolean`            | none                                    |
| `reasoningEffort`     | `ReasoningEffort`    | `LLM_CHAT_OPENAI_REASONING_EFFORT`      |
| `toolChoice`          | `ToolChoice`         | `LLM_CHAT_OPENAI_TOOL_CHOICE`           |
| `verbosity`           | `Verbosity`          | `LLM_CHAT_OPENAI_VERBOSITY`             |
| `includeUsage`        | `boolean`            | `LLM_CHAT_OPENAI_INCLUDE_USAGE`         |
| `responseFormat`      | `ResponseFormat`     | none                                    |

## Enums

### `ReasoningEffort`

| Value     | Description          |
| --------- | -------------------- |
| `None`    | No reasoning effort  |
| `Minimal` | Minimal reasoning    |
| `Low`     | Low reasoning        |
| `Medium`  | Medium reasoning     |
| `High`    | High reasoning       |
| `XHigh`   | Extra-high reasoning |

### `ToolChoice`

| Value      | Description          |
| ---------- | -------------------- |
| `None`     | Do not call tools    |
| `Auto`     | Let the model choose |
| `Required` | Require a tool call  |

### `Verbosity`

| Value    | Description        |
| -------- | ------------------ |
| `Low`    | Concise responses  |
| `Medium` | Balanced responses |
| `High`   | Detailed responses |

## Tool definition conversion

### `toOpenAIFunctionTool(definition)`

| Param        | Type             | Default | Description             |
| ------------ | ---------------- | ------- | ----------------------- |
| `definition` | `ToolDefinition` |         | Neutral tool definition |

Returns an OpenAI function tool.

### `toOpenAIFunctionTools(definitions)`

| Param         | Type               | Default | Description              |
| ------------- | ------------------ | ------- | ------------------------ |
| `definitions` | `ToolDefinition[]` |         | Neutral tool definitions |

Returns OpenAI function tools in the same order.

## Reused types

`ChatServiceConfiguration`, `StreamEvent`, `StreamEventType`,
`ResponseFormat`, `ResponseFormatType`, `JsonSchemaObject`, and
`JsonSchemaResponseOptions` come from `@johannes.latzel/llm-chat`.
`ChatRole`, `ChatMessage`, and `FinishReason` come from
`@johannes.latzel/llm-chat-message`.
