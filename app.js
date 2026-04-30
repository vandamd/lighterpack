const compression = require('compression');
const config = require('config');
const express = require('express');
const http = require('http');
const morgan = require('morgan');
const uuid = require('uuid');

const { logger } = require('./server/log.js');
const { createLiveApiProxy } = require('./server/live-api-proxy.js');

const liveApiTarget = process.env.LIGHTERPACK_API_BASE_URL || 'https://lighterpack.com';
const isProduction = config.get('environment') === 'production';

morgan.token('username', function getUsername(req) {
    return req.lighterpackusername;
});

morgan.token('requestid', function getRequestId(req) {
    return req.uuid;
});

const app = express();
const httpServer = http.createServer(app);
app.enable('trust proxy');

function isDevAssetRequest(req) {
    if (isProduction || (req.method !== 'GET' && req.method !== 'HEAD')) {
        return false;
    }

    return [
        '/@',
        '/client/',
        '/node_modules/',
        '/images/',
        '/assets/',
        '/favicon.png',
    ].some(prefix => req.path.startsWith(prefix));
}

app.use(function addRequestId(req, res, next) {
    req.uuid = uuid.v4();
    next();
});

app.use(morgan(function formatLogLine(tokens, req, res) {
    return JSON.stringify({
        'timestamp': tokens.date(req, res, 'iso'),
        'requestid': tokens.requestid(req, res),
        'remote-addr': tokens['remote-addr'](req, res),
        'method': tokens.method(req, res),
        'http-version': tokens['http-version'](req, res),
        'user-agent': tokens['user-agent'](req, res),
        'url': tokens.url(req, res),
        'status': tokens.status(req, res),
        'referrer': tokens.referrer(req, res),
        'content-length': tokens.res(req, res, 'content-length'),
        'response-time': tokens['response-time'](req, res),
        'username': tokens.username(req, res),
    });
}, {
    skip: isDevAssetRequest,
    stream: logger.stream.write,
}));

const oneDay = 86400000;

app.use(compression());
app.use(express.static(`${__dirname}/public/`, { maxAge: oneDay }));

function listen() {
    const port = config.get('port');

    config.get('bindings').forEach((bind, index) => {
        const server = index === 0 ? httpServer : http.createServer(app);

        server.listen(port, bind || undefined);
        logger.info(`Listening on [${bind}]:${port}`);
    });
}

async function start() {
    if (!isProduction) {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
            server: {
                middlewareMode: true,
                hmr: {
                    server: httpServer,
                },
            },
            appType: 'custom',
        });

        app.use(vite.middlewares);
        app.locals.vite = vite;
    }

    logger.info(`Proxying LighterPack API requests to ${liveApiTarget}`);
    app.use(createLiveApiProxy({ target: liveApiTarget, rewriteShareAssets: !isProduction }));

    const views = require('./server/views.js');
    app.use('/', views);

    logger.info('Starting up Lighterpack...');
    listen();
}

start().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});
