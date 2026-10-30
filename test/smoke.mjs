/**
 * Smoke test — no test framework, no network, no cordis install required.
 *
 * Covers the two things that can actually break this plugin: the section must
 * be mounted (and unmounted) at the right times, and the instruction text must
 * still say the things the mode is for.
 */
import assert from 'node:assert/strict'

import {
  PLAN_FIRST_INSTRUCTION,
  PLAN_FIRST_ORDER,
  PLAN_FIRST_SECTION,
  apply,
  buildInstruction,
  inject,
  name
} from '../lib/index.js'

/**
 * Minimal stand-in for a cordis context: only `inject`, which activates the
 * callback when every requested service exists.
 *
 * @param {{ systemPrompt?: boolean }} [options]
 */
function makeContext(options = {}) {
  const { systemPrompt = true } = options
  const registered = []
  const services = {}

  if (systemPrompt) {
    services.systemPrompt = {
      section(spec) {
        registered.push(spec)
      },
      context(spec) {
        registered.push({ ...spec, via: 'context' })
      }
    }
  }

  const ctx = {
    inject(deps, callback) {
      if (deps.some((dep) => !(dep in services))) return
      const scope = {}
      for (const dep of deps) scope[dep] = services[dep]
      callback(scope)
    }
  }

  return { ctx, registered }
}

const results = []

/** Run one named case, recording pass/fail instead of aborting on the first failure. */
function test(title, fn) {
  try {
    fn()
    results.push({ title, ok: true })
  } catch (error) {
    results.push({ title, ok: false, error })
  }
}

test('plugin identity matches the patch entry', () => {
  assert.equal(name, 'plan-first')
  assert.deepEqual(inject, [])
})

test('mounts exactly one system-prompt section', () => {
  const { ctx, registered } = makeContext()
  apply(ctx, undefined)

  assert.equal(registered.length, 1)
  const [section] = registered
  assert.equal(section.name, PLAN_FIRST_SECTION)
  assert.equal(section.order, PLAN_FIRST_ORDER)
  assert.equal(typeof section.text, 'function')
  assert.equal(section.text(), PLAN_FIRST_INSTRUCTION)
})

test('registers no per-step reminder (system prompt only)', () => {
  const { ctx, registered } = makeContext()
  apply(ctx, undefined)

  assert.equal(
    registered.filter((entry) => entry.via === 'context').length,
    0,
    'this build is system-prompt only by request'
  )
})

test('enabled: false leaves the plugin inert', () => {
  const { ctx, registered } = makeContext()
  apply(ctx, { enabled: false })

  assert.equal(registered.length, 0)
})

test('enabled: true mounts the section', () => {
  const { ctx, registered } = makeContext()
  apply(ctx, { enabled: true })

  assert.equal(registered.length, 1)
})

test('a harness without systemPrompt degrades instead of throwing', () => {
  const { ctx, registered } = makeContext({ systemPrompt: false })
  apply(ctx, undefined)

  assert.equal(registered.length, 0)
})

test('section order stays clear of the thinking-language plugin', () => {
  assert.notEqual(PLAN_FIRST_ORDER, 85, 'occupied by dsh-thinking-language section')
  assert.notEqual(PLAN_FIRST_ORDER, 1000, 'occupied by dsh-thinking-language reminder')
  assert.ok(PLAN_FIRST_ORDER > 0 && PLAN_FIRST_ORDER < 1000)
})

test('instruction keeps every part of the agreed flow', () => {
  const required = [
    '先对齐后开工',
    '可以直接执行',
    '必须先对齐',
    '无痕',
    '留痕但可逆',
    '有影响',
    '删除和覆盖已有文件没有灰区',
    '可行性',
    '我的理解',
    '方案',
    '收益与风险',
    '停在确认处',
    '等用户确认',
    '授权之后不再拦',
    '不要做的事',
    '「直接做」',
    '用与用户相同的语言表达'
  ]

  for (const phrase of required) {
    assert.ok(
      PLAN_FIRST_INSTRUCTION.includes(phrase),
      `instruction lost the phrase: ${phrase}`
    )
  }
})

test('instruction forbids acting before confirmation', () => {
  assert.ok(PLAN_FIRST_INSTRUCTION.includes('确认前不做第 3 档操作'))
  assert.ok(PLAN_FIRST_INSTRUCTION.includes('不要「顺手先做一点」'))
})

test('the three tiers are stated in order and tier 2 must announce', () => {
  const trace = PLAN_FIRST_INSTRUCTION.indexOf('留痕但可逆')

  assert.ok(PLAN_FIRST_INSTRUCTION.indexOf('无痕') < trace, 'tier 1 comes first')
  assert.ok(trace < PLAN_FIRST_INSTRUCTION.indexOf('有影响'), 'tier 3 comes last')
  assert.ok(PLAN_FIRST_INSTRUCTION.includes('必须先声明'), 'tier 2 must be announced')
})

test('authorisation switches the gate off', () => {
  assert.ok(PLAN_FIRST_INSTRUCTION.includes('授权之后不再拦'))
  assert.ok(PLAN_FIRST_INSTRUCTION.includes('不受上面的分档限制'))
})

test('instruction stays short enough to not crowd the prompt', () => {
  assert.ok(
    PLAN_FIRST_INSTRUCTION.length < 2400,
    `instruction grew to ${PLAN_FIRST_INSTRUCTION.length} chars`
  )
})

test('appendix is appended only when non-blank', () => {
  assert.equal(buildInstruction({}), PLAN_FIRST_INSTRUCTION)
  assert.equal(buildInstruction({ appendix: '   ' }), PLAN_FIRST_INSTRUCTION)
  assert.equal(
    buildInstruction({ appendix: '额外规则' }),
    `${PLAN_FIRST_INSTRUCTION}\n\n额外规则`
  )
})

test('config reaches the section text at assembly time', () => {
  const { ctx, registered } = makeContext()
  apply(ctx, { appendix: '项目专属规则' })

  assert.ok(registered[0].text().endsWith('项目专属规则'))
})

const failed = results.filter((result) => !result.ok)

for (const result of results) {
  console.log(`${result.ok ? 'ok  ' : 'FAIL'}  ${result.title}`)
  if (!result.ok) console.error(`      ${result.error.message}`)
}

console.log(`\n${results.length - failed.length}/${results.length} passed`)

if (failed.length > 0) process.exitCode = 1
