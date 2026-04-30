import uniqueId from 'lodash/uniqueId';

import store from '../store/store.js';

export default {
    install(app) {
        app.directive('select-on-focus', {
            mounted(el) {
                el.addEventListener('focus', () => {
                    el.select();
                });
            },
        });

        app.directive('focus-on-create', {
            mounted(el, binding) {
                if (binding.expression && binding.value || !binding.expression) {
                    el.focus();
                }
            },
        });

        app.directive('focus-on-bus', {
            mounted(el, binding) {
                bus.$on(binding.value, () => {
                    el.focus();
                });
            },
        });

        app.directive('select-on-bus', {
            mounted(el, binding) {
                bus.$on(binding.value, () => {
                    el.select();
                });
            },
        });

        app.directive('empty-if-zero', {
            mounted(el) {
                el.addEventListener('focus', () => {
                    if (el.value === '0' || el.value === '0.00') {
                        el.dataset.originalValue = el.value;
                        el.value = '';
                    }
                });

                el.addEventListener('blur', () => {
                    if (el.value === '') {
                        el.value = el.dataset.originalValue || '0';
                    }
                });
            },
        });

        app.directive('click-outside', {
            mounted(el, binding) {
                const handler = (evt) => {
                    if (el.contains(evt.target)) {
                        return;
                    }
                    if (binding && typeof binding.value === 'function') {
                        binding.value();
                    }
                };

                window.addEventListener('click', handler);

                el.dataset.clickoutside = uniqueId();
                store.commit('addDirectiveInstance', { key: el.dataset.clickoutside, value: handler });
            },
            unmounted(el) {
                const handler = store.state.directiveInstances[el.dataset.clickoutside];
                store.commit('removeDirectiveInstance', el.dataset.clickoutside);
                window.removeEventListener('click', handler);
            },
        });
    },
};
