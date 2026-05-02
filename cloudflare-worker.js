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
    return '<link id="local-share-overrides" rel="stylesheet" href="/css/share-overrides.css" />';
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
