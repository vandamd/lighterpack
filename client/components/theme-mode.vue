<template>
    <span class="headerItem themeMode">
        <button class="themeModeButton" type="button" :title="title" @click="cycleTheme">
            {{ label }}
        </button>
    </span>
</template>

<script>
export default {
    name: 'ThemeMode',
    data() {
        return {
            mode: window.lighterpackTheme.getThemeMode(),
        };
    },
    computed: {
        label() {
            return window.lighterpackTheme.labelForMode(this.mode);
        },
        title() {
            return `Theme: ${this.label}`;
        },
    },
    methods: {
        cycleTheme() {
            this.mode = window.lighterpackTheme.setThemeMode(
                window.lighterpackTheme.nextThemeMode(this.mode),
            );
        },
    },
};
</script>
