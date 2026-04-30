const liveApiTarget = 'https://lighterpack.com';

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

function shouldServeAppShell(request, url) {
    return (request.method === 'GET' || request.method === 'HEAD') && appRoutes.includes(url.pathname);
}

function shouldRewriteSharePage(request, response, url) {
    return request.method === 'GET'
        && /^\/r\/[^/]+\/?$/.test(url.pathname)
        && /^text\/html\b/i.test(response.headers.get('content-type') || '');
}

function headersForLiveRequest(request, targetUrl) {
    const headers = new Headers(request.headers);

    headers.set('host', targetUrl.host);

    if (headers.has('origin')) {
        headers.set('origin', targetUrl.origin);
    }

    if (headers.has('referer')) {
        headers.set('referer', new URL(request.url).toString());
    }

    hopByHopHeaders.forEach(header => headers.delete(header));

    headers.delete('accept-encoding');
    headers.delete('x-forwarded-for');
    headers.delete('x-forwarded-host');
    headers.delete('x-forwarded-port');
    headers.delete('x-forwarded-proto');

    return headers;
}

function rewriteLocalCookie(cookie) {
    return cookie
        .replace(/;\s*domain=[^;]+/ig, '')
        .replace(/;\s*secure/ig, '');
}

function responseHeadersForLocalhost(headers) {
    const out = new Headers(headers);

    out.set('x-lighterpack-proxy', 'live');

    const cookies = out.getSetCookie ? out.getSetCookie() : [];
    if (cookies.length) {
        out.delete('set-cookie');
        cookies.forEach(cookie => out.append('set-cookie', rewriteLocalCookie(cookie)));
    }

    return out;
}

function localScripts() {
    return [
        '<script type="text/javascript" src="/js/pies.js"></script>',
        '<script type="text/javascript" src="/js/share.js"></script>',
    ].join('');
}

function localShareStyles() {
    return [
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
        '.themeModeButton{background:transparent;border:0;color:inherit;cursor:pointer;font:inherit;font-weight:600;padding:0;}',
        '.themeModeButton:hover,.themeModeButton:focus{color:#1b77d3;outline:none;}',
        '</style>',
    ].join('');
}

function rewriteSharePage(html) {
    return html
        .replace(/<script\s+src=['"]\/dist\/share\.[^'"]+\.js['"]><\/script>/, localScripts())
        .replace('</head>', `<script type="text/javascript" src="/js/theme.js"></script>${localShareStyles()}</head>`);
}

async function serveAsset(env, request, pathname) {
    const url = new URL(request.url);
    url.pathname = pathname;
    return env.ASSETS.fetch(new Request(url, request));
}

async function proxyLiveRequest(request, url) {
    const upstreamUrl = new URL(url.pathname + url.search, liveApiTarget);
    const upstreamRequest = new Request(upstreamUrl, {
        body: request.body,
        headers: headersForLiveRequest(request, upstreamUrl),
        method: request.method,
        redirect: 'manual',
    });
    const upstreamResponse = await fetch(upstreamRequest);
    const headers = responseHeadersForLocalhost(upstreamResponse.headers);

    if (shouldRewriteSharePage(request, upstreamResponse, url)) {
        headers.delete('content-length');
        headers.delete('content-encoding');
        headers.delete('etag');
        headers.delete('last-modified');
        headers.set('cache-control', 'no-store');

        return new Response(rewriteSharePage(await upstreamResponse.text()), {
            headers,
            status: upstreamResponse.status,
            statusText: upstreamResponse.statusText,
        });
    }

    return new Response(upstreamResponse.body, {
        headers,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
    });
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (shouldServeAppShell(request, url)) {
            return serveAsset(env, request, '/index.html');
        }

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            return proxyLiveRequest(request, url);
        }

        const assetResponse = await env.ASSETS.fetch(request);
        if (assetResponse.status !== 404) {
            return assetResponse;
        }

        return proxyLiveRequest(request, url);
    },
};
