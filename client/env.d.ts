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
    }

    const bus: Window['bus'];
    const router: Router;
    const Vue: Window['Vue'];
}

export {};
