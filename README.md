# 📦 @goodandready/dsh-dsml-artifact-guard

<div align="center">

<h3>Zero-dependency streaming guard and sanitizer for leaked DeepSeek DSML protocol tags and reasoning artifacts</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-dsml-artifact-guard"><img src="https://img.shields.io/npm/v/@goodandready/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/🌐_DSH_Hub-goodandready.app-ff4500.svg?style=for-the-badge&labelColor=1a1a2e" alt="GoodAndReady Showcase"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>If you find this plugin helpful, please star it on GitHub</strong> — your support helps maintain and develop the project.
      <br><br>
      🐛 <strong>Found a bug or have a feature idea?</strong> Feel free to open an issue on GitHub in any language.
    </td>
  </tr>
</table>

</div>

---

## ⚡ Problem & Purpose

When streaming responses from DeepSeek models via third-party proxies, gateways, or incompatible providers, protocol closing tags for tool invocations (DSML — DeepSeek Markup Language) occasionally leak into the visible text channel. Users observe raw markup at the end of their conversation:

```text
Response completed successfully.
</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
```

Additionally, reasoning models (such as DeepSeek-R1 / V3) or interrupted network streams can leave orphan `</think>` tags, dangling tokens (`<｜end of sentence｜>`), or unclosed thinking blocks that corrupt markdown rendering.

**`@goodandready/dsh-dsml-artifact-guard`** is a high-performance runtime guard for DeepSeek Harness that cleans these protocol artifacts in real time before they reach the user interface:

1. **Strict Synchronous Hook Contract**: Implements the Cordis `llm/stream` hook synchronously, returning an `AsyncIterable` directly to preserve runtime integrity and avoid fatal `TypeError: stream is not async iterable` errors.
2. **Chunk Boundary Buffer**: Uses a 96-byte sliding window to reliably intercept closing tags fragmented across network packet boundaries.
3. **Incomplete Token Recovery at Finish**: Detects and strips truncated protocol closing prefixes (`</｜DSML｜...`) when connections terminate abruptly.
4. **Reasoning Artifact Protection (`cleanThinkArtifacts`)**: Strips orphan `</think>` tags, removes trailing reasoning markers, and heals unclosed `<think>` blocks at stream finish.
5. **Fail-Open Tag Balancing**: Tracks open and closed tags to guarantee that legitimate technical discussions containing DSML or think examples are never altered.
6. **Live Telemetry & Metrics Dashboard**: Real-time in-memory counters (guarded sessions, stripped tags, last incident time, and recent events log) available directly in the native Web UI card.

---

## 📦 Installation

Install into your DeepSeek Harness web profile:

```bash
dsh plugin --profile web add @goodandready/dsh-dsml-artifact-guard
```

Restart your DeepSeek Harness instance.

---

## ⚙️ Configuration (`settings.yaml`)

Configure matching rules in `settings.yaml` or through the Web UI Settings Card:

```yaml
# settings.yaml
dsh-dsml-artifact-guard:
  mode: sanitize
  modelPattern: "deepseek"
  providers: []
  cleanThinkArtifacts: false
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `mode` | `string` | `"sanitize"` | Operation mode: `"sanitize"` (strip tags), `"audit"` (log only), or `"disabled"` |
| `modelPattern` | `string` | `"deepseek"` | Case-insensitive RegExp matched against model IDs (e.g. `deepseek`, `deepseek-v4.*`, `deepseek/.*`) |
| `providers` | `string[]` | `[]` | Optional list of provider IDs. When empty, guards all providers |
| `cleanThinkArtifacts` | `boolean` | `false` | Strips orphan `</think>` tags, removes trailing reasoning markers, and heals unclosed reasoning blocks |
| `providerId` | `string` | `undefined` | *(Deprecated)* Legacy exact provider identifier; maintained for backward compatibility |
| `modelId` | `string` | `undefined` | *(Deprecated)* Legacy exact model identifier; maintained for backward compatibility |

### HTTP Management Endpoints

| Method | Endpoint | Access | Description |
|:---|:---|:---|:---|
| `GET` | `/api/dsh-dsml-artifact-guard/stats` | Web UI / Localhost | Retrieves live in-memory telemetry and recent incident history |
| `POST` | `/api/dsh-dsml-artifact-guard/stats` | Loopback & Same-Origin | Resets telemetry counters and clears the recent incident log |
| `GET` | `/api/dsh-dsml-artifact-guard/update` | Web UI / Localhost | Retrieves current version, latest registry version, and update status |
| `POST` | `/api/dsh-dsml-artifact-guard/update` | Loopback & Same-Origin | Triggers in-place package update via DSH CLI |

---

## 🧪 Testing

Run the automated test suite:

```bash
npm test
npm run check
```

---

## 📄 License

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)
