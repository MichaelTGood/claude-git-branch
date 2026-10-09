export type Branch = string | null

declare module 'claude-code' {
	interface PluginState {
		'git-branch': { branch: Branch }
	}
}
