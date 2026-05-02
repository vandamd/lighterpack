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
    const localStyles = `<link id="local-share-overrides" rel="stylesheet" href="/css/share-overrides.css?v=local-${cacheBust}" />`;
    const localScripts = [
        `<script type="text/javascript" src="/js/pies.js?v=local-${cacheBust}"></script>`,
        `<script type="text/javascript" src="/js/share.js?v=local-${cacheBust}"></script>`,
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
