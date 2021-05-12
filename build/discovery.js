"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Endpoint = void 0;
const lodash_1 = __importDefault(require("lodash"));
const events_1 = __importDefault(require("events"));
const luxon_1 = require("luxon");
const bundle_1 = require("../proto/bundle");
const utils_1 = require("./utils");
const retries_1 = require("./retries");
const logging_1 = __importDefault(require("./logging"));
var DiscoveryServiceAPI = bundle_1.Ydb.Discovery.V1.DiscoveryService;
const constants_1 = require("./constants");
const noOp = () => { };
let Endpoint = /** @class */ (() => {
    class Endpoint extends bundle_1.Ydb.Discovery.EndpointInfo {
        constructor(properties, database) {
            super(properties);
            this.database = database;
            this.pessimizedAt = null;
        }
        static fromString(host) {
            const match = Endpoint.HOST_RE.exec(host);
            if (match) {
                const info = {
                    address: match[1]
                };
                if (match[2]) {
                    info.port = Number(match[2]);
                }
                return this.create(info);
            }
            throw new Error(`Provided incorrect host "${host}"`);
        }
        /*
         Update current endpoint with the attributes taken from another endpoint.
         */
        update(_endpoint) {
            // do nothing for now
            return this;
        }
        get pessimized() {
            if (this.pessimizedAt) {
                return luxon_1.DateTime.utc().diff(this.pessimizedAt).valueOf() < Endpoint.PESSIMIZATION_WEAR_OFF_PERIOD;
            }
            return false;
        }
        pessimize() {
            this.pessimizedAt = luxon_1.DateTime.utc();
        }
        toString() {
            let result = this.address;
            if (this.port) {
                result += ':' + this.port;
            }
            return result;
        }
    }
    Endpoint.HOST_RE = /^([^:]+):?(\d)*$/;
    Endpoint.PESSIMIZATION_WEAR_OFF_PERIOD = 60 * 1000;
    return Endpoint;
})();
exports.Endpoint = Endpoint;
let DiscoveryService = /** @class */ (() => {
    class DiscoveryService extends utils_1.AuthenticatedService {
        // private selfLocation: string = '';
        constructor(entryPoint, database, discoveryPeriod, authService) {
            super(entryPoint, 'Ydb.Discovery.V1.DiscoveryService', DiscoveryServiceAPI, authService);
            this.database = database;
            this.discoveryPeriod = discoveryPeriod;
            this.resolveEndpoints = noOp;
            this.rejectEndpoints = noOp;
            this.endpoints = [];
            this.currentEndpointIndex = 0;
            this.events = new events_1.default();
            this.logger = logging_1.default();
            this.endpointsPromise = new Promise((resolve, reject) => {
                this.resolveEndpoints = (endpoints) => {
                    this.updateEndpoints(endpoints);
                    resolve();
                };
                this.rejectEndpoints = reject;
            });
            this.periodicDiscoveryId = this.init();
        }
        destroy() {
            clearInterval(this.periodicDiscoveryId);
        }
        init() {
            this.discoverEndpoints(this.database)
                .then(this.resolveEndpoints)
                .catch(this.rejectEndpoints);
            return setInterval(async () => {
                await this.endpointsPromise;
                try {
                    const endpoints = await this.discoverEndpoints(this.database);
                    this.updateEndpoints(endpoints);
                }
                catch (error) {
                    this.logger.error(error);
                }
            }, this.discoveryPeriod);
        }
        updateEndpoints(endpoints) {
            const getHost = (endpoint) => endpoint.toString();
            const endpointsToAdd = lodash_1.default.differenceBy(endpoints, this.endpoints, getHost);
            const endpointsToRemove = lodash_1.default.differenceBy(this.endpoints, endpoints, getHost);
            const endpointsToUpdate = lodash_1.default.intersectionBy(this.endpoints, endpoints, getHost);
            this.logger.trace('Current endpoints %o', this.endpoints);
            this.logger.trace('Incoming endpoints %o', endpoints);
            this.logger.trace('Endpoints to add %o', endpointsToAdd);
            this.logger.trace('Endpoints to remove %o', endpointsToRemove);
            this.logger.trace('Endpoints to update %o', endpointsToUpdate);
            lodash_1.default.forEach(endpointsToRemove, (endpoint) => this.emit(constants_1.Events.ENDPOINT_REMOVED, endpoint));
            for (const current of endpointsToUpdate) {
                const newEndpoint = lodash_1.default.find(endpoints, (incoming) => incoming.toString() === current.toString());
                current.update(newEndpoint);
            }
            // endpointsToUpdate ordering is the same as this.endpoints, according to _.intersectionBy docs
            this.endpoints = endpointsToUpdate.concat(endpointsToAdd);
            // reset round-robin index in case new endpoints have been discovered or existing ones have become stale
            if (endpointsToRemove.length + endpointsToAdd.length > 0) {
                this.endpoints = lodash_1.default.shuffle(this.endpoints);
                this.currentEndpointIndex = 0;
            }
        }
        async discoverEndpoints(database) {
            const response = await this.api.listEndpoints({ database });
            const payload = utils_1.getOperationPayload(response);
            const endpointsResult = bundle_1.Ydb.Discovery.ListEndpointsResult.decode(payload);
            // this.selfLocation = endpointsResult.selfLocation;
            return lodash_1.default.map(endpointsResult.endpoints, (endpointInfo) => new Endpoint(endpointInfo, database));
        }
        emit(eventName, ...args) {
            this.events.emit(eventName, ...args);
        }
        on(eventName, callback) {
            this.events.on(eventName, callback);
        }
        ready(timeout) {
            return utils_1.withTimeout(this.endpointsPromise, timeout);
        }
        async getEndpointRR() {
            await this.endpointsPromise;
            const endpoint = this.endpoints[this.currentEndpointIndex++ % this.endpoints.length];
            this.logger.trace('getEndpointRR result: %o', endpoint);
            return endpoint;
        }
        async getEndpoint() {
            let endpoint = await this.getEndpointRR();
            let counter = 0;
            while (endpoint.pessimized && counter < this.endpoints.length) {
                endpoint = await this.getEndpointRR();
                counter++;
            }
            if (counter === this.endpoints.length) {
                this.logger.debug('All endpoints are pessimized, returning original endpoint');
            }
            return endpoint;
        }
    }
    __decorate([
        retries_1.retryable()
    ], DiscoveryService.prototype, "discoverEndpoints", null);
    return DiscoveryService;
})();
exports.default = DiscoveryService;
