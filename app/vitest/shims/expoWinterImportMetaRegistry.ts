/**
 * Vitest shim for `expo/src/winter/runtime.ts`, which does:
 * `require('./ImportMetaRegistry').ImportMetaRegistry`
 *
 * Some installs / resolutions omit or fail to resolve that sibling file under Node.
 * This module is test-only and provides the minimal export surface Expo expects.
 */
export class ImportMetaRegistry {}
