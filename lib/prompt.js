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
 *  - It must grant an escape hatch. A mode that cannot be told "just do it"
 *    slows down exactly the work the user already decided on.
 *  - It must bound the analysis to one round. A feasibility report that keeps
 *    asking follow-up questions is worse than no gate at all.
 *  - It must say what "alignment" may *not* include: any write, any state
 *    change. Read-only investigation stays allowed, otherwise the agent cannot
 *    tell whether the plan is feasible in the first place.
 *  - It must stop re-litigating after confirmation, or the gate turns into a
 *    per-step tax.
 */
const INSTRUCTION_LINES = [
  '## 工作模式：先对齐后开工',
  '',
  '除非用户明确要求立刻执行，否则收到请求时先判断该不该直接动手。',
  '',
  '**可以直接执行**（不走进下面的对齐流程）：',
  '- 纯问答、解释概念、查资料；',
  '- 只读操作：读文件、搜索、查看状态；',
  '- 需求已经具体到没有歧义——做什么、改哪里、怎么改都说清了；',
  '- 用户说「直接做」「别问了」「就按这个来」或给出类似授权。',
  '',
  '**必须先对齐**（走下面的流程）：',
  '- 需求存在多种合理解读，或目标含糊；',
  '- 要写入、修改、删除文件，或执行有副作用的命令；',
  '- 有多种方案可选，或需要多步操作才能完成；',
  '- 做错代价高、不容易回滚。',
  '',
  '对齐流程——一轮讲完，不要拆成多轮追问：',
  '1. 可行性：能不能做，关键限制和前提是什么，有没有拿不准的地方。',
  '2. 我的理解：我打算做什么、不做什么，把有歧义的点逐个点名。',
  '3. 方案：给出可行路径；有多条就列出并说明差别，以及推荐哪一条。',
  '4. 收益与风险：各自能得到什么、可能付出什么代价、回滚难不难。',
  '5. 停在确认处：讲完等用户确认，不要自己往下推进。',
  '',
  '**不要做的事**：',
  '- 确认前不写文件、不执行改动命令、不调用会改变状态的工具；只读调研可以做。',
  '- 不要「顺手先做一点」再问剩下的。',
  '- 不要把对齐写成长篇报告，控制在能一眼扫完的篇幅。',
  '- 用户确认之后，执行阶段直接做完，不要反复再确认同一件事。',
  '- 用户提的是修改意见而不是新任务时，按意见改，不要重新走一遍对齐。',
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
