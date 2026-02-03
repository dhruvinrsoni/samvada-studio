/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly APP_VERSION: string
	readonly GIT_COMMIT: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
