const http = require('http');
const https = require('https');

const DEFAULT_TARGET = 'https://lighterpack.com';

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

const hopByHopHeaders = [
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailer',
    'transfer-encoding',
    'upgrade',
];

function shouldProxy(req) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return true;
    }

    return !appRoutes.includes(req.path);
}

function rewriteLocalCookie(cookie) {
    return cookie
        .replace(/;\s*domain=[^;]+/ig, '')
        .replace(/;\s*secure/ig, '');
}

function headersForLiveRequest(req, target, options = {}) {
    const headers = Object.assign({}, req.headers);

    headers.host = target.host;

    if (headers.origin) {
        headers.origin = target.origin;
    }

    if (headers.referer) {
        headers.referer = new URL(req.originalUrl, target).toString();
    }

    hopByHopHeaders.forEach((header) => {
        delete headers[header];
    });

    delete headers['x-forwarded-for'];
    delete headers['x-forwarded-host'];
    delete headers['x-forwarded-port'];
    delete headers['x-forwarded-proto'];
    if (options.disableCompression) {
        delete headers['accept-encoding'];
    }

    return headers;
}

function responseHeadersForLocalhost(headers) {
    const out = Object.assign({}, headers);

    out['x-lighterpack-proxy'] = 'live';

    if (out['set-cookie']) {
        out['set-cookie'] = out['set-cookie'].map(rewriteLocalCookie);
    }

    return out;
}

function shouldRewriteSharePage(req, upstreamResponse) {
    return req.method === 'GET'
        && /^\/r\/[^/]+\/?$/.test(req.path)
        && /^text\/html\b/i.test(upstreamResponse.headers['content-type'] || '');
}

function rewriteSharePage(html) {
    const cacheBust = Date.now();
    const localScripts = [
        `<script type="text/javascript" src="/js/pies.js?v=local-${cacheBust}"></script>`,
        `<script type="text/javascript" src="/js/share.js?v=local-${cacheBust}"></script>`,
    ].join('');
    const localStyles = [
        '<style id="local-share-overrides">',
        '.lpLegend{border:0;display:block;height:8px;width:8px;}',
        '.lpColorPicker{align-items:center;display:flex;height:12px;justify-content:center;position:relative;transform:translateY(-0.5px);width:12px;}',
        '.lpTotals{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}',
        '.lpTotals .lpSummaryWeight,.lpTotals .lpSummaryWeightHeader{padding-left:16px;}',
        '.lpTotals .lpSummaryWeight{align-items:center;display:grid;grid-template-columns:var(--summary-weight-width,auto) 66px;justify-content:end;text-align:left;}',
        '.lpTotals .lpSummaryWeightHeader{display:grid;grid-template-columns:var(--summary-weight-width,auto) 66px;justify-content:end;}',
        '.lpTotals .lpSummaryWeightHeader span,.lpTotals .lpSubtotalUnit,.lpTotals .lpTotalUnit{text-align:left;}',
        '.lpTotals .lpDisplaySubtotal,.lpTotals .lpTotalValue{text-align:right;}',
        '.lpTotals .lpTotalUnit{display:block;padding-left:6px;padding-right:0;}',
        '.lpTotals .lpSubtotalUnit .lpUnitSelect,.lpTotals .lpTotalUnit .lpUnitSelect{border:0;display:grid;grid-template-columns:max-content 14px;padding:0;white-space:nowrap;}',
        '.lpTotals .lpSubtotalUnit .lpUnitSelect:hover,.lpTotals .lpSubtotalUnit .lpUnitSelect.lpHover,.lpTotals .lpTotalUnit .lpUnitSelect:hover,.lpTotals .lpTotalUnit .lpUnitSelect.lpHover{border:0;}',
        '.lpTotals .lpSubtotalUnit .lpUnitSelect .lpDisplay,.lpTotals .lpTotalUnit .lpUnitSelect .lpDisplay{width:auto;}',
        '</style>',
    ].join('');

    return html
        .replace(/<script\s+src=['"]\/dist\/share\.[^'"]+\.js['"]><\/script>/, localScripts)
        .replace('</head>', `${localStyles}</head>`);
}

function createLiveApiProxy(options = {}) {
    const target = new URL(options.target || DEFAULT_TARGET);
    const client = target.protocol === 'http:' ? http : https;
    const rewriteShareAssets = Boolean(options.rewriteShareAssets);

    return function liveApiProxy(req, res, next) {
        if (!shouldProxy(req)) {
            next();
            return;
        }

        const upstreamUrl = new URL(req.originalUrl, target);
        const rewriteCandidate = rewriteShareAssets
            && req.method === 'GET'
            && /^\/r\/[^/]+\/?$/.test(req.path);
        const upstreamRequest = client.request(upstreamUrl, {
            method: req.method,
            headers: headersForLiveRequest(req, target, { disableCompression: rewriteCandidate }),
        }, (upstreamResponse) => {
            const headers = responseHeadersForLocalhost(upstreamResponse.headers);

            if (rewriteShareAssets && shouldRewriteSharePage(req, upstreamResponse)) {
                const chunks = [];

                upstreamResponse.on('data', chunk => chunks.push(chunk));
                upstreamResponse.on('end', () => {
                    delete headers['content-length'];
                    delete headers['content-encoding'];
                    delete headers.etag;
                    delete headers['last-modified'];
                    headers['cache-control'] = 'no-store';

                    res.writeHead(
                        upstreamResponse.statusCode,
                        upstreamResponse.statusMessage,
                        headers,
                    );
                    res.end(rewriteSharePage(Buffer.concat(chunks).toString('utf8')));
                });
                return;
            }

            res.writeHead(
                upstreamResponse.statusCode,
                upstreamResponse.statusMessage,
                headers,
            );
            upstreamResponse.pipe(res);
        });

        upstreamRequest.on('error', () => {
            if (!res.headersSent) {
                res.status(502).json({ message: 'Unable to reach the live LighterPack API.' });
            }
        });

        req.pipe(upstreamRequest);
    };
}

module.exports = {
    createLiveApiProxy,
};
