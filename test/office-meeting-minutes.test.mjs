import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'
import { expect, it } from 'vitest'

const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
const validator = resolve('packages/dsh-desktop-office/business-skills/meeting-recap/scripts/validate_minutes.py')
async function validate(actions) {
  const content = '# 试点评审会议纪要\n\n## 议题记录\n已定事项：按两个小组试点，扩组建议留待复盘。\n\n## 行动项\n' + actions
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c',
    'import runpy,json,sys; m=runpy.run_path(sys.argv[1]); r=m["validate"](sys.argv[2]); print(json.dumps({"passed":r.passed,"errors":r.errors,"warnings":r.warnings}))', validator, content])
  return JSON.parse(stdout)
}
const header = '| 任务 | 负责人 | 期限 | 交付标准 |\n| --- | --- | --- | --- |\n'

it('accepts explicit unknowns and preserves a relative deadline without inventing dates or owners', async () => {
  const result = await validate(header + '| 核对试点安排 | 待确认 | 下周 | 客户确认参会人 |')
  expect(result.passed).toBe(true)
  expect(result.warnings).toHaveLength(1)
})

it('preserves empty table cells and reports the missing owner in its original column', async () => {
  const result = await validate(header + '| 核对试点安排 | | 2026-09-09 | 客户确认参会人 |')
  expect(result.passed).toBe(false)
  expect(result.errors).toContain('行动项缺失字段请标为待确认')
  const missingDeliverable = await validate(header + '| 核对试点安排 | 陈晨 | 下周 ||')
  expect(missingDeliverable.errors).toContain('行动项缺失字段请标为待确认')
})

it('checks real calendar dates and duplicate tasks', async () => {
  const result = await validate(header + '| 核对试点安排 | 陈晨 | 2026-02-30 | 客户确认 |\n| 核对试点安排 | 陈晨 | 待确认 | 客户确认 |')
  expect(result.passed).toBe(false)
  expect(result.errors.some(message => message.includes('2026-02-30'))).toBe(true)
  expect(result.errors.some(message => message.includes('重复任务'))).toBe(true)
})

it('accepts a meeting with no new tasks and reports an empty action table', async () => {
  expect((await validate('本次没有新增任务，继续执行上次会议确认的计划。')).passed).toBe(true)
  expect((await validate(header)).passed).toBe(false)
})

it('requires the deliverable column and consistent row dimensions', async () => {
  expect((await validate('| 任务 | 负责人 | 期限 |\n| --- | --- | --- |\n| 核对 | 陈晨 | 下周 |')).passed).toBe(false)
  expect((await validate(header + '| 核对 | 陈晨 | 下周 |')).passed).toBe(false)
})

it('renders the government picture without editor boundaries and keeps the original editable source', async () => {
  const { stdout } = await promisify(execFile)(python, ['-I', '-B', '-c', `
import json
from pathlib import Path
from PIL import Image
root = Path('.build/office-runtime/templates')
image = Image.open(root / 'government-notice/pages/1.webp').convert('RGB')
grey = sum(1 for y in range(265,365) for x in range(120,720)
           if (lambda p: max(p)-min(p)<6 and 100<min(p)<235)(image.getpixel((x,y))))
red = sum(1 for y in range(265,365) for x in range(120,720)
          if (lambda p: p[0]>160 and p[1]<100 and p[2]<100)(image.getpixel((x,y))))
same = (root / 'government-notice/example.docx').read_bytes() == Path('packages/dsh-desktop-office/sources/legacy/government-notice/example.docx').read_bytes()
print(json.dumps({'grey':grey,'red':red,'originalSource':same}))
`])
  const result = JSON.parse(stdout)
  expect(result.originalSource).toBe(true)
  expect(result.red).toBeGreaterThan(1000)
  expect(result.grey).toBeLessThan(50)
})
