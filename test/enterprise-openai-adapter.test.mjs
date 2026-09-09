import { describe, expect, it } from 'vitest'
import { EnterpriseLlmAdapter, serializeEnterpriseRequest } from '../packages/dsh-desktop-enterprise/openai.js'

const model = {
  id: 'bisheng:42',
  display_name: 'BiSheng Chat',
  capabilities: { streaming: true, tools: true, reasoning_content: false }
}

describe('BiSheng OpenAI adapter', () => {
  it('serializes tool history without putting provider credentials in the request body', () => {
    const request = serializeEnterpriseRequest({
      model: model.id,
      messages: [
        { role: 'assistant', content: [{ type: 'tool-call', id: 'call-1', name: 'lookup', arguments: '{"q":"x"}' }] },
        { role: 'user', content: [{ type: 'tool-result', toolCallId: 'call-1', content: [{ type: 'text', text: 'result' }] }] }
      ],
      tools: [{ name: 'lookup', description: 'Lookup', parameters: { type: 'object' } }]
    }, model)
    expect(request).toMatchObject({
      model: 'bisheng:42', stream: true, stream_options: { include_usage: true },
      messages: [
        { role: 'assistant', tool_calls: [{ id: 'call-1' }] },
        { role: 'tool', tool_call_id: 'call-1', content: 'result' }
      ]
    })
    expect(JSON.stringify(request)).not.toContain('access_token')
    expect(JSON.stringify(request)).not.toContain('refresh_token')
  })

  it('assembles split UTF-8 SSE text, authoritative usage, and a terminal finish', async () => {
    const encoder = new TextEncoder()
    const source = [
      'data: {"choices":[{"index":0,"delta":{"content":"Mock 联',
      '调成功"},"finish_reason":null}]}\r\n\r\n',
      'data: {"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n',
      'data: {"choices":[],"usage":{"prompt_tokens":2,"completion_tokens":3,"total_tokens":5}}\n\n',
      'data: [DONE]\n\n'
    ]
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng',
      models: () => [model],
      request: async () => new Response(new ReadableStream({
        start(controller) {
          for (const piece of source) controller.enqueue(encoder.encode(piece))
          controller.close()
        }
      }), { status: 200, headers: { 'content-type': 'text/event-stream' } })
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'Mock 联调成功' })
    expect(chunks).toContainEqual({ type: 'usage', usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 } })
    expect(chunks.at(-1)).toEqual({ type: 'finish', reason: { kind: 'stop' } })
  })

  it('keeps partial text and terminates on an SSE error without retrying', async () => {
    let requests = 0
    const stream = [
      'data: {"choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
      'event: error\ndata: {"error":{"message":"quota reached","type":"quota_error","code":"monthly_token_limit_exceeded"},"request_id":"req-1"}\n\n'
    ].join('')
    const adapter = new EnterpriseLlmAdapter({
      providerName: () => 'BiSheng', models: () => [model],
      request: async () => {
        requests += 1
        return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } })
      }
    })
    const chunks = []
    for await (const chunk of adapter.stream({
      provider: 'bisheng-enterprise', model: model.id,
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]
    })) chunks.push(chunk)
    expect(requests).toBe(1)
    expect(chunks).toContainEqual({ type: 'text-delta', index: 0, text: 'partial' })
    expect(chunks.at(-1)).toMatchObject({ type: 'finish', reason: { kind: 'error', failure: { status: 200, requestId: 'req-1' } } })
  })
})
