import { useState, useEffect, useCallback } from 'react';

// Check if running in Tauri environment
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

const TAURI_STORE_SPECIFIER = '@tauri-apps/' + 'plugin-store';
const TAURI_DIALOG_SPECIFIER = '@tauri-apps/' + 'plugin-dialog';
const TAURI_FS_SPECIFIER = '@tauri-apps/' + 'plugin-fs';

// Store instance cache
let storeInstance: any = null;

async function getStore() {
  if (!isTauri()) return null;

  if (storeInstance) return storeInstance;

  try {
    const mod = await import(/* @vite-ignore */ TAURI_STORE_SPECIFIER);
    const Store = (mod as any).Store as new (path: string) => any;
    storeInstance = new Store('optiflow-data.json');
    return storeInstance;
  } catch (error) {
    console.warn('Tauri store not available:', error);
    return null;
  }
}

export function useTauriStore<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const isAvailable = isTauri();

  // Load value on mount
  useEffect(() => {
    const loadValue = async () => {
      if (!isAvailable) {
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(`optiflow_${key}`);
          if (stored) {
            setValue(JSON.parse(stored));
          }
        } catch (error) {
          console.warn('Failed to load from localStorage:', error);
        }
        setIsLoading(false);
        return;
      }

      try {
        const store = await getStore();
        if (store) {
          const storedValue = await store.get(key);
          if (storedValue !== null && storedValue !== undefined) {
            setValue(storedValue as T);
          }
        }
      } catch (error) {
        console.warn('Failed to load from Tauri store:', error);
        // Fallback to localStorage
        try {
          const stored = localStorage.getItem(`optiflow_${key}`);
          if (stored) {
            setValue(JSON.parse(stored));
          }
        } catch {
          // Ignore
        }
      }
      setIsLoading(false);
    };

    loadValue();
  }, [key, isAvailable]);

  // Save value
  const save = useCallback(async (newValue: T) => {
    setValue(newValue);

    if (!isAvailable) {
      // Fallback to localStorage
      try {
        localStorage.setItem(`optiflow_${key}`, JSON.stringify(newValue));
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
      return;
    }

    try {
      const store = await getStore();
      if (store) {
        await store.set(key, newValue);
        await store.save();
      }
    } catch (error) {
      console.warn('Failed to save to Tauri store:', error);
      // Fallback to localStorage
      try {
        localStorage.setItem(`optiflow_${key}`, JSON.stringify(newValue));
      } catch {
        // Ignore
      }
    }
  }, [key, isAvailable]);

  // Delete value
  const remove = useCallback(async () => {
    setValue(defaultValue);

    if (!isAvailable) {
      try {
        localStorage.removeItem(`optiflow_${key}`);
      } catch (error) {
        console.warn('Failed to remove from localStorage:', error);
      }
      return;
    }

    try {
      const store = await getStore();
      if (store) {
        await store.delete(key);
        await store.save();
      }
    } catch (error) {
      console.warn('Failed to remove from Tauri store:', error);
      try {
        localStorage.removeItem(`optiflow_${key}`);
      } catch {
        // Ignore
      }
    }
  }, [key, defaultValue, isAvailable]);

  return {
    value,
    setValue: save,
    remove,
    isLoading,
    isAvailable,
  };
}

// Utility hook for file operations
export function useTauriFileSystem() {
  const isAvailable = isTauri();

  const saveFile = useCallback(async (
    content: string,
    defaultPath?: string,
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<string | null> => {
    if (!isAvailable) {
      // Fallback to browser download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultPath || 'file.txt';
      a.click();
      URL.revokeObjectURL(url);
      return defaultPath || 'file.txt';
    }

    try {
      const dialog = await import(/* @vite-ignore */ TAURI_DIALOG_SPECIFIER);
      const fs = await import(/* @vite-ignore */ TAURI_FS_SPECIFIER);

      const save = (dialog as any).save as (options?: any) => Promise<string | null>;
      const writeTextFile = (fs as any).writeTextFile as (path: string, contents: string) => Promise<void>;
      const filePath = await save({
        defaultPath,
        filters,
      });

      if (filePath) {
        await writeTextFile(filePath, content);
        return filePath;
      }
      return null;
    } catch (error) {
      console.warn('Failed to save file:', error);
      return null;
    }
  }, [isAvailable]);

  const openFile = useCallback(async (
    filters?: Array<{ name: string; extensions: string[] }>
  ): Promise<{ path: string; content: string } | null> => {
    if (!isAvailable) {
      // Fallback to file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (filters && filters.length > 0) {
          input.accept = filters.map(f => f.extensions.map(e => `.${e}`).join(',')).join(',');
        }
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({ path: file.name, content: reader.result as string });
            };
            reader.readAsText(file);
          } else {
            resolve(null);
          }
        };
        input.click();
      });
    }

    try {
      const dialog = await import(/* @vite-ignore */ TAURI_DIALOG_SPECIFIER);
      const fs = await import(/* @vite-ignore */ TAURI_FS_SPECIFIER);

      const open = (dialog as any).open as (options?: any) => Promise<string | string[] | null>;
      const readTextFile = (fs as any).readTextFile as (path: string) => Promise<string>;
      const filePath = await open({
        multiple: false,
        filters,
      });

      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath);
        return { path: filePath, content };
      }
      return null;
    } catch (error) {
      console.warn('Failed to open file:', error);
      return null;
    }
  }, [isAvailable]);

  const exportData = useCallback(async (
    data: object,
    fileName: string = 'optiflow-export.json'
  ): Promise<boolean> => {
    const content = JSON.stringify(data, null, 2);
    const result = await saveFile(content, fileName, [
      { name: 'JSON', extensions: ['json'] }
    ]);
    return result !== null;
  }, [saveFile]);

  const importData = useCallback(async <T = unknown>(): Promise<T | null> => {
    const result = await openFile([
      { name: 'JSON', extensions: ['json'] }
    ]);

    if (result) {
      try {
        return JSON.parse(result.content) as T;
      } catch (error) {
        console.warn('Failed to parse imported file:', error);
        return null;
      }
    }
    return null;
  }, [openFile]);

  return {
    isAvailable,
    saveFile,
    openFile,
    exportData,
    importData,
  };
}
