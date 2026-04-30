const path = require('path');
const fs = require('fs');
const express = require('express');
const config = require('config');

const router = express.Router();

const vueRoutes = [
    { path: '/' },
    { path: '/signin' },
    { path: '/signin/reset-password' },
    { path: '/signin/forgot-username' },
    { path: '/welcome' },
    { path: '/register' },
    { path: '/forgot-password' },
    { path: '/moderation' },
];

let index = fs.readFileSync(path.join(__dirname, '../_index.html'), 'utf8');
let appScriptsHtml = '';
let appStylesHtml = '';

if (config.get('environment') === 'production') {
    const assetData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/dist/assets.json'), 'utf8'));
    const appAssetFiles = assetData.files.app;

    appAssetFiles.forEach((assetName) => {
        if (assetName.substr(assetName.length - 3) === '.js') {
            appScriptsHtml += `<script src='/dist/${assetName}'></script>`;
        } else if (assetName.substr(assetName.length - 4) === '.css') {
            appStylesHtml += `<link rel='stylesheet' href='/dist/${assetName}' />`;
        }
    });
} else {
    appScriptsHtml = '<script src=\'/dist/app.js\'></script>';
}

index = index.replace('{{styles}}', appStylesHtml);
index = index.replace('{{scripts}}', appScriptsHtml);

vueRoutes.forEach((route) => {
    router.get(route.path, (req, res) => {
        res.send(index);
    });
});

module.exports = router;
