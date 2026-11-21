# Usage and cost

Token usage is opt-in because some OpenAI-compatible servers reject the
`stream_options` parameter. This example requests usage, collects it per
request, and estimates cost from prices supplied in the environment.

`INPUT_PRICE_PER_MILLION`, `CACHED_INPUT_PRICE_PER_MILLION`, and
`OUTPUT_PRICE_PER_MILLION` are application settings, not llm-chat settings.
Use the current prices for the configured model.

```typescript
import { type StreamSummary } from '@johannes.latzel/llm-chat';
import {
    OpenAIChatService,
    OpenAIChatServiceConfiguration,
} from '@johannes.latzel/llm-chat-openai';

const inputPrice = Number(process.env.INPUT_PRICE_PER_MILLION ?? '0');
const cachedInputPrice = Number(process.env.CACHED_INPUT_PRICE_PER_MILLION ?? inputPrice);
const outputPrice = Number(process.env.OUTPUT_PRICE_PER_MILLION ?? '0');

const openAIConfig = new OpenAIChatServiceConfiguration();
openAIConfig.includeUsage = true;

const service = OpenAIChatService.builder()
    .withOpenAIConfig(openAIConfig)
    .model('some-model')
    .systemPrompt('You are a concise assistant.')
    .create();

let cachedPrompt = 0;
let uncachedPrompt = 0;
let completionTokens = 0;

function addUsage(summaries: readonly StreamSummary[]): void {
    for (const summary of summaries) {
        const prompt = summary.usage?.prompt_tokens ?? 0;
        const cached = summary.usage?.prompt_tokens_details?.cached_tokens ?? 0;
        cachedPrompt += cached;
        uncachedPrompt += prompt - cached;
        completionTokens += summary.usage?.completion_tokens ?? 0;
    }
}

function cost(): number {
    return (
        (uncachedPrompt / 1_000_000) * inputPrice +
        (cachedPrompt / 1_000_000) * cachedInputPrice +
        (completionTokens / 1_000_000) * outputPrice
    );
}

async function sendTurn(text: string): Promise<void> {
    service.stream().clearSummaries();
    await service.chat().user(text);
    await service.send();
    console.log(service.lastAssistantContent());

    const summaries = service.stream().summary();
    addUsage(summaries);

    const requestTokens = summaries.reduce(
        (sum, summary) => sum + (summary.usage?.total_tokens ?? 0),
        0,
    );
    const requestCachedPrompt = summaries.reduce(
        (sum, summary) => sum + (summary.usage?.prompt_tokens_details?.cached_tokens ?? 0),
        0,
    );

    console.error(
        `[usage] request: ${requestTokens} tokens (${requestCachedPrompt} cached prompt), ` +
            `session: ${uncachedPrompt + cachedPrompt + completionTokens} tokens ` +
            `(${cachedPrompt} cached prompt), $${cost().toFixed(4)}`,
    );
}

await sendTurn('Name three benefits of streaming responses.');
await sendTurn('Name three risks of streaming responses.');
```

## What is counted

- `stream().summary()` returns one entry per provider round. A round is one
  provider request and response; each tool-call iteration is another round.
- `stream().clearSummaries()` isolates the next request from earlier entries.
- `cachedPrompt` counts `prompt_tokens_details.cached_tokens`;
  `uncachedPrompt` is `prompt_tokens - cached_tokens`. The example bills the
  two groups at `CACHED_INPUT_PRICE_PER_MILLION` and
  `INPUT_PRICE_PER_MILLION`. When the cached price is unset, cached prompt
  tokens use the regular input price.
- `completion_tokens_details.reasoning_tokens` is available when the provider
  reports it and is already included in `completion_tokens`.

When the provider ignores `stream_options`, summaries have no `usage` field and
the totals stay at zero. Set `includeUsage` to `false` for servers that reject
the parameter.

## See also

- [Token usage](../service.md#token-usage): usage fields and `includeUsage`
- [Stream summaries](https://johanneslatzel.github.io/llm-chat/services/stream-hooks/#summaries): per-request summaries
- [Environment variables](../env.md): `OPENAI_*` and provider settings
