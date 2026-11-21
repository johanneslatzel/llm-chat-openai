# Environment variables

The provider reads the standard OpenAI SDK connection variables and the `LLM_CHAT_OPENAI_*` overrides.

## Connection

| Variable                        | Required                   | Default                     | Description                                                              |
| ------------------------------- | -------------------------- | --------------------------- | ------------------------------------------------------------------------ |
| `OPENAI_API_KEY`                | yes for the default client | none                        | API key                                                                  |
| `OPENAI_BASE_URL`               | no                         | `https://api.openai.com/v1` | API endpoint. Set this for LM Studio or another OpenAI-compatible server |
| `LLM_CHAT_OPENAI_DEFAULT_MODEL` | no                         | none                        | Fallback model name                                                      |

`LLM_CHAT_OPENAI_DEFAULT_MODEL` is the fallback when no model is set. The
constructor throws when neither a model nor this variable is present.

## Provider options

| Variable                                | Type    | Default | Description                                                   |
| --------------------------------------- | ------- | ------- | ------------------------------------------------------------- |
| `LLM_CHAT_OPENAI_TEMPERATURE`           | number  | unset   | Sampling temperature                                          |
| `LLM_CHAT_OPENAI_MAX_TOKENS`            | integer | unset   | Legacy `max_tokens`                                           |
| `LLM_CHAT_OPENAI_MAX_COMPLETION_TOKENS` | integer | unset   | `max_completion_tokens`; takes precedence over `maxTokens`    |
| `LLM_CHAT_OPENAI_TOP_P`                 | number  | unset   | Nucleus sampling                                              |
| `LLM_CHAT_OPENAI_REASONING_EFFORT`      | enum    | unset   | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`           |
| `LLM_CHAT_OPENAI_TOOL_CHOICE`           | enum    | unset   | `none`, `auto`, `required`                                    |
| `LLM_CHAT_OPENAI_VERBOSITY`             | enum    | unset   | `low`, `medium`, `high`                                       |
| `LLM_CHAT_OPENAI_INCLUDE_USAGE`         | boolean | `false` | Request streamed usage through `stream_options.include_usage` |

The base `ChatService` also reads its own `LLM_CHAT_*` variables, such as
`LLM_CHAT_SYSTEM_PROMPT` and `LLM_CHAT_MAX_TOOL_CALL_ROUNDS`. See the
[llm-chat environment variables](https://johanneslatzel.github.io/llm-chat/env/).
