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

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value) {
    return value
        .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([0-9a-f]+);/ig, (match, code) => String.fromCharCode(parseInt(code, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function titleFromSharePage(html) {
    const titleMatch = html.match(/<h1\b[^>]*class=["'][^"']*\blpListName\b[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);

    if (!titleMatch) {
        return '';
    }

    return decodeHtmlEntities(titleMatch[1])
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function rewriteShareTitle(html) {
    const title = titleFromSharePage(html);

    if (!title) {
        return html;
    }

    const titleTag = `<title>${escapeHtml(title)}</title>`;

    if (/<title>[\s\S]*?<\/title>/i.test(html)) {
        return html.replace(/<title>[\s\S]*?<\/title>/i, titleTag);
    }

    return html.replace('</head>', `${titleTag}</head>`);
}

function rewriteSharePage(html) {
    const cacheBust = Date.now();
    const localHeadScripts = `<script type="text/javascript" src="/js/theme.js?v=local-${cacheBust}"></script>`;
    const localScripts = [
        `<script type="text/javascript" src="/js/pies.js?v=local-${cacheBust}"></script>`,
        `<script type="text/javascript" src="/js/share.js?v=local-${cacheBust}"></script>`,
    ].join('');
    const localStyles = [
        '<style id="local-share-overrides">',
        '.lpLegend{border:0;display:block;height:8px;width:8px;}',
        '.lpColorPicker{align-items:center;display:flex;height:12px;justify-content:center;position:relative;transform:translateY(-0.5px);width:12px;}',
        '.lpRow{background-image:radial-gradient(circle,var(--lp-row-separator,#aaa) 0.6px,transparent 0.7px);background-position:left top;background-repeat:repeat-x;background-size:2px 1px;}',
        '.lpRow:first-child,.lpRow.lpHeader,.lpRow.lpHeader+.lpRow,.lpFooter{background-image:none;}',
        '.lpCell{border-top:0;}',
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
        '.lp[data-theme="dark"],.lp[data-theme="dark"] body{background:#181818;color:#e6e6e6;color-scheme:dark;}',
        '.lp[data-theme="dark"]{--lp-row-separator:#555;}',
        '.lp[data-theme="dark"] #main,.lp[data-theme="dark"] .lpList{background:#181818;}',
        '.lp[data-theme="dark"] .lpCell,.lp[data-theme="dark"] .lpItem,.lp[data-theme="dark"] .lpItemsHeader,.lp[data-theme="dark"] .lpItemsFooter{border-color:#555;}',
        '.lp[data-theme="dark"] .lpRow.lpHeader .lpCell,.lp[data-theme="dark"] .lpFooter .lpCell{border-color:#666;}',
        '.lp[data-theme="dark"] .hover{background:#4a421a;}',
        '.lp[data-theme="dark"] .lpHref{color:#7cc5ff;}',
        '.lp[data-theme="dark"] input,.lp[data-theme="dark"] select,.lp[data-theme="dark"] textarea{background:#242424;border-color:#555;color:#e6e6e6;}',
        '.lp[data-theme="dark"] .lpItem:hover{background:#242424;}',
        '.lp[data-theme="dark"] .lpUnitSelect:hover,.lp[data-theme="dark"] .lpUnitSelect.lpHover,.lp[data-theme="dark"] .lpUnitSelect.lpOpen{background:#242424;border-color:#555;}',
        '.lp[data-theme="dark"] .lpUnitDropdown{background:#242424;border-color:#555;}',
        '.lp[data-theme="dark"] .lpDialog{background:#202020;color:#e6e6e6;}',
        '.lp[data-theme="dark"] .lpSprite{filter:brightness(0) invert(1);}',
        '.lp[data-theme="dark"] .lpWorn.lpActive,.lp[data-theme="dark"] .lpConsumable.lpActive,.lp[data-theme="dark"] .lpLink.lpActive,.lp[data-theme="dark"] .lpStar1,.lp[data-theme="dark"] .lpStar2,.lp[data-theme="dark"] .lpStar3,.lp[data-theme="dark"] .lpRemove:hover .lpSpriteRemove{filter:none;}',
        '.lpShare .lpShareHeader{align-items:baseline;display:flex;height:60px;justify-content:stretch;margin:10px -20px 20px;position:relative;}',
        '.lpShare .lpShareHeader #lpListName{flex:1 0 auto;font-size:24px;font-weight:600;margin:0;padding:12px 15px;}',
        '.lpShare .lpShareHeader .headerItem{flex:0 0 auto;height:100%;padding:17px 16px;position:relative;}',
        '.lpShare .lpShareThemeMode{flex:0 0 auto;}',
        '@media only screen and (max-width:720px){.lpChart{display:block;height:auto!important;margin:0 auto;max-width:100%;width:min(100%,260px)!important;}#lpFooter{align-items:center;flex-direction:column;gap:6px;justify-content:flex-start;text-align:center;}}',
        '.themeModeButton{background:transparent;border:0;color:inherit;cursor:pointer;font:inherit;font-weight:600;padding:0;}',
        '.themeModeButton:hover,.themeModeButton:focus{color:#1b77d3;outline:none;}',
        '</style>',
    ].join('');

    return rewriteShareTitle(html)
        .replace(/<script\s+src=['"]\/dist\/share\.[^'"]+\.js['"]><\/script>/, localScripts)
        .replace('</head>', `${localHeadScripts}${localStyles}</head>`);
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
