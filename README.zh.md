# 📦 @goodandready/dsh-dsml-artifact-guard

<div align="center">

<h3>面向 DeepSeek Harness 的残留 DSML 协议闭合标签流式熔断清洗引擎</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/@goodandready/dsh-dsml-artifact-guard"><img src="https://img.shields.io/npm/v/@goodandready/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=6366f1&labelColor=1e1b4b" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/GooDAnDReaDY/dsh-dsml-artifact-guard.svg?style=for-the-badge&color=10b981&labelColor=064e3b" alt="license"></a>
  <a href="https://github.com/topics/dsh-plugin"><img src="https://img.shields.io/badge/DSH-Plugin-8b5cf6.svg?style=for-the-badge&labelColor=2e1065" alt="DSH Plugin"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node-20%2B-f59e0b.svg?style=for-the-badge&labelColor=451a03" alt="Node version"></a>
</p>

<p align="center">
  <a href="https://goodandready.app/"><img src="https://img.shields.io/badge/作者全部项目-goodandready.app-ff4500.svg?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e" alt="作者全部项目"></a>
</p>

<p align="center">
  <a href="README.md"><b>🇬🇧 English</b></a> •
  <a href="README.ru.md"><b>🇷🇺 Русский</b></a> •
  <a href="README.zh.md"><b>🇨🇳 中文说明</b></a>
</p>

<table align="center">
  <tr>
    <td align="center">
      ⭐ <strong>如果您喜欢这个插件，请在 GitHub 上为它点亮 Star</strong> — 这能让我知道插件对您有用，并鼓励我继续开发和维护它。
      <br><br>
      🐛 <strong>如果您发现 Bug 或希望增加功能</strong>，请使用任意语言在 GitHub 上提交 Issue — 我会评估您的建议，并在后续版本中实现有价值的改进。
    </td>
  </tr>
</table>

</div>

---

## ⚡ 核心定位与解决痛点

在对接特定第三方大模型服务商或代理网关时，底层工具调用协议 DSML（DeepSeek Markup Language）的闭合标签有时会异常泄漏并附着在模型输出的正文末尾。用户在聊天界面中经常看到多余的协议残留：

```text
任务完成，所有测试均已通过。
</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>
```

此类闭合标签不仅造成视觉污染、破坏 Markdown 排版渲染，还会干扰后续多智能体协作解析或文本复制导出。

**`@goodandready/dsh-dsml-artifact-guard`** 是专为 DeepSeek Harness 打造的原生宿主级（host-only）文本流拦截过滤插件，在文本到达前端界面之前实时侦测并净化残留闭合标签：

1. **严格同步 Hook 契约保障**：Cordis 要求流拦截器必须同步返回 `AsyncIterable`。将拦截器写成 `async` 会返回 `Promise`，直接引发运行时崩溃：`stream is not async iterable`。本插件严格保持同步注册。
2. **分片分包滑动缓冲流**：网络分包常将闭合标签切断并分散在不同 Text Delta 中。插件内置 96 字节（`KEEP = 96`）滑动窗口，精准捕获并合并跨分片的长尾标签。
3. **100% 故障开放（Fail-Open）安全**：绝不误伤合法正文。对于讨论 DSML 语法的正常技术文本，插件保证原样放行。
4. **定向模型与服务商匹配**：仅对发生协议泄漏的目标 Provider/Model 执行流式清洗，其他模型流量直通零开销。

---

## 🏗️ 架构设计

```mermaid
graph TD
    subgraph DSH ["DeepSeek Harness 核心运行时"]
        Turn["智能体回合执行<br/>(发起大模型流式请求)"]
        ChatUI["聊天界面流式消费端<br/>(渲染纯净 Markdown 文本)"]
    end

    subgraph Guard ["@goodandready/dsh-dsml-artifact-guard"]
        Hook["同步 llm/stream 拦截钩子<br/>(同步返回 AsyncIterable)"]
        ScopeCheck{"是否命中范围?<br/>(校验 providerId 与 modelId)"}
        PassThrough["原始数据流直通<br/>(其他模型零延迟零开销)"]
        Buffer["滑动尾部缓冲区<br/>(跨分片保留最后 96 字节)"]
        Detector{"末端残留判定?<br/>(流结束 finish 时比对标签)"]
        Sanitize["清洗模式 (Sanitize)<br/>(安全剥除协议残留标签)"]
        Audit["审计模式 (Audit)<br/>(仅记录日志不改动文本)"]
    end

    Turn -->|llm/stream 拦截| Hook
    Hook --> ScopeCheck
    ScopeCheck -->|未命中| PassThrough
    ScopeCheck -->|命中| Buffer
    PassThrough --> ChatUI
    Buffer --> Detector
    Detector -->|无异常| ChatUI
    Detector -->|检出残留: sanitize| Sanitize --> ChatUI
    Detector -->|检出残留: audit| Audit --> ChatUI
```

---

## ✨ 核心特性深度解析

### 1. 同步 Hook 契约保护
在 Cordis 与 DSH 的底层事件总线中，`llm/stream` 监听器必须同步返回转换后的迭代器。若将回调函数声明为 `async`，返回值将被自动包裹为 `Promise<AsyncIterable>`，导致下层调度器抛出致命异常：`TypeError: stream is not async iterable`。`dsh-dsml-artifact-guard` 采用纯同步生成器封装，从根源规避调度崩溃。

### 2. 跨分片长尾标签精准捕获
在实际网络传输中，长尾标签 `</｜DSML｜parameter> </｜DSML｜invoke> </｜DSML｜tool_calls>` 常被拆分为多个 chunk：
* Chunk 1: `All tasks complete. </｜DSML｜pa`
* Chunk 2: `rameter> </｜DSML｜invoke> `
* Chunk 3: `</｜DSML｜tool_calls>`

滑动窗口在接收到下一个文本分片或 `finish` 信号前保留尾部 96 字节，确保跨包切分的标签被作为一个完整实体精准匹配并剔除。

### 3. 数据安全与故障开放保障
* 正文技术讨论中出现 DSML 示例代码时（如 `<｜DSML｜tool_calls>demo</｜DSML｜tool_calls>`），绝不误删。
* 非文本分片（`tool-call-delta`, `usage`, `finish`）即时透传，无任何额外排队延迟。
* 遇到畸形数据格式时自动降级放行，优先确保会话畅通不中断。

### 4. 三种灵活运行模式
* **`sanitize`** *(默认)*：自动剥离末尾残留标签，并在日志中输出剥离计数。
* **`audit`**：仅通过 `ctx.logger.info(...)` 记录检出警告，保持用户界面原样输出。
* **`disabled`**：完全旁路，不进行任何处理。

---

## 📦 快速安装

通过 DeepSeek Harness CLI 一键安装：

```bash
dsh plugin --profile web add @goodandready/dsh-dsml-artifact-guard
```

重启 DeepSeek Harness 实例即可生效。

---

## ⚙️ 配置指南 (`settings.yaml`)

在 `settings.yaml` 或 Web UI 设置面板中配置目标服务商与模型：

```yaml
# settings.yaml
dsh-dsml-artifact-guard:
  mode: sanitize
  providerId: "your-provider-id"
  modelId: "your-model-id"
```

### 配置参数参考表

| 参数名 | 类型 | 默认值 | 功能说明 |
|:---|:---|:---|:---|
| `mode` | `string` | `"sanitize"` | 运行模式：`"sanitize"`（清洗标签）、`"audit"`（仅审计）或 `"disabled"` |
| `providerId` | `string` | `"opencode-go"` | 发生协议标签泄漏的目标服务商标识符 |
| `modelId` | `string` | `"deepseek-v4-flash"` | 发生协议标签泄漏的目标模型标识符 |

---

## 🧪 测试与校验

运行全部自动化测试与语法检查：

```bash
npm test
npm run check
```

---

## 📄 开源许可证

MIT © [GooDAnDReaDY](https://github.com/GooDAnDReaDY)

---

完整版本演进与更新记录详见 [CHANGELOG.md](CHANGELOG.md)。
