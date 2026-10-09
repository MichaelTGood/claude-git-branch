import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Branch } from '../types'

const branch = atom({ plugin: 'git-branch', key: 'branch' } as const, null as Branch)

export const parseBranch = (stdout: string): string | null => {
	const name = stdout.trim()

	return name === '' ? null : name
}

export const parseHead = (head: string): string | null => {
	const text = head.trim()

	if (text.startsWith('ref: refs/heads/')) {
		return parseBranch(text.slice('ref: refs/heads/'.length))
	}

	return /^[0-9a-f]{40,64}$/.test(text) ? `detached@${text.slice(0, 7)}` : null
}

async function readBranch($: EngineInterface): Promise<string | null> {
	try {
		const head = parseHead(await $.fs.read('.git/HEAD'))

		if (head !== null) {
			return head
		}
	} catch {
		// .git is a file (worktree/submodule) or missing: ask git instead
	}

	try {
		const named = await $.process.run(['git', 'symbolic-ref', '--short', '-q', 'HEAD'])

		if (named.exitCode === 0) {
			return parseBranch(named.stdout)
		}

		const sha = await $.process.run(['git', 'rev-parse', '--short', 'HEAD'])
		const short = sha.exitCode === 0 ? parseBranch(sha.stdout) : null

		return short === null ? null : `detached@${short}`
	} catch {
		return null
	}
}

async function refresh($: EngineInterface) {
	const next = await readBranch($)

	if (next !== (await read($, branch))) {
		await update($, branch, () => next)
	}

	$.ui.status(next ?? undefined)
}

const POLL_MS = 3000

export const register: Register = on => {
	let stopPolling: (() => void) | null = null

	on('session.start', async ($, e, next) => {
		await refresh($)

		stopPolling?.()
		stopPolling = $.clock.every(POLL_MS, () => refresh($))

		return next(e)
	})

	on('prompt.submit', async ($, e, next) => {
		await refresh($)

		return next(e)
	})

	on('turn.complete', async ($, e, next) => {
		await refresh($)

		return next(e)
	})

	on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
		const ran = await next(e)

		await refresh($)

		return ran
	}).catch(($, e, next) => next(e))
}
