# Structured output

`response_format` asks an OpenAI-compatible model for JSON. A JSON Schema adds
schema adherence; JSON mode only guarantees valid JSON.

The schema is passed through verbatim; [Structured output](../service.md#structured-output)
covers the strict-mode requirements.

```typescript
import { StructuredOutputError } from '@johannes.latzel/llm-chat';
import { OpenAIChatService } from '@johannes.latzel/llm-chat-openai';

type Ticket = {
    title: string;
    severity: 'low' | 'medium' | 'high';
    email: string;
    sku: string;
    quantity: number;
};

const ticketSchema = {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'severity', 'email', 'sku', 'quantity'],
    properties: {
        title: { type: 'string', description: 'Short issue title' },
        severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        email: { type: 'string' },
        sku: { type: 'string' },
        quantity: { type: 'integer' },
    },
};

const service = OpenAIChatService.builder()
    .model('some-model')
    .systemPrompt('Convert the customer message into a support ticket.')
    .jsonSchema({ name: 'support_ticket', schema: ticketSchema, strict: true })
    .create();

await service
    .chat()
    .user(
        'Customer: Ada Lovelace (ada@example.com). Checkout fails when I buy two widgets (SKU W-1).',
    );
await service.send();

try {
    const ticket = service.lastAssistantJson<Ticket>();
    if (ticket === undefined) {
        throw new Error('The model did not return structured output.');
    }
    console.log(JSON.stringify(ticket, null, 2));
} catch (error) {
    if (error instanceof StructuredOutputError) {
        console.error(`No structured answer: ${error.reason}`);
    } else {
        throw error;
    }
}
```

## JSON mode

`.jsonObject()` returns valid JSON without a schema. The prompt must ask for
JSON explicitly.

```typescript
import { OpenAIChatService } from '@johannes.latzel/llm-chat-openai';

type Answer = { answer: string };

const service = OpenAIChatService.builder()
    .model('some-model')
    .systemPrompt('Reply with a JSON object only, for example {"answer": "42"}.')
    .jsonObject()
    .create();

await service.chat().user('What is 17 * 23?');
await service.send();

const result = service.lastAssistantJson<Answer>();
console.log(result);
```

## Failures

`lastAssistantJson()` parses the most recent assistant content. It does not
validate business rules and does not retry. It returns `undefined` when there
is no assistant content and throws `StructuredOutputError` when the response is
refused, filtered, incomplete, or not valid JSON.

If the provider does not support `response_format`, the request fails with the
provider's error; llm-chat does not silently fall back. For providers without
structured-output support, use a tool call as the schema boundary. See
[Typed tools](https://johanneslatzel.github.io/llm-chat-tool/examples/typed-tools/) and [Tool calling](https://johanneslatzel.github.io/llm-chat/examples/tool-calling/).

## See also

- [Provider structured output](../service.md#structured-output): builder methods and schema pass-through
- [ChatService result access](https://johanneslatzel.github.io/llm-chat/services/chat-service/#structured-result-access): `lastAssistantJson()` and structured errors
- [Typed tools](https://johanneslatzel.github.io/llm-chat-tool/examples/typed-tools/): tool calls as a schema boundary
- [Tool calling](https://johanneslatzel.github.io/llm-chat/examples/tool-calling/): the engine's tool-call loop
