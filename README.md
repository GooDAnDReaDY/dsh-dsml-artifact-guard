# 📦 @goodandready/dsh-dsml-artifact-guard

<div align="center">

<h3>Fail-Open Stream Sanitizer for Leaked Protocol DSML Closing Tags in DeepSeek Harness</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-dsml-artifact-guard"><img src="https://img.shields.io/npm/v/@goodandready/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/All_Author_Projects-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="docs/README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="docs/README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

</div>

---

## ⚡ Overview & The Problem

When interacting with certain upstream model providers or API gateways, raw DSML (DeepSeek Markup Language) tool-invocation protocol tags can leak into the assistant's visible text stream. Users frequently see trailing protocol clutter like:

```text
Done. All tests have passed.
</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
```

These leaked closing tags visually pollute the chat bubble, cause Markdown rendering glitches, and can confuse downstream agents or clipboard exports.

**`@goodandready/dsh-dsml-artifact-guard`** is a lightweight, host-only runtime stream interceptor for DeepSeek Harness that cleans up these terminal artifacts in real time before they reach the user interface:

1. **Synchronous Stream Contract Preservation**: Cordis requires stream interceptors to return an `AsyncIterable` synchronously. Making interceptors `async` returns a `Promise` that crashes the harness turn with `stream is not async iterable`. This guard adheres strictly to the synchronous hook contract.
2. **Split Chunk Buffer Pipeline**: Protocol tags often arrive split across multiple TCP or WebSocket text deltas. The guard maintains a small sliding buffer (`KEEP = 96` bytes) to reliably match and strip multi-chunk tails.
3. **100% Fail-Open Safety**: Never drops legitimate user or assistant text. Legitimate discussions about DSML syntax or internal tool calls are preserved intact.
4. **Targeted Provider & Model Scoping**: Restricts processing specifically to the provider and model configurations that exhibit tag leakage, passing other model traffic through with zero overhead.

---

## 🏗️ Architecture

```mermaid
graph TD
    subgraph DSH ["DeepSeek Harness Runtime"]
        Turn["Agent Turn Execution<br/>(LLM Stream Request)"]
        ChatUI["Chat UI Stream Consumer<br/>(Renders clean markdown text)"]
    end

    subgraph Guard ["@goodandready/dsh-dsml-artifact-guard"]
        Hook["Synchronous llm/stream Hook<br/>(Returns AsyncIterable synchronously)"]
        ScopeCheck{"Scope Match?<br/>(providerId & modelId)"}
        PassThrough["Raw Stream Pass-Through<br/>(Zero overhead for other models)"]
        Buffer["Sliding Tail Buffer<br/>(Preserves trailing 96 bytes across deltas)"]
        Detector{"Terminal Artifact?<br/>(Matches leaked DSML tail at finish)"}
        Sanitize["Sanitize Mode<br/>(Strips leaked closing tags)"]
        Audit["Audit Mode<br/>(Emits ctx.logger warning only)"]
    end

    Turn -->|ctx.on('llm/stream')| Hook
    Hook --> ScopeCheck
    ScopeCheck -->|No| PassThrough
    ScopeCheck -->|Yes| Buffer
    PassThrough --> ChatUI
    Buffer --> Detector
    Detector -->|No Artifact| ChatUI
    Detector -->|Artifact Found & sanitize| Sanitize --> ChatUI
    Detector -->|Artifact Found & audit| Audit --> ChatUI
```

---

## ✨ Features & Capabilities

### 1. Synchronous Hook Guarantee
Under Cordis and DSH service lifecycles, event listeners on `llm/stream` must return the transformed stream synchronously. An asynchronous hook wrapper will return a `Promise<AsyncIterable>`, causing the runtime dispatcher to immediately throw `TypeError: stream is not async iterable`. `dsh-dsml-artifact-guard` wraps the stream generator in a pure synchronous registration.

### 2. Multi-Chunk Tail Buffering
In real-world streaming, the artifact `</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>` is frequently fractured into fragments:
* Chunk 1: `All tasks complete. </｜DSML｜pa`
* Chunk 2: `rameter> </｜DSML｜invoke> `
* Chunk 3: `</｜DSML｜tool_calls>`

The guard retains a minimal 96-byte window until the next chunk or `finish` event arrives, ensuring fractured tags are seamlessly detected and sanitized as a single terminal artifact.

### 3. Fail-Open Architecture
* If the text contains genuine prose about DSML (e.g. `<｜DSML｜tool_calls>example</｜DSML｜tool_calls>`), it is **never** removed.
* Non-text chunks (`tool-call-delta`, `usage`, `finish`) are forwarded immediately without delay.
* Any malformed chunk structure passes through transparently to preserve session stability.

### 4. Flexible Operating Modes
* **`sanitize`** *(default)*: Strips terminal DSML closing tags and logs a warning with the count of removed artifacts.
* **`audit`**: Emits diagnostic logs with `ctx.logger.info(...)` without modifying the user-visible stream.
* **`disabled`**: Bypasses processing entirely.

---

## 📦 Installation

Install into your DeepSeek Harness web profile:

```bash
dsh plugin --profile web add @goodandready/dsh-dsml-artifact-guard
```

Restart your DeepSeek Harness instance.

---

## ⚙️ Configuration (`settings.yaml`)

Configure provider and model targets in `settings.yaml` or through the Web UI:

```yaml
# settings.yaml
dsh-dsml-artifact-guard:
  mode: sanitize
  providerId: "your-provider-id"
  modelId: "your-model-id"
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `mode` | `string` | `"sanitize"` | Operation mode: `"sanitize"` (strip tags), `"audit"` (log only), or `"disabled"` |
| `providerId` | `string` | `"opencode-go"` | Target provider identifier exhibiting leaked tags |
| `modelId` | `string` | `"deepseek-v4-flash"` | Target model identifier exhibiting leaked tags |

---

## 🧪 Testing

Run the automated test suite covering split chunks, audit vs sanitize modes, scope matching, and synchronous hook contracts:

```bash
npm test
npm run check
```

---

## 📄 License

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)


## Changed in v0.1.3

#8: wrap `llm/stream` in `ctx.effect` so unload unsubscribes.
#9: `cordis.patch.yml` uses `config: {}` — schema defaults (`mode: audit`, provider/model ids) apply unless overridden in host config.

## Changed in v0.1.4

#11: schema `mode` default set to `sanitize` for out-of-the-box protection.
#11: robust open/close tag balancing in `sanitizeDsmlArtifacts` to handle prior closed blocks in prose.
#11: repo hygiene with tracked `package-lock.json` and design contract.
