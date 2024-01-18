import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";
import _merge from "lodash.merge";
import * as grpc from "@grpc/grpc-js";
import { redChannelDefinition, IRedChannel } from "../pb/c2.grpc-server";
import {
    Agent,
    AgentCommandRequest,
    AgentCommandResponse,
    BuildImplantRequest,
    BuildImplantResponse,
    CommandStatus,
    GetAgentsRequest,
    GetAgentsResponse,
    GetBuildLogResponse,
    KeyxRequest,
    KeyxResponse,
    LogLevel,
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
            buildImplant: this.buildImplant.bind(this),
            getBuildLog: this.getBuildLog.bind(this),
            agentCommand: this.agentCommand.bind(this),
            setConfig: this.setConfig.bind(this),
            streamLog: this.streamLog.bind(this),
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
        if (!this.checkAuth<GetAgentsRequest, GetAgentsResponse>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`getAgents() error: ${error}`);
            throw new Error("server error");
        });
        // const c2CommandProto = c2.C2CommandRequest.decode(data);
        const agents = this.redchannel.getAgents();
        const agentList: Agent[] = [];

        agents.forEach((agent) => {
            agentList.push(
                Agent.create({
                    agentId: agent.id,
                    lastseen: Math.floor(agent.lastseen || 0),
                    hasKeyx: agent.keyx ? true : false,
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

    keyx(call: grpc.ServerUnaryCall<KeyxRequest, KeyxRequest>, callback: grpc.sendUnaryData<KeyxResponse>): void {
        if (!this.checkAuth<KeyxRequest, KeyxRequest>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`keyx() error: ${error}`);
            throw new Error("server error");
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

    buildImplant(call: grpc.ServerUnaryCall<BuildImplantRequest, BuildImplantRequest>, callback: grpc.sendUnaryData<BuildImplantResponse>): void {
        if (!this.checkAuth<BuildImplantRequest, BuildImplantRequest>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`buildImplant() error: ${error}`);
            throw new Error("server error");
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
        if (!this.checkAuth<GetAgentsRequest, GetAgentsResponse>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`getBuildLog() error: ${error}`);
            throw new Error("server error");
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

    agentCommand(call: grpc.ServerUnaryCall<AgentCommandRequest, AgentCommandRequest>, callback: grpc.sendUnaryData<AgentCommandResponse>): void {
        if (!this.checkAuth<GetAgentsRequest, GetAgentsResponse>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`agentCommand() error: ${error}`);
            throw new Error("server error");
        });

        const responseProto = AgentCommandResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const agentId = call.request.agentId;
        const commandParameters = call.request.parameters;
        const agentCommand = call.request.command;
        try {
            this.redchannel.sendAgentCommand(agentId, agentCommand, commandParameters);
            this.log.warn(`${call.metadata.get("operator")} sent agent(${agentId}) command ${AgentCommand[agentCommand]}`);
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    setConfig(call: grpc.ServerUnaryCall<SetConfigRequest, SetConfigResponse>, callback: grpc.sendUnaryData<SetConfigResponse>): void {
        if (!this.checkAuth<SetConfigRequest, SetConfigResponse>(call)) throw new Error(`Authentication failed`);

        call.on("error", (error) => {
            this.log.error(`setConfig() error: ${error}`);
            throw new Error("server error");
        });

        const newConfig = call.request.config;
        if (!newConfig) {
            callback(
                null,
                SetConfigResponse.create({
                    status: CommandStatus.ERROR,
                    message: "invalid config supplied",
                })
            );
            return;
        }

        const responseProto = BuildImplantResponse.create({
            status: CommandStatus.SUCCESS,
        });
        try {
            this.redchannel.config = _merge(this.redchannel.config, newConfig);
            this.log.warn(`${call.metadata.get("operator")} updated c2 config`);
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }

    streamLog(call: grpc.ServerWritableStream<StreamLogRequest, StreamLogResponse>): void {
        if (!this.checkAuth<StreamLogRequest, StreamLogResponse>(call)) throw new Error(`Authentication failed`);

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
            throw new Error("server error");
        });
        call.on("close", () => {
            this.redchannel.log.eventEmitter.removeListener(eventName, streamLogCallback);
        });
        call.on("finish", () => {
            this.redchannel.log.eventEmitter.removeListener(eventName, streamLogCallback);
        });
    }
}
