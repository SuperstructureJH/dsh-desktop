window.__ModuleLoader__.load({
  id: 'dsh-image-generation',
  factory: require => {
    const React = require('react')
    const h = React.createElement
    const NS = 'settings.imageGeneration'
    const zh = {
      title: '生图工具', description: '为 PPT、Word 和对话生成图片。', provider: '服务商', bytedance: '字节 · 豆包 Seedream', openai: 'OpenAI',
      apiKey: 'API Key', keyPlaceholder: '输入服务商的 API Key', savedKey: '已配置，输入新 Key 可替换', keyLink: '获取 API Key',
      advanced: '高级设置', model: '模型 ID', baseUrl: 'API 地址', defaults: '已提供默认模型和地址，通常无需修改。',
      save: '保存', saving: '正在校验…', saved: '已保存，连接校验通过', hint: '保存时自动校验连接；模型的生图权限和额度在实际调用时确认。',
      configured: '已配置', loading: '正在读取配置…', reload: '重新读取配置', readOnly: '当前配置由管理员管理。',
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
      advanced: 'Advanced settings', model: 'Model ID', baseUrl: 'API base URL', defaults: 'The default model and URL are ready to use.',
      save: 'Save', saving: 'Validating…', saved: 'Saved. Connection validated.', hint: 'Saving validates the connection automatically. Image permissions and quota are confirmed during generation.',
      configured: 'Configured', loading: 'Loading settings…', reload: 'Reload settings', readOnly: 'These settings are managed by your administrator.',
      AUTH: 'The API key is invalid or expired.', PERMISSION: 'Check model access and account verification.', MODEL: 'Check the model ID, inference endpoint and model access.',
      KEY_REQUIRED: 'Enter an API key. A new API origin requires you to enter the key again.', QUOTA: 'Check provider quota and rate limits.',
      ENDPOINT: 'Enter an HTTPS API base URL, normally ending in /v1 or /api/v3.', TIMEOUT: 'The connection timed out. Check your network and save again.',
      CONFLICT: 'Settings changed in another window. Reopen this card before saving.', READ_ONLY: 'The credential store is read-only.',
      RESPONSE: 'The provider returned an invalid response. Check the API URL.', UNAVAILABLE: 'Connection failed. Check your network and API URL.',
      PARAMETERS: 'The provider did not confirm the connection check. Verify the API URL and model ID.',
      CANCELLED: 'Validation was cancelled. Save again to retry.', PROVIDER_ERROR: 'The provider is temporarily unavailable. Save again later.',
    }
    const css = `
      .dshImageCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:14px;color:var(--dsw-alias-label-primary);overflow:hidden}
      .dshImageHeader{display:flex;align-items:center;gap:12px;width:100%;padding:18px 20px;background:transparent;border:0;text-align:left;color:inherit;font:inherit;cursor:pointer}
      .dshImageHeading{display:flex;flex:1;flex-direction:column;gap:6px;min-width:0}.dshImageTitle{font-size:16px;font-weight:600;line-height:24px}
      .dshImageDescription{color:var(--dsw-alias-label-tertiary);font-size:14px;line-height:22px}.dshImageBadge{font-size:12px;color:var(--dsw-alias-label-secondary)}
      .dshImageChevron{width:8px;height:8px;border-right:1.5px solid var(--dsw-alias-label-tertiary);border-bottom:1.5px solid var(--dsw-alias-label-tertiary);transform:rotate(45deg);margin-right:4px}.dshImageHeader[aria-expanded=true] .dshImageChevron{transform:rotate(225deg)}
      .dshImageBody{padding:0 20px 20px;display:flex;flex-direction:column;gap:16px}.dshImageFields{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:16px;min-width:0}
      .dshImageField{display:flex;flex-direction:column;gap:7px;font-size:13px}.dshImageField input,.dshImageField select{box-sizing:border-box;width:100%;min-width:0;height:36px;padding:0 11px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:inherit;font:inherit}
      .dshImageField input::placeholder{color:var(--dsw-alias-label-tertiary)}.dshImageLink{align-self:flex-start;font-size:12px;color:var(--dsw-alias-label-secondary);text-decoration:underline}
      .dshImageAdvanced summary{cursor:pointer;font-size:13px;color:var(--dsw-alias-label-secondary)}.dshImageAdvanced[open]{display:flex;flex-direction:column}.dshImageAdvanced .dshImageField{margin-top:14px}
      .dshImageHint{font-size:12px;line-height:19px;color:var(--dsw-alias-label-tertiary);margin:0}.dshImageActions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
      .dshImageSave{font:inherit;font-size:13px;font-weight:500;border:0;border-radius:18px;padding:8px 20px;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground);cursor:pointer}.dshImageSave:disabled{opacity:.5;cursor:default}
      .dshImageStatus{margin:0;font-size:13px;line-height:20px}.dshImageError{color:var(--dsw-alias-state-error-primary)}
      .dshImageCard :focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
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
      const inFlight = React.useRef(false)
      const lifetime = React.useRef(null)
      const id = React.useId()
      const load = React.useCallback(async signal => {
        setLoading(true); setError('')
        try {
          const result = await api('settings', { signal })
          setSaved(result); setProvider(result.provider)
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
      const edit = (key, value) => {
        setDrafts(previous => ({ ...previous, [provider]: { ...previous[provider], [key]: value } }))
        setStatus(''); setError('')
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
      return h('li', { className: 'dshImageCard', 'data-testid': 'image-generation-card' },
        h('button', { className: 'dshImageHeader', type: 'button', 'aria-expanded': expanded, 'aria-controls': `${id}-body`, onClick: () => setExpanded(value => !value) },
          h('span', { className: 'dshImageHeading' }, h('span', { className: 'dshImageTitle' }, t('title')), h('span', { className: 'dshImageDescription' }, t('description'))),
          saved?.profiles[saved.provider]?.configured && h('span', { className: 'dshImageBadge' }, t('configured')),
          h('span', { className: 'dshImageChevron', 'aria-hidden': true })),
        expanded && h('form', { id: `${id}-body`, className: 'dshImageBody', onSubmit: save, 'aria-busy': busy || loading },
          loading ? h('p', { className: 'dshImageHint' }, t('loading')) : draft && h(React.Fragment, null,
            h('fieldset', { className: 'dshImageFields', disabled: busy || !saved.writable },
              h('label', { className: 'dshImageField' }, t('provider'), h('select', { name: 'provider', value: provider, onChange: event => { setProvider(event.target.value); setStatus(''); setError('') } },
                h('option', { value: 'bytedance' }, t('bytedance')), h('option', { value: 'openai' }, t('openai')))),
              field('apiKey', 'apiKey', 'password', t(draft.configured ? 'savedKey' : 'keyPlaceholder')),
              h('a', { className: 'dshImageLink', href: provider === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://console.volcengine.com/ark/apiKey', target: '_blank', rel: 'noreferrer' }, t('keyLink')),
              h('details', { className: 'dshImageAdvanced' }, h('summary', null, t('advanced')), field('model', 'model'), field('baseUrl', 'baseUrl'))),
            h('p', { className: 'dshImageHint' }, t('defaults')),
            h('div', { className: 'dshImageActions' }, h('button', { className: 'dshImageSave', type: 'submit', disabled: busy || !saved.writable || (!draft.apiKey.trim() && !draft.configured) }, t(busy ? 'saving' : 'save')),
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
