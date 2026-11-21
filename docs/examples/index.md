# Examples

Complete programs for the OpenAI provider. Install the engine, this package,
and the tool primitives before running the examples:

```bash
npm install @johannes.latzel/llm-chat @johannes.latzel/llm-chat-openai @johannes.latzel/llm-chat-tool
```

## Scenarios

- [Structured output](structured-output.md): JSON mode and JSON Schema with `lastAssistantJson()`
- [Usage and cost](usage-and-cost.md): streamed usage, cached input tokens and a cost estimate
- [Reasoning streams](reasoning.md): structured fields and inline `<think>` markers
- [Local endpoints](local-endpoints.md): LM Studio, Ollama and vLLM

## Guides

- [Quick start](../quickstart.md): install and first request
- [Service and configuration](../service.md): service options and builder
- [Environment variables](../env.md): connection and provider settings
- [Tool definitions](https://johanneslatzel.github.io/llm-chat-tool/tools/defining-tools/): define custom tools
