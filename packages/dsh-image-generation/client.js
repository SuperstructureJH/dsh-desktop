window.__ModuleLoader__.load({
  id: 'dsh-image-generation',
  factory: require => {
    const React = require('react')
    const { IconChevronDownOutline14 } = require('@deepseek-ai/dsh-client-ui-primitives')
    const h = React.createElement
    const NS = 'settings.imageGeneration'
    const zh = {
      title: '生图工具', description: '为 PPT、Word 和对话生成图片。', provider: '服务商', bytedance: '字节 · 豆包 Seedream', openai: 'OpenAI',
      apiKey: 'API Key', keyPlaceholder: '输入服务商的 API Key', savedKey: '已配置，输入新 Key 可替换', keyLink: '获取 API Key',
      advanced: '高级设置', model: '模型 ID', baseUrl: 'API 地址', defaults: '支持基础地址或控制台的完整生图接口地址，保存时自动识别。',
      save: '保存', saving: '正在校验…', saved: '已保存，连接校验通过', hint: '保存时自动校验连接；模型的生图权限和额度在实际调用时确认。',
      configured: '已配置', loading: '正在读取配置…', reload: '重新读取配置', readOnly: '当前配置由管理员管理。',
      modelSelect: '生图模型', fetchModels: '获取模型', fetchingModels: '正在获取…', customModel: '自定义模型 / 接入点',
      builtinModels: '内置模型，可直接选择；模型访问权限在保存及实际调用时确认。',
      byteModels: '字节的账号模型查询需要独立管理凭据。当前提供内置模型，也可填写自己的接入点 ID。',
      fetchedModels: '已获取此 Key 可见且工具支持的生图模型。', emptyModels: '此 Key 的列表未返回工具支持的生图模型，可检查权限或填写自定义模型。',
      MODEL_DISCOVERY: '当前服务商使用内置模型或自定义接入点。',
      AUTH: 'API Key 无效或已过期，请检查后重新保存。', PERMISSION: '当前 Key 无权访问，请确认模型已开通及账号已完成所需认证。',
      MODEL: '无法访问所选模型，请检查模型 ID、接入点或模型开通状态。', KEY_REQUIRED: '请填写 API Key；更换服务地址后需要重新填写。',
      QUOTA: '服务商额度不足或请求受限，请检查账户后重试。', ENDPOINT: '请填写有效的 API 基础地址，例如以 /v1 或 /api/v3 结尾的 HTTPS 地址。',
      TIMEOUT: '连接超时，请检查网络后重新保存。', CONFLICT: '配置已在其他窗口更新，请重新打开此卡片后保存。',
      READ_ONLY: '当前凭据存储为只读，请联系管理员。', RESPONSE: '服务商返回了无法识别的结果，请检查 API 地址。',
      PARAMETERS: '服务商未通过连接检查，请确认 API 地址、模型 ID 及接入点配置。',
      UNAVAILABLE: '连接失败，请检查网络和 API 地址后重新保存。', CANCELLED: '校验已取消，可以重新保存。', PROVIDER_ERROR: '服务商暂时不可用，请稍后重新保存。',
    }
    const en = {
      title: 'Image generation', description: 'Generate images for PPT, Word and conversations.', provider: 'Provider', bytedance: 'ByteDance · Seedream', openai: 'OpenAI',
      apiKey: 'API Key', keyPlaceholder: 'Enter your provider API key', savedKey: 'Configured; enter a new key to replace it', keyLink: 'Get an API key',
      advanced: 'Advanced settings', model: 'Model ID', baseUrl: 'API URL', defaults: 'Enter a base URL or the full image-generation endpoint. Saving normalizes it automatically.',
      save: 'Save', saving: 'Validating…', saved: 'Saved. Connection validated.', hint: 'Saving validates the connection automatically. Image permissions and quota are confirmed during generation.',
      configured: 'Configured', loading: 'Loading settings…', reload: 'Reload settings', readOnly: 'These settings are managed by your administrator.',
      modelSelect: 'Image model', fetchModels: 'Fetch models', fetchingModels: 'Fetching…', customModel: 'Custom model / endpoint',
      builtinModels: 'Built-in models. Access is checked when saving and generating.',
      byteModels: 'ByteDance account discovery requires separate management credentials. Choose the built-in model or enter your endpoint ID.',
      fetchedModels: 'Loaded image models visible to this key and supported by this tool.', emptyModels: 'No supported image models were returned. Check access or enter a custom model.',
      MODEL_DISCOVERY: 'Use a built-in model or a custom endpoint for this provider.',
      AUTH: 'The API key is invalid or expired.', PERMISSION: 'Check model access and account verification.', MODEL: 'Check the model ID, inference endpoint and model access.',
      KEY_REQUIRED: 'Enter an API key. A new API origin requires you to enter the key again.', QUOTA: 'Check provider quota and rate limits.',
      ENDPOINT: 'Enter an HTTPS API base URL, normally ending in /v1 or /api/v3.', TIMEOUT: 'The connection timed out. Check your network and save again.',
      CONFLICT: 'Settings changed in another window. Reopen this card before saving.', READ_ONLY: 'The credential store is read-only.',
      RESPONSE: 'The provider returned an invalid response. Check the API URL.', UNAVAILABLE: 'Connection failed. Check your network and API URL.',
      PARAMETERS: 'The provider did not confirm the connection check. Verify the API URL and model ID.',
      CANCELLED: 'Validation was cancelled. Save again to retry.', PROVIDER_ERROR: 'The provider is temporarily unavailable. Save again later.',
    }
    const css = `
      /* Match the Host PluginCard design contract; its component is internal. */
      .dshImageCard{list-style:none;border:.5px solid var(--dsw-alias-border-l4);background:var(--dsw-alias-bg-layer-3);border-radius:16px;transition:border-color .16s,background .16s}
      .dshImageCard:hover{border-color:var(--dsw-alias-label-dimmed)}.dshImageCardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}
      .dshImageHeader{appearance:none;display:flex;align-items:center;gap:12px;width:100%;padding:14px 16px;background:transparent;border:0;border-radius:12px;text-align:left;color:inherit;font:inherit;cursor:pointer}
      .dshImageHeading{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}.dshImageTitle{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}
      .dshImageDescription{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.dshImageBadge{corner-shape:round;white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}
      .dshImageChevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.dshImageHeader[aria-expanded=true] .dshImageChevron{transform:rotate(180deg)}
      .dshImageBody{border-top:.5px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px;display:flex;flex-direction:column;gap:12px}.dshImageFields{border:0;margin:0;padding:0;display:flex;flex-direction:column;min-width:0}
      .dshImageField{display:flex;flex-direction:column;gap:6px;padding:12px 0;font-size:13px;font-weight:500;line-height:1.5;color:var(--dsw-alias-label-primary)}.dshImageField+.dshImageField{border-top:.5px solid var(--dsw-alias-border-l2)}.dshImageField input,.dshImageField select{box-sizing:border-box;width:100%;min-width:0;height:34px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);font:inherit;font-weight:400}
      .dshImageField input::placeholder{color:var(--dsw-alias-label-tertiary)}.dshImageLink{align-self:flex-start;font-size:12px;color:var(--dsw-alias-label-secondary);text-decoration:underline}
      .dshImageAdvanced{margin-top:12px}.dshImageAdvanced summary{cursor:pointer;font-size:13px;color:var(--dsw-alias-label-secondary)}.dshImageAdvanced[open]{display:flex;flex-direction:column}
      .dshImageHint{font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary);margin:0}.dshImageActions{border-top:.5px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px;flex-wrap:wrap}
      .dshImageSave{appearance:none;font:inherit;font-size:13px;line-height:1.5;border:1px solid transparent;border-radius:8px;padding:5px 14px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);cursor:pointer}.dshImageSave:disabled{opacity:.4;cursor:default}
      .dshImageStatus{margin:0;font-size:12px;line-height:1.5}.dshImageError{color:var(--dsw-alias-state-error-primary)}
      .dshImageCard :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .dshImageHeader:focus-visible{outline-offset:-2px}.dshImageSave:focus-visible{outline-offset:1px}
      .dshImageFetch{appearance:none;align-self:flex-start;font:inherit;font-size:13px;line-height:1.5;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:5px 14px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}.dshImageFetch:disabled{opacity:.4;cursor:default}
    `
    async function api(path, options = {}) {
      const response = await fetch(`/api/image-generation.${path}`, { ...options, cache: 'no-store' })
      let data
      try { data = await response.json() } catch { throw { code: 'RESPONSE' } }
      if (!response.ok) throw data
      return data
    }
    function ImageCard({ t }) {
      const [expanded, setExpanded] = React.useState(false)
      const [saved, setSaved] = React.useState(null)
      const [drafts, setDrafts] = React.useState({})
      const [provider, setProvider] = React.useState('bytedance')
      const [status, setStatus] = React.useState('')
      const [error, setError] = React.useState('')
      const [loading, setLoading] = React.useState(true)
      const [busy, setBusy] = React.useState(false)
      const [fetching, setFetching] = React.useState(false)
      const [catalogs, setCatalogs] = React.useState({})
      const [customModels, setCustomModels] = React.useState({})
      const inFlight = React.useRef(false)
      const lifetime = React.useRef(null)
      const id = React.useId()
      const load = React.useCallback(async signal => {
        setLoading(true); setError('')
        try {
          const result = await api('settings', { signal })
          setSaved(result); setProvider(result.provider)
          setCatalogs({}); setCustomModels(Object.fromEntries(Object.entries(result.profiles).map(([key, value]) => [key, !result.catalogs[key].models.includes(value.model)])))
          setDrafts(Object.fromEntries(Object.entries(result.profiles).map(([key, value]) => [key, { ...value, apiKey: '' }])))
        } catch (error) { if (!signal.aborted) setError(error.code || 'UNAVAILABLE') }
        finally { if (!signal.aborted) setLoading(false) }
      }, [])
      React.useEffect(() => {
        const controller = new AbortController(); lifetime.current = controller
        void load(controller.signal)
        return () => controller.abort()
      }, [load])
      const draft = drafts[provider]
      const catalog = catalogs[provider] || saved?.catalogs[provider]
      const edit = (key, value) => {
        setDrafts(previous => ({ ...previous, [provider]: { ...previous[provider], [key]: value } }))
        if (key === 'apiKey' || key === 'baseUrl') setCatalogs(previous => ({ ...previous, [provider]: undefined }))
        setStatus(''); setError('')
      }
      const fetchModels = async () => {
        if (inFlight.current || !saved) return
        inFlight.current = true; setFetching(true); setError(''); setStatus('')
        try {
          const result = await api('models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: lifetime.current.signal,
            body: JSON.stringify({ revision: saved.revision, provider, model: draft.model || undefined, baseUrl: draft.baseUrl, apiKey: draft.apiKey }) })
          setCatalogs(previous => ({ ...previous, [provider]: result }))
          setCustomModels(previous => ({ ...previous, [provider]: !result.models.includes(draft.model) }))
        } catch (error) { if (!lifetime.current.signal.aborted) setError(error.code || 'UNAVAILABLE') }
        finally { inFlight.current = false; if (!lifetime.current.signal.aborted) setFetching(false) }
      }
      const save = async event => {
        event.preventDefault()
        if (inFlight.current || !saved) return
        inFlight.current = true; setBusy(true); setError(''); setStatus('')
        try {
          const result = await api('save', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: lifetime.current.signal,
            body: JSON.stringify({ revision: saved.revision, provider, model: draft.model, baseUrl: draft.baseUrl, apiKey: draft.apiKey }),
          })
          setSaved(result)
          setDrafts(previous => ({ ...previous, [provider]: { ...result.profiles[provider], apiKey: '' } }))
          setStatus('saved')
        } catch (error) { if (!lifetime.current.signal.aborted) setError(error.code || 'UNAVAILABLE') }
        finally { inFlight.current = false; if (!lifetime.current.signal.aborted) setBusy(false) }
      }
      const field = (key, label, type = 'text', placeholder) => h('label', { className: 'dshImageField', key },
        t(label), h('input', { name: key, type, value: draft[key], placeholder, autoComplete: 'off', spellCheck: false, onChange: event => edit(key, event.target.value) }))
      return h('li', { className: `dshImageCard${expanded ? ' dshImageCardOpen' : ''}`, 'data-testid': 'image-generation-card' },
        h('button', { className: 'dshImageHeader', type: 'button', 'aria-expanded': expanded, 'aria-controls': `${id}-body`, onClick: () => setExpanded(value => !value) },
          h('span', { className: 'dshImageHeading' }, h('span', { className: 'dshImageTitle' }, t('title')), h('span', { className: 'dshImageDescription' }, t('description'))),
          saved?.profiles[saved.provider]?.configured && h('span', { className: 'dshImageBadge' }, t('configured')),
          h(IconChevronDownOutline14, { className: 'dshImageChevron' })),
        expanded && h('form', { id: `${id}-body`, className: 'dshImageBody', onSubmit: save, 'aria-busy': busy || fetching || loading },
          loading ? h('p', { className: 'dshImageHint' }, t('loading')) : draft && h(React.Fragment, null,
            h('fieldset', { className: 'dshImageFields', disabled: busy || fetching || !saved.writable },
              h('label', { className: 'dshImageField' }, t('provider'), h('select', { name: 'provider', value: provider, onChange: event => { setProvider(event.target.value); setStatus(''); setError('') } },
                h('option', { value: 'bytedance' }, t('bytedance')), h('option', { value: 'openai' }, t('openai')))),
              field('apiKey', 'apiKey', 'password', t(draft.configured ? 'savedKey' : 'keyPlaceholder')),
              h('a', { className: 'dshImageLink', href: provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.volcengine.com/ark/apiKey', target: '_blank', rel: 'noreferrer' }, t('keyLink')),
              h('label', { className: 'dshImageField' }, t('modelSelect'), h('select', { name: 'model', value: customModels[provider] || !catalog.models.includes(draft.model) ? '__custom__' : draft.model,
                onChange: event => { const custom = event.target.value === '__custom__'; setCustomModels(previous => ({ ...previous, [provider]: custom })); if (!custom) edit('model', event.target.value) } },
                ...catalog.models.map(model => h('option', { key: model, value: model }, model)), h('option', { value: '__custom__' }, t('customModel')))),
              (customModels[provider] || !catalog.models.includes(draft.model)) && field('model', 'model'),
              catalog.canFetch && h('button', { className: 'dshImageFetch', type: 'button', disabled: !draft.apiKey.trim() && !draft.configured, onClick: fetchModels }, t(fetching ? 'fetchingModels' : 'fetchModels')),
              h('p', { className: 'dshImageHint', role: 'status' }, t(catalog.source === 'provider' ? catalog.models.length ? 'fetchedModels' : 'emptyModels' : provider === 'bytedance' ? 'byteModels' : 'builtinModels')),
              h('details', { className: 'dshImageAdvanced' }, h('summary', null, t('advanced')), field('baseUrl', 'baseUrl'))),
            h('p', { className: 'dshImageHint' }, t('defaults')),
            h('div', { className: 'dshImageActions' }, h('button', { className: 'dshImageSave', type: 'submit', disabled: busy || fetching || !saved.writable || !draft.model.trim() || (!draft.apiKey.trim() && !draft.configured) }, t(busy ? 'saving' : 'save')),
              status && h('p', { className: 'dshImageStatus', role: 'status' }, t(status))),
            h('p', { className: 'dshImageHint' }, t(saved.writable ? 'hint' : 'readOnly'))),
          error && h('p', { className: 'dshImageStatus dshImageError', role: 'alert' }, t(Object.hasOwn(en, error) ? error : 'UNAVAILABLE')),
          !loading && !saved && h('button', { className: 'dshImageSave', type: 'button', onClick: () => load(lifetime.current.signal) }, t('reload'))))
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'image-generation locale')
        ctx.effect(() => {
          const style = document.createElement('style'); style.dataset.pluginCss = 'dsh-image-generation'; style.textContent = css
          document.head.appendChild(style)
          return () => style.remove()
        }, 'image-generation styles')
        ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({ name: 'settings.plugin.item', key: 'image-generation', order: 100, locale: NS }, ImageCard))
      },
    }
  },
})
