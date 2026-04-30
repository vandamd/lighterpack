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

app.use(function addRequestId(req, res, next) {
    req.uuid = uuid.v4();
    next();
});

app.use(morgan(function formatLogLine(tokens, req, res) {
    return JSON.stringify({
        'timestamp': tokens.date(req, res, 'iso'),
        'requestid': tokens.requestid(req, res),
        "remote-addr": tokens['remote-addr'](req, res),
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
}, { stream: logger.stream.write }));

const oneDay = 86400000;

app.use(compression());
app.use(express.static(`${__dirname}/public/`, { maxAge: oneDay }));

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
    app.use(createLiveApiProxy({ target: liveApiTarget }));

    const views = require('./server/views.js');
    app.use('/', views);

    logger.info('Starting up Lighterpack...');

    config.get('bindings').forEach((bind) => {
        httpServer.listen(config.get('port'), bind || undefined);
        logger.info(`Listening on [${bind}]:${config.get('port')}`);
    });
}

start().catch((error) => {
    logger.error(error);
    process.exitCode = 1;
});
