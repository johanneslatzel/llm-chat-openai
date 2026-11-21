# Local endpoints

`OpenAIChatService` works with LM Studio, Ollama, and other servers that
implement the OpenAI Chat Completions API. The default client reads
`OPENAI_BASE_URL` and `OPENAI_API_KEY` at construction.

```typescript
import { OpenAIChatService } from '@johannes.latzel/llm-chat-openai';

process.env.OPENAI_BASE_URL ??= 'http://localhost:1234/v1';
process.env.OPENAI_API_KEY ??= 'local';
process.env.LLM_CHAT_OPENAI_DEFAULT_MODEL ??= 'local-model';

const service = OpenAIChatService.builder().systemPrompt('You are a concise assistant.').create();

await service.chat().user('Reply with one sentence about local models.');
await service.send();
console.log(service.lastAssistantContent());
```

## Server settings

| Server    | `OPENAI_BASE_URL`           |
| --------- | --------------------------- |
| LM Studio | `http://localhost:1234/v1`  |
| Ollama    | `http://localhost:11434/v1` |
| vLLM      | `http://localhost:8000/v1`  |

The base URL includes `/v1`. Most local servers ignore the API key, but the
client requires a non-empty value.

Some servers reject `stream_options`; keep `includeUsage` off for them. For a
preconfigured client, pass an `OpenAI` instance:

```typescript
import OpenAI from 'openai';

const service = OpenAIChatService.builder()
    .withClient(new OpenAI({ baseURL: 'http://localhost:1234/v1', apiKey: 'local' }))
    .model('local-model')
    .create();
```

`openai` is a direct dependency of this package, so it is present in the
installed tree. Install `openai` in the application when the package manager
does not expose transitive dependencies.

## See also

- [OpenAI provider](../service.md): configuration and builder
- [Environment variables](../env.md): connection and provider settings
- [Custom provider](https://johanneslatzel.github.io/llm-chat/services/custom-provider/): implementing a provider for the engine
