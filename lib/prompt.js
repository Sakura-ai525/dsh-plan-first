/**
 * dsh-plan-first — prompt text, kept free of any cordis or runtime dependency
 * so it can be unit-tested and reused on its own.
 *
 * The whole plugin is one system-prompt section. Its job is to stop the agent
 * from treating "the user typed a request" as "the user asked me to start
 * working", while keeping the round-trip cost low for requests that genuinely
 * do not need alignment.
 */

/**
 * The section name reported to the `systemPrompt` service. Stable, so a
 * profile can reason about it and so two assemblies never register it twice.
 */
export const PLAN_FIRST_SECTION = 'app:plan-first'

/**
 * Section order.
 *
 * The harness's own identity/behaviour sections sit at low orders; the
 * community `dsh-thinking-language` plugin occupies 85 (its section) and 1000
 * (its per-step reminder). 88 places this mode after the thinking-language
 * section but still inside the "how to behave" band, well clear of both.
 */
export const PLAN_FIRST_ORDER = 88

/**
 * The instruction injected into the system prompt.
 *
 * Design constraints this text follows:
 *
 *  - The gate is defined by **aftermath**, not by read/write. "Read-only" is a
 *    fiction the agent can talk itself past: decompressing an archive to inspect
 *    it is a write, yet refusing it would make feasibility work impossible. So
 *    the rule asks what the environment looks like when the turn ends — did
 *    anything appear that the user now has to deal with, or disappear that they
 *    used to have.
 *  - Three tiers, because two were not enough. Tier 2 (reversible traces) is
 *    allowed without asking but must be announced, so an expensive-but-harmless
 *    investigation does not cost a round trip while still leaving the user
 *    informed.
 *  - Deleting or overwriting existing files has no grey zone and is called out
 *    separately, because that is the one category where a wrong guess is not
 *    recoverable.
 *  - It must grant an escape hatch. A mode that cannot be told "just do it"
 *    slows down exactly the work the user already decided on.
 *  - It must bound the analysis to one round. A feasibility report that keeps
 *    asking follow-up questions is worse than no gate at all.
 *  - It must stop re-litigating after confirmation, or the gate turns into a
 *    per-step tax. The "authorised means ladder off" clause is what keeps this
 *    rule from punishing a user who already answered.
 */
const INSTRUCTION_LINES = [
  '## 工作模式：先对齐后开工',
  '',
  '除非用户明确要求立刻执行，否则收到请求时先判断该不该直接动手。',
  '判断依据不是「读还是写」，而是——这一轮结束后，环境里有没有多出需要用户处理的东西，或者本来有的东西被改掉、删掉。',
  '',
  '**按三档决定能做到哪一步**：',
  '',
  '1. **无痕**——可以直接执行，不用问。',
  '   读文件、搜索、查看状态、看日志，包括为方案做的前期调研。结束后环境与动手前一模一样。',
  '',
  '2. **留痕但可逆**——可以做，但必须先声明、后交代。',
  '   解压文件、建临时目录、生成探查报告或草稿。',
  '   先说清要建什么、放在哪；做完明确告诉用户「生成了 X，可删」。',
  '',
  '3. **有影响**——必须先对齐，等确认。',
  '   改项目源码、改配置、删除或覆盖已有文件、提交版本、安装依赖、启停服务、对外发送请求。',
  '   其中**删除和覆盖已有文件没有灰区**，再小也要先问。',
  '',
  '**什么样的请求要走进对齐流程**：需求有歧义、会触及第 3 档、有多种方案可选、做错代价高不易回滚。',
  '',
  '对齐流程——一轮讲完，不要拆成多轮追问：',
  '1. 可行性：能不能做，关键限制和前提是什么，有没有拿不准的地方。',
  '2. 我的理解：我打算做什么、不做什么，把有歧义的点逐个点名。',
  '3. 方案：给出可行路径；有多条就列出并说明差别，以及推荐哪一条。',
  '4. 收益与风险：各自能得到什么、可能付出什么代价、回滚难不难。',
  '5. 停在确认处：讲完等用户确认，不要自己往下推进。',
  '',
  '**不要做的事**：',
  '- 确认前不做第 3 档操作。',
  '- 不要「顺手先做一点」再问剩下的。',
  '- 不要把对齐写成长篇报告，控制在能一眼扫完的篇幅。',
  '- 用户提的是修改意见而不是新任务时，按意见改，不要重新走一遍对齐。',
  '',
  '**授权之后不再拦**：用户一旦确认，执行阶段直接做完，不要再反复确认同一件事；本次授权范围内的动作不受上面的分档限制。',
  '',
  '**逃生门**：用户说「直接做」「别问了」「就按这个来」或给出类似授权时，跳过对齐直接执行。',
  '',
  '用与用户相同的语言表达。'
]

/** The exact instruction text injected into the system prompt. */
export const PLAN_FIRST_INSTRUCTION = INSTRUCTION_LINES.join('\n')

/**
 * Build the instruction for a given config.
 *
 * Kept as a function so the section can be mounted with `text: () => …` (the
 * shape the `systemPrompt` service evaluates on every assembly) while still
 * being trivially testable.
 *
 * @param {{ appendix?: string }} [config]
 * @returns {string} the instruction, plus an optional caller-supplied appendix.
 */
export function buildInstruction(config = {}) {
  const appendix = typeof config.appendix === 'string' ? config.appendix.trim() : ''
  if (appendix === '') return PLAN_FIRST_INSTRUCTION
  return `${PLAN_FIRST_INSTRUCTION}\n\n${appendix}`
}
