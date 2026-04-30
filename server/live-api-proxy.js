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

function headersForLiveRequest(req, target) {
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

function createLiveApiProxy(options = {}) {
    const target = new URL(options.target || DEFAULT_TARGET);
    const client = target.protocol === 'http:' ? http : https;

    return function liveApiProxy(req, res, next) {
        if (!shouldProxy(req)) {
            next();
            return;
        }

        const upstreamUrl = new URL(req.originalUrl, target);
        const upstreamRequest = client.request(upstreamUrl, {
            method: req.method,
            headers: headersForLiveRequest(req, target),
        }, (upstreamResponse) => {
            res.writeHead(
                upstreamResponse.statusCode,
                upstreamResponse.statusMessage,
                responseHeadersForLocalhost(upstreamResponse.headers),
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
