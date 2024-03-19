const path = require('path');

const NodeHttpAdapter = require('@pollyjs/adapter-node-http');
const { MODES } = require('@pollyjs/utils');
const { Polly, setupMocha: setupPolly } = require('@pollyjs/core');
const FilteringFSPersister = require('#filter-fs-persister');

Polly.register(NodeHttpAdapter);
Polly.register(FilteringFSPersister);

const pollyMode = process.env.POLLY_MODE || MODES.REPLAY;
// const recordIfMissing = (process.env.CI !== 'true');

const pollyConfiguration = {
    mode: pollyMode,
    adapters: ['node-http'],
    persister: 'filter-fs',
    persisterOptions: {
        'filter-fs': {
            recordingsDir: path.resolve(__dirname, './recordings'),
            filter: {
                request: {
                    cookies: ['_anchor_session'],
                    headers: ['authorization'],
                    body: {
                        payload: '<PAYLOAD>',
                        protected: '<PROTECTED>',
                        signature: '<SIGNATURE>'
                    }
                },
                response: {
                    cookies: ['_anchor_session'],
                    headers: [],
                    body: { }
                }
            }
        },
        fs: {
            recordingsDir: path.resolve(__dirname, './recordings')
        }
    },
    recordIfMissing: false,
    recordFailedRequests: false,
    // logLevel: 'info',
    matchRequestsBy: {
        method: true,
        headers: false,
        body: false,
        order: true,
        url: {
            protocol: true,
            username: true,
            password: true,
            hostname: true,
            port: true,
            pathname: true,
            query: true,
            hash: false
        }
    }
};
module.exports = {
    setupPolly,
    pollyConfiguration
};
