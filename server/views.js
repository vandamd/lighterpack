const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('config');

const router = express.Router();

const appRoutes = [
    '/',
    '/signin',
    '/signin/reset-password',
    '/signin/forgot-username',
    '/welcome',
    '/register',
    '/forgot-password',
    '/moderation',
];

function renderProductionAssets() {
    const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/dist/.vite/manifest.json'), 'utf8'));
    const entry = manifest['client/lighterpack.ts'];
    const styles = (entry.css || [])
        .map(file => `<link rel='stylesheet' href='/${file}' />`)
        .join('');
    const scripts = `<script type='module' src='/${entry.file}'></script>`;

    return { scripts, styles };
}

function renderDevelopmentAssets() {
    return {
        styles: '',
        scripts: '<script type="module" src="/client/lighterpack.ts"></script>',
    };
}

async function renderIndex(req) {
    let index = fs.readFileSync(path.join(__dirname, '../_index.html'), 'utf8');
    const assets = config.get('environment') === 'production'
        ? renderProductionAssets()
        : renderDevelopmentAssets();

    index = index.replace('{{styles}}', assets.styles);
    index = index.replace('{{scripts}}', assets.scripts);

    if (req.app.locals.vite) {
        return req.app.locals.vite.transformIndexHtml(req.originalUrl, index);
    }

    return index;
}

appRoutes.forEach((route) => {
    router.get(route, async (req, res, next) => {
        try {
            res.send(await renderIndex(req));
        } catch (error) {
            next(error);
        }
    });
});

module.exports = router;
