// Type declarations for Tauri plugins
// These plugins are only available when running in a Tauri environment
// The actual imports are done dynamically at runtime

declare module '@tauri-apps/plugin-store' {
  export class Store {
    constructor(path: string);
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<boolean>;
    keys(): Promise<string[]>;
    clear(): Promise<void>;
    save(): Promise<void>;
    load(): Promise<void>;
  }
}

declare module '@tauri-apps/plugin-dialog' {
  export interface SaveDialogOptions {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    title?: string;
  }

  export interface OpenDialogOptions {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    multiple?: boolean;
    directory?: boolean;
    title?: string;
  }

  export function save(options?: SaveDialogOptions): Promise<string | null>;
  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function message(message: string, options?: { title?: string; type?: 'info' | 'warning' | 'error' }): Promise<void>;
  export function ask(message: string, options?: { title?: string; type?: 'info' | 'warning' | 'error' }): Promise<boolean>;
}

declare module '@tauri-apps/plugin-fs' {
  export function readTextFile(path: string): Promise<string>;
  export function writeTextFile(path: string, contents: string): Promise<void>;
  export function exists(path: string): Promise<boolean>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readDir(path: string): Promise<Array<{ name: string; isDirectory: boolean; isFile: boolean }>>;
  export function rename(oldPath: string, newPath: string): Promise<void>;
  export function remove(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function copyFile(source: string, destination: string): Promise<void>;
}

declare module '@tauri-apps/plugin-os' {
  export function platform(): Promise<string>;
  export function arch(): Promise<string>;
  export function locale(): Promise<string>;
  export function version(): Promise<string>;
}

declare module '@tauri-apps/plugin-shell' {
  export function open(path: string): Promise<void>;
}

declare module '@tauri-apps/plugin-process' {
  export function relaunch(): Promise<void>;
  export function exit(code?: number): Promise<void>;
}
