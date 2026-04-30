import './css/lighterpack.scss';

import { createApp, nextTick } from 'vue';
import { createRouter, createWebHistory, RouterView } from 'vue-router';
import assignIn from 'lodash/assignIn';

import routes from './routes';
import store from './store/store';
import focusDirectives from './utils/focus';
import './utils/utils.js';

function createEventBus() {
    const listeners = new Map();

    return {
        $on(eventName, callback) {
            const eventListeners = listeners.get(eventName) || [];
            eventListeners.push(callback);
            listeners.set(eventName, eventListeners);
        },
        $off(eventName, callback) {
            if (!listeners.has(eventName)) {
                return;
            }

            if (!callback) {
                listeners.delete(eventName);
                return;
            }

            listeners.set(eventName, listeners.get(eventName).filter(listener => listener !== callback));
        },
        $emit(eventName, ...args) {
            (listeners.get(eventName) || []).forEach(listener => listener(...args));
        },
    };
}

const router = createRouter({
    history: createWebHistory(),
    routes,
});

window.Vue = {
    nextTick,
    util: {
        extend: assignIn,
    },
};
window.bus = createEventBus();
window.router = router;

bus.$on('unauthorized', () => {
    window.location.href = '/signin';
});

const app = createApp({
    components: {
        RouterView,
    },
    data() {
        return {
            path: '',
            fatal: '',
        };
    },
    watch: {
        $route(to) {
            this.path = to.path;
        },
    },
    mounted() {
        this.path = router.currentRoute.value.path;
    },
    template: '<router-view />',
});

app.use(router);
app.use(store);
app.use(focusDirectives);

store.dispatch('init')
    .then(() => {
        window.LighterPack = app.mount('#lp');
    })
    .catch(() => {
        if (!store.state.library) {
            router.push('/welcome');
        }
        window.LighterPack = app.mount('#lp');
    });
