import { expect, test } from 'claude-code/testing'

import { parseBranch, parseHead } from './register'

test('parseBranch trims git output and treats empty as no branch', () => {
	expect(parseBranch('develop\n')).toBe('develop')
	expect(parseBranch('  \n')).toBeNull()
})

test('parseHead reads a branch ref, a detached sha, and rejects junk', () => {
	expect(parseHead('ref: refs/heads/feature/x\n')).toBe('feature/x')
	expect(parseHead('0123456789abcdef0123456789abcdef01234567\n')).toBe('detached@0123456')
	expect(parseHead('gitdir: ../.git/worktrees/w')).toBeNull()
})
