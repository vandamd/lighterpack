(function () {
    const storageKey = 'themeMode';
    const modes = ['auto', 'dark', 'light'];
    const labels = {
        auto: 'Auto Theme',
        dark: 'Dark Theme',
        light: 'Light Theme',
    };
    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function normaliseMode(mode) {
        return modes.indexOf(mode) > -1 ? mode : 'auto';
    }

    function getThemeMode() {
        try {
            return normaliseMode(window.localStorage.getItem(storageKey));
        } catch (error) {
            return 'auto';
        }
    }

    function effectiveTheme(mode) {
        const normalisedMode = normaliseMode(mode);
        if (normalisedMode !== 'auto') {
            return normalisedMode;
        }
        return mediaQuery && mediaQuery.matches ? 'dark' : 'light';
    }

    function applyThemeMode(mode) {
        const normalisedMode = normaliseMode(mode);
        document.documentElement.dataset.themeMode = normalisedMode;
        document.documentElement.dataset.theme = effectiveTheme(normalisedMode);
    }

    function setThemeMode(mode) {
        const normalisedMode = normaliseMode(mode);
        try {
            window.localStorage.setItem(storageKey, normalisedMode);
        } catch (error) {
            // Ignore storage failures; the visual preference can still apply for this page view.
        }
        applyThemeMode(normalisedMode);
        return normalisedMode;
    }

    function nextThemeMode(mode) {
        const currentIndex = modes.indexOf(normaliseMode(mode));
        return modes[(currentIndex + 1) % modes.length];
    }

    function labelForMode(mode) {
        return labels[normaliseMode(mode)];
    }

    window.lighterpackTheme = {
        modes,
        getThemeMode,
        setThemeMode,
        nextThemeMode,
        labelForMode,
        applyThemeMode,
    };

    if (mediaQuery) {
        const updateAutoTheme = function () {
            if (getThemeMode() === 'auto') {
                applyThemeMode('auto');
            }
        };

        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', updateAutoTheme);
        } else if (mediaQuery.addListener) {
            mediaQuery.addListener(updateAutoTheme);
        }
    }

    applyThemeMode(getThemeMode());
}());
