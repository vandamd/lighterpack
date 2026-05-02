import fs from 'node:fs';

const files = [
    'server/live-api-proxy.js',
    'cloudflare-worker.js',
];

const forbiddenPatterns = [
    /<style id=["']local-share-overrides["']>/,
    /\.lpTotals\{/,
    /\.lpShare \.lpShareHeader\{/,
    /@media only screen and \(max-width:720px\).*#lpFooter/,
];

const failures = files.flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');

    return forbiddenPatterns
        .filter(pattern => pattern.test(source))
        .map(pattern => `${file} contains duplicated share override CSS matching ${pattern}`);
});

if (failures.length) {
    console.error(failures.join('\n'));
    console.error('Put shared share-page override CSS in public/css/share-overrides.css instead.');
    process.exitCode = 1;
}
