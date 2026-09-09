import { describe, expect, it } from 'vitest'
import {
  enterpriseLoginDeepLinkFromArgv,
  normalizeEnterpriseServerUrl,
  parseEnterpriseLoginDeepLink
} from '../packages/dsh-desktop-enterprise/deep-link.js'

describe('BiSheng enterprise deep link', () => {
  it('accepts only the fixed login destination and one HTTPS server origin', () => {
    const parsed = parseEnterpriseLoginDeepLink(
      'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com'
    )
    expect(parsed.serverUrl).toBe('https://bisheng.example.com')
    expect(parsed.url).toBe('dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com')
  })

  it.each([
    'dsh-desktop://login?server=http%3A%2F%2Fbisheng.example.com',
    'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com&code=legacy',
    'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com&server=https%3A%2F%2Fother.example.com',
    'dsh-desktop://login/path?server=https%3A%2F%2Fbisheng.example.com',
    'dsh-desktop://other?server=https%3A%2F%2Fbisheng.example.com',
    'dsh-desktop://login?server=https%3A%2F%2Fuser%3Asecret%40bisheng.example.com'
  ])('rejects an unsafe or legacy link: %s', (link) => {
    expect(() => parseEnterpriseLoginDeepLink(link)).toThrow()
  })

  it('allows HTTP 127.0.0.1 only through the explicit development option', () => {
    expect(() => normalizeEnterpriseServerUrl('http://127.0.0.1:17860')).toThrow('HTTPS')
    expect(normalizeEnterpriseServerUrl('http://127.0.0.1:17860', {
      allowInsecureLoopback: true
    })).toBe('http://127.0.0.1:17860')
  })

  it('finds a valid login argument without accepting a malformed one', () => {
    expect(enterpriseLoginDeepLinkFromArgv([
      '/Applications/DSH Desktop.app',
      'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com&code=legacy',
      'dsh-desktop://login?server=https%3A%2F%2Fbisheng.example.com'
    ])?.serverUrl).toBe('https://bisheng.example.com')
  })
})
