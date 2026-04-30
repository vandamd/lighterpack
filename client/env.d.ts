import type { Router } from 'vue-router';

declare global {
    interface Window {
        Vue: {
            nextTick: typeof import('vue').nextTick;
            util: {
                extend: typeof import('lodash/assignIn');
            };
        };
        bus: {
            $on(eventName: string, callback: (...args: unknown[]) => void): void;
            $off(eventName: string, callback?: (...args: unknown[]) => void): void;
            $emit(eventName: string, ...args: unknown[]): void;
        };
        router: Router;
        LighterPack: unknown;
        lighterpackTheme: {
            modes: string[];
            getThemeMode(): string;
            setThemeMode(mode: string): string;
            nextThemeMode(mode: string): string;
            labelForMode(mode: string): string;
            applyThemeMode(mode: string): void;
        };
    }

    const bus: Window['bus'];
    const router: Router;
    const Vue: Window['Vue'];
}

export {};
