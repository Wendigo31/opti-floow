// Re-export all Tauri hooks for convenience
export { useTauriStore, useTauriFileSystem } from './useTauriStore';

// Check if running in Tauri environment
export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Get platform info
const TAURI_OS_SPECIFIER = '@tauri-apps/' + 'plugin-os';

const getTauriOS = async () => {
  if (!isTauri()) return null;
  try {
    return await import(/* @vite-ignore */ TAURI_OS_SPECIFIER);
  } catch {
    return null;
  }
};

export async function getPlatformInfo() {
  if (!isTauri()) {
    return {
      platform: 'web',
      arch: 'unknown',
      locale: navigator.language,
    };
  }

  try {
    const os = await getTauriOS();
    if (!os) throw new Error('Tauri OS plugin not available');

    const { platform, arch, locale } = os as {
      platform: () => Promise<string>;
      arch: () => Promise<string>;
      locale: () => Promise<string>;
    };

    return {
      platform: await platform(),
      arch: await arch(),
      locale: await locale(),
    };
  } catch (error) {
    console.warn('Failed to get platform info:', error);
    return {
      platform: 'unknown',
      arch: 'unknown',
      locale: navigator.language,
    };
  }
}
