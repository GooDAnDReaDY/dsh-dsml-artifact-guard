window.__ModuleLoader__.load({
  id: '@goodandready/dsh-dsml-artifact-guard',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    const React = require('react');
    const NS = '@goodandready/dsh-dsml-artifact-guard';
    // Row seat (#31): keep package name, patch row id, and row config key aligned.
    const PKG = '@goodandready/dsh-dsml-artifact-guard';
    const ROW_ID = 'dsh-dsml-artifact-guard';
    const ROW_CONFIG_KEY = PKG + '#' + ROW_ID;
    const FALLBACK_VERSION = '0.2.16';

    let CoreChevron = null;
    try {
      const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
      CoreChevron = primitives && primitives.IconChevronDownOutline14;
    } catch (e) {
      /* Optional core chevron primitive not available; SVG fallback used */
    }

    const CHEVRON_DOWN_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>';
    const CHEVRON_UP_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"></polyline></svg>';

    const en = {
      title: 'DSML Artifact Guard',
      sub: 'Sanitizes leaked terminal DSML protocol closing tags from model text streams',
      version: 'Version',
      updateChecking: 'Checking updates…',
      updateAvailable: 'Update available: v{v}',
      upToDate: 'Up to date',
      updateNow: 'Update Now',
      updating: 'Updating…',
      updateSuccess: 'Updated to v{v}. Restart DSH service to apply changes.',
      updateFailed: 'Update failed: {msg}',
      checkUpdateFailed: 'Check failed',
      mode: 'Operating Mode',
      modeSanitize: 'Sanitize (strip leaked closing tags)',
      modeAudit: 'Audit (log warnings only, preserve output)',
      modeDisabled: 'Disabled (bypass all streams)',
      modelPattern: 'Model Pattern (RegExp)',
      modelPatternHint: 'Case-insensitive RegExp matched against model IDs (e.g. deepseek, deepseek-v4.*). Default: deepseek.',
      providers: 'Target Providers (optional)',
      providersPlaceholder: 'all providers (comma-separated, e.g. commandcode, deepseek-official)',
      providersHint: 'Comma-separated list of provider IDs. Leave empty to guard all providers.',
      cleanThinkArtifacts: 'Clean reasoning (<think>) artifacts & incomplete tokens',
      cleanThinkArtifactsHint: 'Strip orphan </think> tags, trailing reasoning markers, and incomplete closing tokens at stream finish.',
      telemetryTitle: 'Activity & Telemetry',
      telemetryGuarded: 'Guarded responses',
      telemetryRemoved: 'Stripped tags',
      telemetryLast: 'Last incident',
      telemetryNever: 'None yet',
      telemetryReset: 'Reset',
      telemetryResetting: 'Resetting…',
      telemetryResetFailed: 'Reset failed',
      telemetryRecent: 'Recent Incidents',
      telemetryNoRecent: 'No recent incidents recorded',
      telemetryShowLog: 'View incident log',
      telemetryHideLog: 'Hide incident log',
      legacyDetected: 'Legacy providerId / modelId detected: active as an additional rule.',
      legacyClear: 'Clear legacy fields',
      providerId: 'Target Provider ID (legacy)',
      modelId: 'Target Model ID (legacy)',
      disabledNotice: '⚠️ Guard is currently disabled. DSML closing tags will reach the chat interface.',
      loading: 'Loading settings…',
      statusUnavailable: 'Settings service unavailable.',
      saving: 'Saving…',
      ready: 'Save Settings',
      saved: 'Settings saved',
      saveError: 'Save failed: {msg}',
    };

    const zh = {
      title: 'DSML 协议标签守卫',
      sub: '实时侦测并清洗模型文本流中泄漏的 DSML 协议末端闭合标签',
      version: '版本',
      updateChecking: '正在检查更新…',
      updateAvailable: '发现新版本: v{v}',
      upToDate: '已是最新版本',
      updateNow: '立即更新',
      updating: '正在更新…',
      updateSuccess: '已更新至 v{v}。请重启 DSH 服务以生效变更。',
      updateFailed: '更新失败: {msg}',
      checkUpdateFailed: '检查更新失败',
      mode: '运行模式',
      modeSanitize: 'Sanitize 清洗（自动剥除残留闭合标签）',
      modeAudit: 'Audit 审计（仅在日志记录警告，不修改正文）',
      modeDisabled: 'Disabled 禁用（直通所有数据流）',
      modelPattern: '模型正则匹配式 (RegExp)',
      modelPatternHint: '对模型 ID 进行不区分大小写的正则表达式匹配（默认：deepseek）。支持任意服务商前缀。',
      providers: '目标服务商（可选）',
      providersPlaceholder: '所有服务商（以逗号分隔，例如 commandcode, deepseek-official）',
      providersHint: '服务商 ID 列表（逗号分隔）。留空则拦截所有服务商。',
      cleanThinkArtifacts: '清洗思维链 (<think>) 残留与末端残缺标记',
      cleanThinkArtifactsHint: '自动剥除游离的 </think> 闭合标签、末端思维标记，并在流异常中断时清理残缺协议标记。',
      telemetryTitle: '运行遥测与拦截统计',
      telemetryGuarded: '已防护应答',
      telemetryRemoved: '已剥除标签',
      telemetryLast: '最近拦截',
      telemetryNever: '暂无记录',
      telemetryReset: '重置统计',
      telemetryResetting: '正在重置…',
      telemetryResetFailed: '重置失败',
      telemetryRecent: '最近拦截记录',
      telemetryNoRecent: '暂无拦截记录',
      telemetryShowLog: '查看记录',
      telemetryHideLog: '收起记录',
      legacyDetected: '检测到旧版 providerId / modelId：将作为附加规则生效。',
      legacyClear: '清除旧版配置',
      providerId: '目标服务商 ID（旧版）',
      modelId: '目标模型 ID（旧版）',
      disabledNotice: '⚠️ 守卫当前处于禁用状态。DSML 闭合标签将直接进入聊天界面。',
      loading: '正在加载设置…',
      statusUnavailable: '设置服务不可用。',
      saving: '正在保存…',
      ready: '保存设置',
      saved: '设置已保存',
      saveError: '保存失败: {msg}',
    };

    const DEFAULTS = {
      mode: 'sanitize',
      modelPattern: 'deepseek',
      providers: '',
      cleanThinkArtifacts: false,
      providerId: '',
      modelId: '',
    };

    const C = {
      primary: 'var(--dsw-alias-label-primary)',
      secondary: 'var(--dsw-alias-label-secondary)',
      tertiary: 'var(--dsw-alias-label-tertiary)',
      brand: 'var(--dsw-alias-brand-primary, var(--dsw-alias-state-brand-primary))',
      success: 'var(--dsw-alias-state-success-primary)',
      warning: 'var(--dsw-alias-state-warning-primary)',
      danger: 'var(--dsw-alias-state-danger-primary, var(--dsw-alias-state-error-primary))',
      border: 'var(--dsw-alias-border-l2)',
      cardBg: 'var(--dsw-alias-bg-card, var(--dsw-alias-bg-layer-3))',
      fieldBg: 'var(--dsw-alias-bg-field, var(--dsw-alias-bg-layer-2))',
      btnFg: 'var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-card))',
    };

    const S = {
      panel: { padding: '12px 14px', marginBottom: 14, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)', borderRadius: 8, border: '1px solid ' + C.border },
      input: { height: 34, borderRadius: 6, border: '1px solid ' + C.border, background: C.fieldBg, color: C.primary, padding: '0 10px', fontSize: 13 },
      fieldCol: { display: 'flex', flexDirection: 'column', gap: 6 },
      label: { fontSize: 13, fontWeight: 500, color: C.primary },
      hint: { fontSize: 11, color: C.tertiary, lineHeight: '1.4' },
      statCell: { padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)', display: 'flex', flexDirection: 'column', gap: 2 },
      banner: (tone) => ({ padding: '8px 12px', marginBottom: 12, borderRadius: 6, fontSize: 12, color: tone, background: 'color-mix(in srgb, ' + tone + ' 10%, transparent)', border: '1px solid color-mix(in srgb, ' + tone + ' 20%, transparent)' }),
      pill: (tone, bold) => ({ fontSize: 11, fontWeight: bold ? 600 : 500, padding: '2px 6px', borderRadius: 6, background: 'color-mix(in srgb, ' + tone + ' 15%, transparent)', color: tone }),
      btnPrimary: (busy) => ({ padding: '6px 14px', borderRadius: 6, background: C.primary, color: C.btnFg, border: 0, fontSize: 12, fontWeight: 600, cursor: busy ? 'default' : 'pointer' }),
      rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
    };

    function resolveLang(_ctx) {
      try {
        const snap = typeof _ctx?.locale?.getLocale === 'function'
          ? _ctx.locale.getLocale()
          : (typeof _ctx?.locale?.getSnapshot === 'function' ? _ctx.locale.getSnapshot() : null);
        if (typeof snap?.active === 'string' && snap.active) return snap.active.startsWith('zh') ? 'zh' : 'en';
        if (typeof snap === 'string' && snap) return snap.startsWith('zh') ? 'zh' : 'en';
      } catch (err) {
        /* Fallback if locale service getter fails */
      }
      if (typeof navigator !== 'undefined' && typeof navigator.language === 'string' && navigator.language) {
        return navigator.language.startsWith('zh') ? 'zh' : 'en';
      }
      return 'en';
    }

    function createTranslator(tBound, dict) {
      return (k, params) => {
        const rawTranslated = typeof tBound === 'function' ? tBound(k) : null;
        const translated = rawTranslated && rawTranslated !== k && !rawTranslated.startsWith(NS + '.') ? rawTranslated : null;
        let str = translated || dict[k] || en[k] || k;
        if (params && typeof params === 'object') {
          for (const [pk, pv] of Object.entries(params)) {
            str = str.replace(new RegExp('\\{' + pk + '\\}', 'g'), String(pv));
          }
        }
        return str;
      };
    }

    function formatLastActivity(iso, fallbackText) {
      if (!iso) return fallbackText;
      try {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? fallbackText : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (e) {
        return fallbackText;
      }
    }

    const el = React.createElement;

    function PluginCard({ ctx: _ctx, t, bare }) {
      const [expanded, setExpanded] = React.useState(false);
      const [draft, setDraft] = React.useState(DEFAULTS);
      const [status, setStatus] = React.useState('loading');
      const [saving, setSaving] = React.useState(false);
      const [msg, setMsg] = React.useState('');
      const [showRecentLog, setShowRecentLog] = React.useState(false);
      const [telemetry, setTelemetry] = React.useState({ totalCleaned: 0, sessionsGuarded: 0, lastCleanedAt: null, lastModel: null, lastProvider: null, recent: [], resetting: false, resetError: '' });
      const [updateState, setUpdateState] = React.useState({ checking: false, updateAvailable: false, currentVersion: FALLBACK_VERSION, latestVersion: '', updating: false, notice: '', error: '' });
      const saveTimerRef = React.useRef(null);

      const scope = React.useMemo(() => {
        if (!_ctx) return null;
        try {
          if (_ctx.configForms && typeof _ctx.configForms.get === 'function') return _ctx.configForms.get(ROW_ID);
          if (_ctx.settingsScope && typeof _ctx.settingsScope.bind === 'function') return _ctx.settingsScope.bind({ namespace: ROW_ID });
        } catch (e) {
          return null;
        }
        return null;
      }, [_ctx]);

      const currentLang = resolveLang(_ctx);
      const dict = currentLang === 'zh' ? zh : en;
      const tBound = React.useMemo(() => {
        if (typeof t === 'function') return t;
        if (typeof _ctx?.locale?.bind === 'function') {
          try { return _ctx.locale.bind(NS); } catch (err) { /* Locale bind fallback */ }
        }
        return null;
      }, [t, _ctx]);
      const tt = createTranslator(tBound, dict);

      React.useEffect(() => () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); }, []);

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
              cleanThinkArtifacts: Boolean(view.cleanThinkArtifacts),
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
          try {
            unsubscribe = scope.subscribe(() => {
              try { syncSnapshot(typeof scope.getSnapshot === 'function' ? scope.getSnapshot() : null); } catch (err) { /* Snapshot update failed */ }
            });
          } catch (err) { /* Subscription unavailable */ }
        }
        return () => { cancelled = true; if (typeof unsubscribe === 'function') unsubscribe(); };
      }, [scope]);

      const loadTelemetry = async (isCancelled = () => false) => {
        try {
          const res = await fetch('/api/dsh-dsml-artifact-guard/stats');
          if (!res.ok || isCancelled()) return;
          const data = await res.json();
          if (isCancelled()) return;
          setTelemetry(prev => ({
            ...prev,
            totalCleaned: data.totalCleaned || 0,
            sessionsGuarded: data.sessionsGuarded || 0,
            lastCleanedAt: data.lastCleanedAt || null,
            lastModel: data.lastModel || null,
            lastProvider: data.lastProvider || null,
            recent: Array.isArray(data.recent) ? data.recent : [],
          }));
        } catch (e) { /* Ignore telemetry poll errors */ }
      };

      React.useEffect(() => {
        let cancelled = false;
        loadTelemetry(() => cancelled);
        return () => { cancelled = true; };
      }, [expanded]);

      React.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            setUpdateState(s => ({ ...s, checking: true, error: '' }));
            const res = await fetch('/api/dsh-dsml-artifact-guard/update');
            if (!res.ok) throw new Error(String(res.status));
            const data = await res.json();
            if (!cancelled) {
              setUpdateState(s => ({ ...s, checking: false, currentVersion: data.currentVersion || s.currentVersion, latestVersion: data.latestVersion || '', updateAvailable: !!data.updateAvailable }));
            }
          } catch (err) {
            if (!cancelled) setUpdateState(s => ({ ...s, checking: false, error: tt('checkUpdateFailed') }));
          }
        })();
        return () => { cancelled = true; };
      }, []);

      const onResetTelemetry = async () => {
        if (telemetry.resetting) return;
        setTelemetry(s => ({ ...s, resetting: true, resetError: '' }));
        try {
          const res = await fetch('/api/dsh-dsml-artifact-guard/stats', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-plugin-stats': '1' } });
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          const u = data.stats || {};
          setTelemetry({ totalCleaned: u.totalCleaned || 0, sessionsGuarded: u.sessionsGuarded || 0, lastCleanedAt: u.lastCleanedAt || null, lastModel: u.lastModel || null, lastProvider: u.lastProvider || null, recent: Array.isArray(u.recent) ? u.recent : [], resetting: false, resetError: '' });
        } catch (e) {
          setTelemetry(s => ({ ...s, resetting: false, resetError: tt('telemetryResetFailed') }));
        }
      };

      const onTriggerUpdate = async () => {
        if (updateState.updating) return;
        setUpdateState(s => ({ ...s, updating: true, error: '', notice: '' }));
        try {
          const res = await fetch('/api/dsh-dsml-artifact-guard/update', { method: 'POST', headers: { 'content-type': 'application/json', 'x-dsh-plugin-update': '1' } });
          const data = await res.json();
          if (!res.ok || data.ok === false || (data.error && !data.updated)) throw new Error(data.error || String(res.status));
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
            ['cleanThinkArtifacts', Boolean(draft.cleanThinkArtifacts)],
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
        role: 'button',
        tabIndex: 0,
        'aria-expanded': expanded,
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
            ? el(CoreChevron, { style: { transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' } })
            : el('span', { dangerouslySetInnerHTML: { __html: expanded ? CHEVRON_UP_SVG : CHEVRON_DOWN_SVG } })
        )
      );

      const updaterBlock = el('div', { style: { ...S.panel, ...S.rowBetween, margin: '14px 0' } },
        el('div', { style: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } },
          el('span', { style: { color: C.secondary } }, tt('version') + ': ' + updateState.currentVersion),
          updateState.checking && el('span', { style: { color: C.tertiary, fontSize: 12 } }, tt('updateChecking')),
          !updateState.checking && updateState.updateAvailable && el('span', { style: { color: C.warning, fontWeight: 600, fontSize: 12 } }, tt('updateAvailable', { v: updateState.latestVersion })),
          !updateState.checking && !updateState.updateAvailable && !updateState.error && el('span', { style: { color: C.success, fontSize: 12 } }, '✓ ' + tt('upToDate')),
          updateState.error && el('span', { style: { color: C.danger, fontSize: 12 } }, updateState.error)
        ),
        updateState.updateAvailable && el('button', { type: 'button', onClick: onTriggerUpdate, disabled: updateState.updating, style: S.btnPrimary(updateState.updating) }, updateState.updating ? tt('updating') : tt('updateNow'))
      );

      const statItem = (label, value, color) => el('div', { style: S.statCell },
        el('span', { style: { fontSize: 11, color: C.tertiary } }, label),
        el('span', { style: { fontSize: color === C.secondary ? 13 : 15, fontWeight: color === C.secondary ? 500 : 600, color } }, value)
      );

      const telemetryBlock = el('div', { style: { ...S.panel, display: 'flex', flexDirection: 'column', gap: 8 } },
        el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 } },
          el('span', { style: { fontSize: 12, fontWeight: 600, color: C.primary } }, '📊 ' + tt('telemetryTitle')),
          el('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            telemetry.resetError && el('span', { style: { fontSize: 11, color: C.danger } }, telemetry.resetError),
            el('button', { type: 'button', onClick: onResetTelemetry, disabled: telemetry.resetting, style: { padding: '3px 8px', borderRadius: 4, fontSize: 11, border: 0, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent)', color: C.secondary, cursor: telemetry.resetting ? 'default' : 'pointer' } }, telemetry.resetting ? tt('telemetryResetting') : tt('telemetryReset'))
          )
        ),
        el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8 } },
          statItem(tt('telemetryGuarded'), String(telemetry.sessionsGuarded), C.primary),
          statItem(tt('telemetryRemoved'), String(telemetry.totalCleaned), C.brand),
          statItem(tt('telemetryLast'), formatLastActivity(telemetry.lastCleanedAt, tt('telemetryNever')), C.secondary)
        ),
        telemetry.recent.length > 0 && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4, paddingTop: 8, borderTop: '1px solid color-mix(in srgb, var(--dsw-alias-border-l2) 50%, transparent)' } },
          el('button', { type: 'button', onClick: () => setShowRecentLog(v => !v), style: { background: 'transparent', border: 0, padding: 0, fontSize: 11, color: C.brand, cursor: 'pointer', textAlign: 'left', textDecoration: 'underline' } }, showRecentLog ? tt('telemetryHideLog') : tt('telemetryShowLog') + ' (' + telemetry.recent.length + ')'),
          showRecentLog && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' } },
            telemetry.recent.map(ev => el('div', { key: ev.id, style: { padding: '4px 6px', borderRadius: 4, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)', color: C.secondary, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 } },
              el('span', null, formatLastActivity(ev.timestamp, tt('telemetryNever')) + (ev.model ? ' [' + ev.model + ']' : '')),
              el('span', { style: { color: C.warning, fontWeight: 600 } }, (ev.removed > 0 ? '-' + ev.removed : '~') + ' ' + ev.type)
            ))
          )
        )
      );

      const settingsForm = status === 'ready' && el('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
        el('div', { style: S.fieldCol },
          el('label', { style: S.label }, tt('mode')),
          el('select', { value: draft.mode, onChange: (e) => setDraft(d => ({ ...d, mode: e.target.value })), style: S.input },
            el('option', { value: 'sanitize' }, tt('modeSanitize')),
            el('option', { value: 'audit' }, tt('modeAudit')),
            el('option', { value: 'disabled' }, tt('modeDisabled'))
          )
        ),
        el('div', { style: S.fieldCol },
          el('label', { style: S.label }, tt('modelPattern')),
          el('input', { type: 'text', value: draft.modelPattern, placeholder: 'deepseek', onChange: (e) => setDraft(d => ({ ...d, modelPattern: e.target.value })), style: S.input }),
          el('span', { style: S.hint }, tt('modelPatternHint'))
        ),
        el('div', { style: S.fieldCol },
          el('label', { style: S.label }, tt('providers')),
          el('input', { type: 'text', value: draft.providers, placeholder: tt('providersPlaceholder'), onChange: (e) => setDraft(d => ({ ...d, providers: e.target.value })), style: S.input }),
          el('span', { style: S.hint }, tt('providersHint'))
        ),
        el('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-label-primary) 3%, transparent)', border: '1px solid ' + C.border } },
          el('input', { type: 'checkbox', id: 'clean-think-artifacts', checked: draft.cleanThinkArtifacts, onChange: (e) => setDraft(d => ({ ...d, cleanThinkArtifacts: e.target.checked })), style: { marginTop: 2, cursor: 'pointer' } }),
          el('label', { htmlFor: 'clean-think-artifacts', style: { display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' } },
            el('span', { style: S.label }, tt('cleanThinkArtifacts')),
            el('span', { style: S.hint }, tt('cleanThinkArtifactsHint'))
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

      const body = el('div', { style: { padding: bare ? '0' : '0 16px 16px', borderTop: bare ? 'none' : '1px solid ' + C.border } },
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
        expanded && body
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
    exports.apply = function apply(ctx) {
      if (typeof ctx.locale?.register === 'function') {
        const registerLocale = () => {
          try { return ctx.locale.register(NS, { en, zh }); } catch (err) { /* Already registered */ }
        };
        if (typeof ctx.effect === 'function') ctx.effect(registerLocale, 'dsh-dsml-artifact-guard: locale');
        else registerLocale();
      }

      function registerSlotWhenReady(slotName, registerFn) {
        if (!ctx.slots) return;
        if (typeof ctx.slots.inject === 'function') {
          try {
            ctx.slots.inject(slotName, () => {
              try { return registerFn(); } catch (err) { console.warn('[' + NS + '] Error registering slot ' + slotName + ':', err); }
            });
            return;
          } catch (err) {
            console.warn('[' + NS + '] Failed to inject slot ' + slotName + ':', err);
          }
        }
        if (typeof ctx.slots.register === 'function') {
          try { registerFn(); } catch (err) { console.warn('[' + NS + '] Failed direct registration for ' + slotName + ':', err); }
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
