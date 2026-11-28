window.__ModuleLoader__.load({
  id: '@goodandready/dsh-dsml-artifact-guard',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const NS = '@goodandready/dsh-dsml-artifact-guard';
    const PKG = '@goodandready/dsh-dsml-artifact-guard';
    const ROW_ID = 'dsh-dsml-artifact-guard';
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID;
    const FALLBACK_VERSION = '0.2.21';
    function bestEffort(label, fn, fallback = undefined) {
      try {
        return fn();
      } catch (err) {
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug('[dsh-dsml-artifact-guard:bestEffort] ' + label + ':', err);
        }
        return fallback;
      }
    }
    function resolveApiUrl(path) {
      if (typeof window !== 'undefined' && window.__DSH_API_BASE__) {
        return String(window.__DSH_API_BASE__).replace(/\/+$/, '') + path;
      }
      return path;
    }
    let CoreChevron = null;
    bestEffort('load CoreChevron', () => {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
      CoreChevron = primitives && primitives.IconChevronDownOutline14;
    });
    const CHEVRON_DOWN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    const CHEVRON_UP_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';
    const STYLE_TAG_ID = 'dsh-dsml-guard-styles';
    let styleUsers = 0;
    let cardSequence = 0;
    const CARD_STYLES = '.dsh-dsml-artifact-guard-card button:focus-visible,.dsh-dsml-artifact-guard-card select:focus-visible,.dsh-dsml-artifact-guard-card input:focus-visible,.dsh-dsml-artifact-guard-card [role="button"]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,currentColor);outline-offset:2px}@media (prefers-reduced-motion:reduce){.dsh-dsml-chevron{transition:none!important}}';
    const en = {
      title: 'DSML Artifact Guard', sub: 'Sanitizes leaked terminal DSML protocol closing tags from model text streams',
      version: 'Version', updateChecking: 'Checking updates…', updateAvailable: 'Update available: v{v}',
      updateAvailableNoAuto: 'Update available: v{v} (auto-update unavailable)', upToDate: 'Up to date', upToDateManual: 'Up to date (managed externally)',
      updateNow: 'Update Now', updating: 'Updating…', updateSuccess: 'Updated to v{v}. Restart DSH service to apply changes.',
      updateFailed: 'Update failed: {msg}', checkUpdateFailed: 'Check failed (registry unavailable)',
      confirmUpdatePrompt: 'Installing update will restart DSH service. Continue?', confirmBtn: 'Confirm', cancelBtn: 'Cancel',
      mode: 'Operating Mode', modeSanitize: 'Sanitize (strip leaked closing tags)', modeAudit: 'Audit (log warnings only, preserve output)',
      modeDisabled: 'Disabled (bypass all streams)', modelPattern: 'Model Pattern (RegExp)',
      modelPatternHint: 'Case-insensitive RegExp matched against model IDs (e.g. deepseek, deepseek-v4.*). Default: deepseek.',
      providers: 'Target Providers (optional)', providersPlaceholder: 'all providers (comma-separated, e.g. commandcode, deepseek-official)',
      providersHint: 'Comma-separated list of provider IDs. Leave empty to guard all providers.',
      customTokens: 'Additional literal tokens (optional)', customTokensPlaceholder: '<|im_end|>, [TOOL_CALLS], <|eot_id|>',
      customTokensHint: 'Comma-separated literal tokens stripped from text outside code fences and inline code. 2–64 chars each, max 32 tokens.',
      cleanThinkArtifacts: 'Clean reasoning (<think>) artifacts & incomplete tokens',
      cleanThinkArtifactsHint: 'Strip orphan </think> tags, trailing reasoning markers, and incomplete closing tokens at stream finish.',
      salvageReasoning: 'Move leaked reasoning out of the answer into a reasoning block',
      salvageReasoningHint: 'When the model writes its thinking into the answer text, move that span into a reasoning block so the reply reads clean. Tags inside code fences and inline code are left untouched.',
      showTelemetry: 'Display Activity & Telemetry dashboard in settings', showTelemetryHint: 'Show live statistics of guarded responses and stripped tags.',
      telemetryTitle: 'Activity & Telemetry', telemetryGuarded: 'Guarded responses', telemetryDetected: 'Detected artifacts', telemetryRemoved: 'Stripped tags',
      telemetryLast: 'Last incident', telemetryNever: 'None yet', telemetryRefresh: 'Refresh', telemetryPolled: 'Last checked: {t}', telemetryLoadFailed: 'Load failed: {msg}',
      telemetryReset: 'Reset', telemetryResetting: 'Resetting…', telemetryResetPrompt: 'Reset statistics counters?', telemetryResetFailed: 'Reset failed: {msg}',
      telemetryRecent: 'Recent Incidents', telemetryNoRecent: 'No recent incidents recorded', telemetryShowLog: 'View incident log', telemetryHideLog: 'Hide incident log',
      legacyDetected: 'Legacy provider/model rule detected: active when either provider or model matches.', legacyClear: 'Clear legacy fields',
      providerId: 'Target Provider ID (legacy)', modelId: 'Target Model ID (legacy)',
      disabledNotice: '⚠️ Guard is currently disabled. DSML closing tags will reach the chat interface.',
      loading: 'Loading settings…', statusUnavailable: 'Settings service unavailable.',
      saving: 'Saving…', ready: 'Save Settings', saved: 'Settings saved', saveError: 'Save failed: {msg}',
    };
    const zh = {
      title: 'DSML 协议标签守卫', sub: '实时侦测并清洗模型文本流中泄漏的 DSML 协议末端闭合标签',
      version: '版本', updateChecking: '正在检查更新…', updateAvailable: '发现新版本: v{v}',
      updateAvailableNoAuto: '发现新版本: v{v}（当前运行环境不支持自动更新）', upToDate: '已是最新版本', upToDateManual: '已是最新版本（外部管理）',
      updateNow: '立即更新', updating: '正在更新…', updateSuccess: '已更新至 v{v}。请重启 DSH 服务以生效变更。',
      updateFailed: '更新失败: {msg}', checkUpdateFailed: '检查更新失败（无法连接到注册表）',
      confirmUpdatePrompt: '安装更新将重启 DSH 服务。是否继续？', confirmBtn: '确认', cancelBtn: '取消',
      mode: '运行模式', modeSanitize: 'Sanitize 清洗（自动剥除残留闭合标签）', modeAudit: 'Audit 审计（仅在日志记录警告，不修改正文）',
      modeDisabled: 'Disabled 禁用（直通所有数据流）', modelPattern: '模型正则匹配式 (RegExp)',
      modelPatternHint: '对模型 ID 进行不区分大小写的正则表达式匹配（默认：deepseek）。支持任意 DeepSeek 衍生模型。',
      providers: '限定模型供应商（可选）', providersPlaceholder: '所有供应商（逗号分隔，例如 commandcode, deepseek-official）',
      providersHint: '限制守卫规则仅对特定供应商生效。留空则保护所有供应商。',
      customTokens: '附加字面量标记（可选）', customTokensPlaceholder: '<|im_end|>, [TOOL_CALLS], <|eot_id|>',
      customTokensHint: '以逗号分隔的字面量标记，仅在代码块与行内代码之外移除。每个 2–64 个字符，最多 32 个。',
      cleanThinkArtifacts: '清洗思考过程 (<think>) 残留与截断标记',
      cleanThinkArtifactsHint: '剥离流中泄漏的 </think> 孤立标签、尾随的思考过程特殊标记及未闭合截断标签。',
      salvageReasoning: '把写进正文的思考搬回 reasoning 通道',
      salvageReasoningHint: '模型把思考过程写进正文时，将这一段整体迁到 reasoning 区块，正文回复不再夹杂推理。代码围栏与行内代码内的标签保持原样。',
      showTelemetry: '在设置中显示活动与遥测仪表盘', showTelemetryHint: '展示受保护会话计数与已清洗标签统计。',
      telemetryTitle: '活动与遥测统计', telemetryGuarded: '受保护响应数', telemetryDetected: '检测到的伪影', telemetryRemoved: '已清洗标签数',
      telemetryLast: '最近拦截事件', telemetryNever: '暂无记录', telemetryRefresh: '刷新', telemetryPolled: '最近检查: {t}', telemetryLoadFailed: '加载失败: {msg}',
      telemetryReset: '重置统计', telemetryResetting: '重置中…', telemetryResetPrompt: '确定重置统计计数器吗？', telemetryResetFailed: '重置失败: {msg}',
      telemetryRecent: '最近拦截记录', telemetryNoRecent: '暂无拦截记录', telemetryShowLog: '展开拦截日志', telemetryHideLog: '收起拦截日志',
      legacyDetected: '检测到旧版 providerId / modelId 规则：任一字段匹配时生效。', legacyClear: '清除旧版配置项',
      providerId: '目标供应商 ID（旧版）', modelId: '目标模型 ID（旧版）',
      disabledNotice: '⚠️ 守卫当前处于禁用状态。泄漏的 DSML 闭合标签将直接进入聊天界面。',
      loading: '正在加载设置…', statusUnavailable: '设置服务暂不可用。',
      saving: '正在保存…', ready: '保存设置', saved: '设置已保存', saveError: '保存失败: {msg}',
    };
    const DEFAULTS = {
      mode: 'sanitize', modelPattern: 'deepseek', providers: '', customTokens: '',
      cleanThinkArtifacts: false, salvageReasoning: false, showTelemetry: true, providerId: '', modelId: '',
    };
    const C = {
      primary: 'var(--dsw-alias-label-primary, inherit)', secondary: 'var(--dsw-alias-label-secondary, currentColor)',
      tertiary: 'var(--dsw-alias-label-tertiary, currentColor)', border: 'var(--dsw-alias-border-l2, transparent)',
      cardBg: 'var(--dsw-alias-bg-elevated, transparent)', brand: 'var(--dsw-alias-brand-primary, currentColor)',
      panelBg: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)',
      danger: 'var(--dsw-alias-state-danger-primary, currentColor)', warning: 'var(--dsw-alias-state-warning-primary, currentColor)',
      success: 'var(--dsw-alias-state-success-primary, currentColor)',
    };
    const S = {
      panel: { padding: '10px 12px', borderRadius: 8, background: C.panelBg, border: '1px solid ' + C.border },
      rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
      statCell: { display: 'flex', flexDirection: 'column', gap: 2, padding: '6px 8px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 2%, transparent)' },
      banner: (c) => ({ padding: '8px 12px', borderRadius: 6, fontSize: 13, background: 'color-mix(in srgb, ' + c + ' 10%, transparent)', border: '1px solid color-mix(in srgb, ' + c + ' 25%, transparent)', color: c, marginTop: 8 }),
      pill: (c, hollow) => ({ display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600, border: '1px solid ' + c, background: hollow ? 'transparent' : 'color-mix(in srgb, ' + c + ' 15%, transparent)', color: c }),
      btnPrimary: (dis) => ({ padding: '6px 12px', borderRadius: 6, border: 'none', background: C.brand, color: 'var(--dsw-alias-label-on-color, var(--dsw-alias-label-primary))', fontSize: 12, fontWeight: 500, cursor: dis ? 'default' : 'pointer', opacity: dis ? 0.6 : 1 }),
      btnGhost: (c) => ({ padding: '3px 8px', borderRadius: 4, fontSize: 11, border: '1px solid ' + c, background: 'transparent', color: c, cursor: 'pointer' }),
      fieldCol: { display: 'flex', flexDirection: 'column', gap: 4 },
      label: { fontSize: 13, fontWeight: 500, color: C.primary },
      hint: { fontSize: 11, color: C.tertiary, lineHeight: '1.4' },
      input: { padding: '6px 10px', borderRadius: 6, border: '1px solid ' + C.border, background: 'var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))', color: C.primary, fontSize: 13, outline: 'none' },
    };
    function resolveLang(ctx) {
      if (!ctx) return 'en';
      let active = '';
      bestEffort('resolveLang', () => {
        if (typeof ctx.locale?.getSnapshot === 'function') active = ctx.locale.getSnapshot()?.active;
        else if (typeof ctx.locale?.getLocale === 'function') active = ctx.locale.getLocale()?.active;
        else if (typeof ctx.locale?.locale === 'string') active = ctx.locale.locale;
      });
      return (active && active.toLowerCase().startsWith('zh')) ? 'zh' : 'en';
    }
    function createTranslator(t, dict) {
      return (key, params) => {
        let str = null;
        if (typeof t === 'function') {
          str = bestEffort('translate key ' + key, () => t(key, params));
        }
        if (typeof str !== 'string' || str === key) {
          str = dict[key] || en[key] || key;
        }
        if (params && typeof params === 'object') {
          for (const [pk, pv] of Object.entries(params)) {
            str = str.replace(new RegExp('\\{' + pk + '\\}', 'g'), String(pv));
          }
        }
        return str;
      };
    }
    function formatTime(iso, fallbackText) {
      if (!iso) return fallbackText;
      return bestEffort('formatTime', () => {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? fallbackText : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }, fallbackText);
    }
    const el = React.createElement;
    function useInstanceId() {
      const ref = React.useRef(null);
      if (ref.current === null) ref.current = 'dsh-dsml-' + (++cardSequence);
      return ref.current;
    }
    function PluginCard({ ctx: _ctx, t, bare }) {
      const [expanded, setExpanded] = React.useState(false);
      const [draft, setDraft] = React.useState(DEFAULTS);
      const [status, setStatus] = React.useState('loading');
      const [saving, setSaving] = React.useState(false);
      const [msg, setMsg] = React.useState('');
      const [showRecentLog, setShowRecentLog] = React.useState(false);
      const [telemetry, setTelemetry] = React.useState({ totalDetected: 0, totalCleaned: 0, sessionsGuarded: 0, lastCleanedAt: null, lastModel: null, lastProvider: null, recent: [], resetting: false, resetError: '', loadError: '', confirmingReset: false, lastPolledAt: null });
      const [updateState, setUpdateState] = React.useState({ checking: false, updateAvailable: false, canAutoUpdate: true, latestCheckFailed: false, currentVersion: FALLBACK_VERSION, latestVersion: '', updating: false, confirmingUpdate: false, notice: '', error: '' });
      const saveTimerRef = React.useRef(null);
      const uid = useInstanceId(); const fid = (name) => uid + '-' + name;
      const scope = React.useMemo(() => {
        if (!_ctx) return null;
        return bestEffort('resolveScope', () => {
          if (_ctx.configForms && typeof _ctx.configForms.get === 'function') return _ctx.configForms.get(ROW_ID);
          if (_ctx.settingsScope && typeof _ctx.settingsScope.bind === 'function') return _ctx.settingsScope.bind({ namespace: ROW_ID });
          return null;
        }, null);
      }, [_ctx]);
      const currentLang = resolveLang(_ctx);
      const dict = currentLang === 'zh' ? zh : en;
      const tBound = React.useMemo(() => {
        if (typeof t === 'function') return t;
        if (typeof _ctx?.locale?.bind === 'function') {
          return bestEffort('bindLocale', () => _ctx.locale.bind(NS), null);
        }
        return null;
      }, [t, _ctx]);
      const tt = createTranslator(tBound, dict);
      React.useEffect(() => {
        let styleNode = null;
        bestEffort('injectStyles', () => {
          if (typeof document === 'undefined') return;
          styleNode = document.getElementById(STYLE_TAG_ID);
          if (styleNode) { styleUsers += 1; return; }
          styleNode = document.createElement('style');
          styleNode.id = STYLE_TAG_ID;
          styleNode.setAttribute('data-dsh-plugin', NS);
          styleNode.textContent = CARD_STYLES;
          document.head.appendChild(styleNode);
          styleUsers += 1;
        });
        return () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          bestEffort('removeStyles', () => {
            if (!styleNode) return;
            styleUsers = Math.max(0, styleUsers - 1);
            if (styleUsers === 0 && styleNode.parentNode) styleNode.parentNode.removeChild(styleNode);
          });
        };
      }, []);
      React.useEffect(() => {
        if (!scope) { setStatus('unavailable'); return; }
        let cancelled = false;
        const syncSnapshot = (snap) => {
          if (!snap || cancelled) return;
          const view = snap.view || snap.value || snap;
          if (typeof snap === 'object' && 'status' in snap && snap.status !== 'ready') {
            setStatus(snap.status);
            return;
          }
          if (typeof view === 'object' && view !== null) {
            setDraft({
              mode: view.mode || DEFAULTS.mode,
              modelPattern: view.modelPattern !== undefined ? String(view.modelPattern) : DEFAULTS.modelPattern,
              providers: Array.isArray(view.providers) ? view.providers.join(', ') : (typeof view.providers === 'string' ? view.providers : ''),
              customTokens: Array.isArray(view.customTokens) ? view.customTokens.join(', ') : (typeof view.customTokens === 'string' ? view.customTokens : ''),
              cleanThinkArtifacts: Boolean(view.cleanThinkArtifacts),
              salvageReasoning: Boolean(view.salvageReasoning),
              showTelemetry: view.showTelemetry !== undefined ? Boolean(view.showTelemetry) : true,
              providerId: view.providerId ? String(view.providerId) : '',
              modelId: view.modelId ? String(view.modelId) : '',
            });
          }
          setStatus('ready');
        };
        (async () => {
          try {
            const snap = typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : (typeof scope.get === 'function' ? await scope.get() : null);
            syncSnapshot(snap);
          } catch (err) {
            if (!cancelled) setStatus('unavailable');
          }
        })();
        let unsubscribe;
        if (typeof scope.subscribe === 'function') {
          bestEffort('subscribeScope', () => {
            unsubscribe = scope.subscribe(() => {
              bestEffort('syncSnapshotOnEvent', () => syncSnapshot(typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : null));
            });
          });
        }
        return () => { cancelled = true; if (typeof unsubscribe === 'function') unsubscribe(); };
      }, [scope]);
      const loadTelemetry = async (isCancelled = () => false) => {
        try {
          const res = await fetch(resolveApiUrl('/api/dsh-dsml-artifact-guard/stats'));
          if (!res.ok || isCancelled()) {
            if (!res.ok && !isCancelled()) setTelemetry(s => ({ ...s, loadError: 'HTTP ' + res.status }));
            return;
          }
          const data = await res.json();
          if (isCancelled()) return;
          setTelemetry(prev => ({
            ...prev,
            totalDetected: data.totalDetected || 0,
            totalCleaned: data.totalCleaned || 0,
            sessionsGuarded: data.sessionsGuarded || 0,
            lastCleanedAt: data.lastCleanedAt || null,
            lastModel: data.lastModel || null,
            lastProvider: data.lastProvider || null,
            recent: Array.isArray(data.recent) ? data.recent : [],
            loadError: '',
            lastPolledAt: new Date().toISOString(),
          }));
        } catch (e) {
          if (!isCancelled()) setTelemetry(s => ({ ...s, loadError: e.message || String(e) }));
        }
      };
      React.useEffect(() => {
        let cancelled = false;
        if (expanded && draft.showTelemetry) {
          loadTelemetry(() => cancelled);
          const interval = setInterval(() => loadTelemetry(() => cancelled), 15000);
          return () => { cancelled = true; clearInterval(interval); };
        }
        return () => { cancelled = true; };
      }, [expanded, draft.showTelemetry]);
      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            setUpdateState(s => ({ ...s, checking: true, error: '' }));
            const res = await fetch(resolveApiUrl('/api/dsh-dsml-artifact-guard/update'));
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            if (!cancelled) {
              const failed = !!data.latestCheckFailed || data.latestVersion === undefined;
              const canAuto = data.canAutoUpdate !== false;
              setUpdateState(s => ({
                ...s,
                checking: false,
                currentVersion: data.currentVersion || s.currentVersion,
                latestVersion: data.latestVersion || '',
                latestCheckFailed: failed,
                canAutoUpdate: canAuto,
                updateAvailable: !failed && !!data.updateAvailable,
                error: failed ? tt('checkUpdateFailed') : '',
              }));
            }
          } catch (err) {
            if (!cancelled) {
              setUpdateState(s => ({ ...s, checking: false, latestCheckFailed: true, error: tt('checkUpdateFailed') }));
            }
          }
        })();
        return () => { cancelled = true; };
      }, []);
      const onResetTelemetry = async () => {
        if (telemetry.resetting) return;
        setTelemetry(s => ({ ...s, resetting: true, resetError: '', confirmingReset: false }));
        try {
          const res = await fetch(resolveApiUrl('/api/dsh-dsml-artifact-guard/stats'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-plugin-stats': '1' } });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const u = data.stats || {};
          setTelemetry({ totalDetected: u.totalDetected || 0, totalCleaned: u.totalCleaned || 0, sessionsGuarded: u.sessionsGuarded || 0, lastCleanedAt: u.lastCleanedAt || null, lastModel: u.lastModel || null, lastProvider: u.lastProvider || null, recent: Array.isArray(u.recent) ? u.recent : [], resetting: false, resetError: '', loadError: '', confirmingReset: false, lastPolledAt: new Date().toISOString() });
        } catch (e) {
          setTelemetry(s => ({ ...s, resetting: false, resetError: tt('telemetryResetFailed', { msg: e.message || String(e) }), confirmingReset: false }));
        }
      };
      const onTriggerUpdate = async () => {
        if (updateState.updating) return;
        setUpdateState(s => ({ ...s, updating: true, error: '', notice: '', confirmingUpdate: false }));
        try {
          const res = await fetch(resolveApiUrl('/api/dsh-dsml-artifact-guard/update'), { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-plugin-update': '1' } });
          const data = await res.json();
          if (!res.ok || data.ok === false || (data.error && !data.updated)) throw new Error(data.error || 'HTTP ' + res.status);
          if (data.updated === false) {
            setUpdateState(s => ({ ...s, updating: false, updateAvailable: false, notice: tt('upToDate') }));
            return;
          }
          const nextVer = data.updatedVersion || updateState.latestVersion;
          setUpdateState(s => ({ ...s, updating: false, updateAvailable: false, currentVersion: nextVer, notice: tt('updateSuccess', { v: nextVer }) }));
        } catch (err) {
          setUpdateState(s => ({ ...s, updating: false, error: tt('updateFailed', { msg: err.message || String(err) }) }));
        }
      };
      const onSave = async () => {
        if (!scope || saving) return;
        setSaving(true);
        setMsg('');
        try {
          const entries = [
            ['mode', draft.mode || 'sanitize'],
            ['modelPattern', (draft.modelPattern !== undefined && draft.modelPattern !== null) ? String(draft.modelPattern).trim() : 'deepseek'],
            ['providers', draft.providers ? draft.providers.split(',').map(s => s.trim()).filter(Boolean) : []],
            ['customTokens', draft.customTokens ? String(draft.customTokens).split(',').map(s => s.trim()).filter(Boolean) : []],
            ['cleanThinkArtifacts', Boolean(draft.cleanThinkArtifacts)],
            ['salvageReasoning', Boolean(draft.salvageReasoning)],
            ['showTelemetry', Boolean(draft.showTelemetry)],
            ['providerId', draft.providerId ? String(draft.providerId).trim() : ''],
            ['modelId', draft.modelId ? String(draft.modelId).trim() : ''],
          ];
          const failures = [];
          for (const [key, val] of entries) {
            try { await scope.set(key, val); } catch (err) { failures.push(key + ': ' + (err.message || String(err))); }
          }
          if (failures.length > 0) {
            setMsg(tt('saveError', { msg: failures.join(', ') }));
          } else {
            setMsg(tt('saved'));
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => setMsg(''), 3000);
          }
        } catch (err) {
          setMsg(tt('saveError', { msg: err.message || String(err) }));
        } finally {
          setSaving(false);
        }
      };
      const isDisabled = draft.mode === 'disabled';
      const toggleExpanded = () => setExpanded(v => !v);
      const header = el('div', {
        id: fid('header'), role: 'button', tabIndex: 0,
        'aria-expanded': expanded, 'aria-controls': fid('body'),
        onClick: toggleExpanded,
        onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpanded(); } },
        style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' },
      },
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            el('span', { style: { fontSize: 16 } }, '🛡️'),
            el('span', { style: { fontSize: 15, fontWeight: 600, color: C.primary } }, tt('title')),
            el('span', { style: S.pill(C.brand, false) }, 'v' + updateState.currentVersion),
            isDisabled && el('span', { style: S.pill(C.danger, true) }, 'OFF')
          ),
          el('span', { style: { fontSize: 13, color: C.secondary } }, tt('sub'))
        ),
        el('div', { style: { display: 'flex', alignItems: 'center', color: C.tertiary } },
          CoreChevron
            ? el(CoreChevron, { className: 'dsh-dsml-chevron', style: { transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } })
            : el('span', { className: 'dsh-dsml-chevron', dangerouslySetInnerHTML: { __html: expanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG } })
        )
      );
      const renderUpdateStatus = () => {
        if (updateState.checking) return el('span', { style: { color: C.tertiary, fontSize: 12 } }, tt('updateChecking'));
        if (updateState.latestCheckFailed) return el('span', { style: { color: C.danger, fontSize: 12, fontWeight: 500 } }, '⚠️ ' + tt('checkUpdateFailed'));
        if (updateState.updateAvailable) {
          const txt = updateState.canAutoUpdate ? tt('updateAvailable', { v: updateState.latestVersion }) : tt('updateAvailableNoAuto', { v: updateState.latestVersion });
          return el('span', { style: { color: C.warning, fontWeight: 600, fontSize: 12 } }, txt);
        }
        const okTxt = updateState.canAutoUpdate ? '✓ ' + tt('upToDate') : '✓ ' + tt('upToDateManual');
        return el('span', { style: { color: C.success, fontSize: 12 } }, okTxt);
      };
      const updaterBlock = el('div', { style: { ...S.panel, display: 'flex', flexDirection: 'column', gap: 8, margin: '14px 0' } },
        el('div', { style: S.rowBetween },
          el('div', { style: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } },
            el('span', { style: { color: C.secondary } }, tt('version') + ': ' + updateState.currentVersion),
            renderUpdateStatus()
          ),
          updateState.updateAvailable && updateState.canAutoUpdate && !updateState.confirmingUpdate && el('button', {
            type: 'button', onClick: () => setUpdateState(s => ({ ...s, confirmingUpdate: true })),
            disabled: updateState.updating, style: S.btnPrimary(updateState.updating),
          }, updateState.updating ? tt('updating') : tt('updateNow'))
        ),
        updateState.confirmingUpdate && el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-state-warning-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary) 30%, transparent)' } },
          el('span', { style: { fontSize: 12, color: C.warning } }, tt('confirmUpdatePrompt')),
          el('div', { style: { display: 'flex', gap: 6 } },
            el('button', { type: 'button', onClick: onTriggerUpdate, disabled: updateState.updating, style: { ...S.btnPrimary(updateState.updating), padding: '3px 8px', fontSize: 11 } }, tt('confirmBtn')),
            el('button', { type: 'button', onClick: () => setUpdateState(s => ({ ...s, confirmingUpdate: false })), style: S.btnGhost(C.secondary) }, tt('cancelBtn'))
          )
        ),
        updateState.error && el('span', { style: { color: C.danger, fontSize: 12 } }, updateState.error)
      );
      const statItem = (label, value, color) => el('div', { style: S.statCell },
        el('span', { style: { fontSize: 11, color: C.tertiary } }, label),
        el('span', { style: { fontSize: color === C.secondary ? 13 : 15, fontWeight: color === C.secondary ? 500 : 600, color } }, value)
      );
      const telemetryBlock = draft.showTelemetry && el('div', { style: { ...S.panel, display: 'flex', flexDirection: 'column', gap: 8 } },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
          el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            el('span', { style: { fontSize: 12, fontWeight: 600, color: C.primary } }, '📊 ' + tt('telemetryTitle')),
            telemetry.lastPolledAt && el('span', { style: { fontSize: 10, color: C.tertiary } }, tt('telemetryPolled', { t: formatTime(telemetry.lastPolledAt, '') }))
          ),
          el('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
            (telemetry.loadError || telemetry.resetError) && el('span', { style: { fontSize: 11, color: C.danger } }, telemetry.loadError ? tt('telemetryLoadFailed', { msg: telemetry.loadError }) : telemetry.resetError),
            el('button', { type: 'button', onClick: () => loadTelemetry(), style: S.btnGhost(C.brand) }, tt('telemetryRefresh')),
            !telemetry.confirmingReset && el('button', {
              type: 'button', onClick: () => setTelemetry(s => ({ ...s, confirmingReset: true })),
              disabled: telemetry.resetting, style: S.btnGhost(C.secondary),
            }, telemetry.resetting ? tt('telemetryResetting') : tt('telemetryReset'))
          )
        ),
        telemetry.confirmingReset && el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-state-warning-primary) 10%, transparent)' } },
          el('span', { style: { fontSize: 11, color: C.warning } }, tt('telemetryResetPrompt')),
          el('div', { style: { display: 'flex', gap: 6 } },
            el('button', { type: 'button', onClick: onResetTelemetry, disabled: telemetry.resetting, style: { ...S.btnPrimary(telemetry.resetting), padding: '2px 8px', fontSize: 11 } }, tt('confirmBtn')),
            el('button', { type: 'button', onClick: () => setTelemetry(s => ({ ...s, confirmingReset: false })), style: S.btnGhost(C.secondary) }, tt('cancelBtn'))
          )
        ),
        el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 } },
          statItem(tt('telemetryGuarded'), String(telemetry.sessionsGuarded), C.primary),
          statItem(tt('telemetryDetected'), String(telemetry.totalDetected), C.secondary),
          statItem(tt('telemetryRemoved'), String(telemetry.totalCleaned), C.brand),
          statItem(tt('telemetryLast'), formatTime(telemetry.lastCleanedAt, tt('telemetryNever')), C.secondary)
        ),
        telemetry.recent.length > 0 && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 50%, transparent)' } },
          el('button', { type: 'button', onClick: () => setShowRecentLog(v => !v), style: { background: 'transparent', border: 0, padding: 0, fontSize: 11, color: C.brand, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' } }, showRecentLog ? tt('telemetryHideLog') : tt('telemetryShowLog') + ' (' + telemetry.recent.length + ')'),
          showRecentLog && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' } },
            telemetry.recent.map(ev => el('div', { key: ev.id, style: { padding: '4px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)', color: C.secondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 } },
              el('span', null, formatTime(ev.timestamp, tt('telemetryNever')) + (ev.model ? ' [' + ev.model + ']' : '')),
              el('span', { style: { color: C.warning, fontWeight: 600 } }, (ev.removed > 0 ? '-' + ev.removed : '~') + ' ' + ev.type)
            ))
          )
        )
      );
      const settingsForm = status === 'ready' && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        el('div', { style: S.fieldCol },
          el('label', { htmlFor: fid('mode'), style: S.label }, tt('mode')),
          el('select', { id: fid('mode'), value: draft.mode, onChange: (e) => setDraft(d => ({ ...d, mode: e.target.value })), style: S.input },
            el('option', { value: 'sanitize' }, tt('modeSanitize')),
            el('option', { value: 'audit' }, tt('modeAudit')),
            el('option', { value: 'disabled' }, tt('modeDisabled'))
          )
        ),
        el('div', { style: S.fieldCol },
          el('label', { htmlFor: fid('model-pattern'), style: S.label }, tt('modelPattern')),
          el('input', { id: fid('model-pattern'), type: 'text', value: draft.modelPattern, placeholder: 'deepseek', onChange: (e) => setDraft(d => ({ ...d, modelPattern: e.target.value })), style: S.input }),
          el('span', { style: S.hint }, tt('modelPatternHint'))
        ),
        el('div', { style: S.fieldCol },
          el('label', { htmlFor: fid('providers'), style: S.label }, tt('providers')),
          el('input', { id: fid('providers'), type: 'text', value: draft.providers, placeholder: tt('providersPlaceholder'), onChange: (e) => setDraft(d => ({ ...d, providers: e.target.value })), style: S.input }),
          el('span', { style: S.hint }, tt('providersHint'))
        ),
        el('div', { style: S.fieldCol },
          el('label', { htmlFor: fid('custom-tokens'), style: S.label }, tt('customTokens')),
          el('input', { id: fid('custom-tokens'), type: 'text', value: draft.customTokens, placeholder: tt('customTokensPlaceholder'), onChange: (e) => setDraft(d => ({ ...d, customTokens: e.target.value })), style: S.input }),
          el('span', { style: S.hint }, tt('customTokensHint'))
        ),
        el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)', border: '1px solid ' + C.border } },
          el('input', { type: 'checkbox', id: fid('clean-think'), checked: draft.cleanThinkArtifacts, onChange: (e) => setDraft(d => ({ ...d, cleanThinkArtifacts: e.target.checked })), style: { marginTop: 2, cursor: 'pointer' } }),
          el('label', { htmlFor: fid('clean-think'), style: { display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' } },
            el('span', { style: S.label }, tt('cleanThinkArtifacts')),
            el('span', { style: S.hint }, tt('cleanThinkArtifactsHint'))
          )
        ),
        el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)', border: '1px solid ' + C.border } },
          el('input', { type: 'checkbox', id: fid('salvage-reasoning'), checked: draft.salvageReasoning, onChange: (e) => setDraft(d => ({ ...d, salvageReasoning: e.target.checked })), style: { marginTop: 2, cursor: 'pointer' } }),
          el('label', { htmlFor: fid('salvage-reasoning'), style: { display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' } },
            el('span', { style: S.label }, tt('salvageReasoning')),
            el('span', { style: S.hint }, tt('salvageReasoningHint'))
          )
        ),
        el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)', border: '1px solid ' + C.border } },
          el('input', { type: 'checkbox', id: fid('show-telemetry'), checked: draft.showTelemetry, onChange: (e) => setDraft(d => ({ ...d, showTelemetry: e.target.checked })), style: { marginTop: 2, cursor: 'pointer' } }),
          el('label', { htmlFor: fid('show-telemetry'), style: { display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' } },
            el('span', { style: S.label }, tt('showTelemetry')),
            el('span', { style: S.hint }, tt('showTelemetryHint'))
          )
        ),
        (draft.providerId || draft.modelId) && el('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-state-warning-primary) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--dsw-alias-state-warning-primary) 25%, transparent)', fontSize: 12, color: C.secondary } },
          el('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
            el('span', null, tt('legacyDetected')),
            el('span', { style: { fontFamily: 'monospace', fontSize: 11 } }, (draft.providerId ? 'provider: ' + draft.providerId : '') + (draft.providerId && draft.modelId ? ' | ' : '') + (draft.modelId ? 'model: ' + draft.modelId : ''))
          ),
          el('button', { type: 'button', onClick: () => setDraft(d => ({ ...d, providerId: '', modelId: '' })), style: { background: 'transparent', border: 'none', color: C.brand, fontSize: 11, cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', padding: '2px 4px' } }, tt('legacyClear'))
        ),
        el('div', { style: { display: 'flex', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid ' + C.border, marginTop: 4 } },
          el('button', { type: 'button', onClick: onSave, disabled: saving || status !== 'ready', style: { ...S.btnPrimary(saving), height: 34, padding: '0 18px', borderRadius: 8, fontSize: 13 } }, saving ? tt('saving') : tt('ready')),
          msg && el('span', { style: { fontSize: 13, color: msg === tt('saved') ? C.success : C.danger } }, msg)
        )
      );
      const body = el('div', { id: fid('body'), hidden: !bare && !expanded ? true : undefined, style: { padding: bare ? '0' : '0 16px 16px', borderTop: bare ? 'none' : '1px solid ' + C.border } },
        updaterBlock,
        updateState.notice && el('div', { style: S.banner(C.success) }, updateState.notice),
        telemetryBlock,
        isDisabled && el('div', { style: S.banner(C.danger) }, tt('disabledNotice')),
        status === 'loading' && el('div', { style: { padding: '16px 0', fontSize: 13, color: C.tertiary } }, tt('loading')),
        status === 'unavailable' && el('div', { style: { padding: '16px 0', fontSize: 13, color: C.danger } }, tt('statusUnavailable')),
        settingsForm
      );
      if (bare) return el('div', { 'data-dsh-plugin': NS, className: 'dsh-dsml-artifact-guard-form' }, body);
      return el('div', { 'data-dsh-plugin': NS, className: 'dsh-dsml-artifact-guard-card', style: { borderRadius: 12, border: '1px solid ' + C.border, background: C.cardBg, overflow: 'hidden', marginBottom: 12 } },
        header,
        body
      );
    }
    function PluginItem(props) {
      if (props && props.view === 'summary') {
        const lang = resolveLang(props.ctx);
        const dict = lang === 'zh' ? zh : en;
        const tBind = (props.ctx && typeof props.ctx.locale?.bind === 'function') ? props.ctx.locale.bind(NS) : null;
        const tt = createTranslator(typeof props.t === 'function' ? props.t : tBind, dict);
        return el('div', { 'data-dsh-plugin': NS, className: 'dsh-dsml-artifact-guard-sub', style: { fontSize: 13, color: C.secondary } }, tt('sub'));
      }
      return el(PluginCard, Object.assign({}, props, { bare: true }));
    }
    exports.inject = ['slots', 'configForms', 'locale'];
    exports.resolveApiUrl = resolveApiUrl;
    exports.apply = function apply(ctx) {
      if (typeof ctx.locale?.register === 'function') {
        const registerLocale = () => bestEffort('registerLocale', () => ctx.locale.register(NS, { en, zh }));
        if (typeof ctx.effect === 'function') ctx.effect(registerLocale, 'dsh-dsml-artifact-guard: locale');
        else registerLocale();
      }
      function registerSlotWhenReady(slotName, registerFn) {
        if (!ctx.slots) return;
        if (typeof ctx.slots.inject === 'function') {
          bestEffort('injectSlot ' + slotName, () => {
            ctx.slots.inject(slotName, () => {
              bestEffort('callSlotRegister ' + slotName, () => registerFn());
            });
          });
          return;
        }
        if (typeof ctx.slots.register === 'function') {
          bestEffort('directSlotRegister ' + slotName, () => registerFn());
        }
      }
      registerSlotWhenReady('plugins.row.config', () =>
        ctx.slots.register({ name: 'plugins.row.config', key: ROW_CONFIG_KEY, locale: NS, inject: () => ({ ctx }) }, PluginItem)
      );
      registerSlotWhenReady('plugins.item', () =>
        ctx.slots.register({ name: 'plugins.item', id: 'dsh-dsml-artifact-guard', order: 95, label: () => 'DSML Artifact Guard', locale: NS, inject: () => ({ ctx }) }, PluginItem)
      );
    };
    return module.exports;
  },
});
