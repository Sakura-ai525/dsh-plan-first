/**
 * dsh-plan-first — host entry.
 *
 * Mounts one `systemPrompt` section that tells the model to align before
 * acting: restate the request, state feasibility, options, benefits and risks,
 * then wait for confirmation.
 *
 * Why a system-prompt section rather than a per-step reminder or a tool gate:
 *
 *  - A section is evaluated once per prompt assembly and belongs to the
 *    session's assembled prompt, so it applies to **new conversations** — which
 *    is exactly the stated scope ("打开插件后，所有新对话的任务模式"). A
 *    conversation that was already open keeps the prompt it assembled.
 *  - It is the weakest possible seam: it changes no runtime behaviour, so it
 *    cannot break a session, and the Plugins page toggle can mount/unmount it
 *    live with nothing to clean up.
 *
 * Deliberate omissions, so a later change knows what was ruled out:
 *
 *  - No `Config` export. Nothing here needs a settings page, and a plugin with
 *    no schema cannot be broken by a schemastery version skew. Options are read
 *    from the profile's patch entry at mount time.
 *  - No client half. The enable/disable switch the Harness already draws for
 *    every installed plugin is the switch this plugin wants; additional UI
 *    would only be a second way to express the same boolean.
 *  - No `dsh.compatibility` claim. The loader only rejects a package whose
 *    declared range fails to match; claiming nothing cannot mismatch.
 */
import { PLAN_FIRST_ORDER, PLAN_FIRST_SECTION, buildInstruction } from './prompt.js'

/** Stable Cordis plugin name. */
export const name = 'plan-first'

/** No plugin-level service requirements: `systemPrompt` is acquired through a nested branch that degrades quietly. */
export const inject = []

/** Options, all overridable from this plugin's entry in a profile's cordis.patch.yml. */
const DEFAULTS = {
  /** Set false to keep the plugin installed but inert. */
  enabled: true,
  /** Extra rules appended after the built-in instruction; empty by default. */
  appendix: ''
}

/**
 * Mount the behaviour instruction.
 *
 * The section is registered inside `ctx.inject`, so it is bound to this
 * plugin's fiber: disabling or unmounting the plugin removes it from the next
 * assembly with no cleanup code of our own. A harness without a `systemPrompt`
 * service simply never activates the branch instead of failing to load.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 * @param {{ enabled?: boolean, appendix?: string }} [config] - Resolved config.
 * @returns {void}
 */
export function apply(ctx, config) {
  const options = { ...DEFAULTS, ...(config ?? {}) }
  if (options.enabled === false) return

  ctx.inject(['systemPrompt'], (scope) => {
    // `text` is a function: the service calls it on every prompt assembly, so
    // the wording always reflects the config this fiber was mounted with.
    scope.systemPrompt.section({
      name: PLAN_FIRST_SECTION,
      order: PLAN_FIRST_ORDER,
      text: () => buildInstruction(options)
    })
  })
}

export { PLAN_FIRST_INSTRUCTION, PLAN_FIRST_ORDER, PLAN_FIRST_SECTION, buildInstruction } from './prompt.js'

export default { name, inject, apply }
