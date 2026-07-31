import express from 'express';
import last from 'lodash/last';
import cloneDeep from 'lodash/cloneDeep';
import NodeCG from '@nodecg/types';
import { beforeEach, jest } from '@jest/globals';
import { Configschema } from 'types/schemas';

export type ReplicantChangeHandler = (newValue?: unknown, oldValue?: unknown) => void;

const defaultBundleConfig = Object.freeze({
    lastfm: {
        apiKey: 'lastfmkey123',
        secret: 'lastfmsecret456'
    },
    smashgg: {
        apiKey: 'smashggkey789'
    },
    radia: {
        url: 'radia://url',
        socketUrl: 'ws://radia.url',
        authentication: 'radia-auth-12345'
    }
});

export let replicants: {[key: string]: unknown} = {};
export const replicantChangeListeners: {[key: string]: ReplicantChangeHandler} = {};
export const requestHandlers: {[type in 'POST' | 'GET']: {[path: string]: express.RequestHandler}} = { POST: {}, GET: {} };
export const mockBundleConfig: Configschema = cloneDeep(defaultBundleConfig);
export const messageListeners: {[key: string]: (message?: unknown, cb?: () => void) => void} = {};
export const mockNodecgLog = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
};
export const mockSendMessage = jest.fn();

beforeEach(() => {
    replicants = {};
    Object.assign(mockBundleConfig, cloneDeep(defaultBundleConfig));
});

class MockNodecgLogger {
    constructor() {

    }

    info(...args: unknown[]) {
        mockNodecgLog.info(...args);
    }

    warn(...args: unknown[]) {
        mockNodecgLog.warn(...args);
    }

    error(...args: unknown[]) {
        mockNodecgLog.error(...args);
    }
}

export const mockNodecg: NodeCG.ServerAPI<Configschema> = {
    Replicant(name: string): NodeCG.ServerReplicant<unknown> {
        return {
            get value() {
                return replicants[name];
            },
            set value(newValue: unknown) {
                replicants[name] = newValue;
            },
            on: (event: string, handler: ReplicantChangeHandler) => {
                replicantChangeListeners[name] = handler;
            }
        } as NodeCG.ServerReplicant<unknown>;
    },
    // @ts-ignore
    listenFor: (messageName: string, handler: () => void) => {
        messageListeners[messageName] = handler as (message: unknown, cb?: () => void) => void;
    },
    Router: (): express.Router => ({
        // @ts-ignore
        post(path: string, ...handlers: express.RequestHandler[]) {
            requestHandlers['POST'][path] = last(handlers)!;
        },
        // @ts-ignore
        get(path: string, ...handlers: express.RequestHandler[]) {
            requestHandlers['GET'][path] = last(handlers)!;
        }
    }),
    // @ts-ignore
    log: mockNodecgLog,
    bundleConfig: mockBundleConfig,
    bundleName: 'nsg2-layouts',
    sendMessage: mockSendMessage,
    // @ts-ignore
    Logger: MockNodecgLogger,
    config: {
        logging: {
            console: {
                enabled: true,
                level: 'info',
                replicants: false,
                timestamps: true
            },
            file: {
                enabled: false,
                level: 'info',
                replicants: false,
                timestamps: true,
                path: ''
            }
        }
    } as unknown as NodeCG.ServerAPI['config']
};
