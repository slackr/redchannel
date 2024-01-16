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
    GetAgentsRequest,
    GetAgentsResponse,
    GetBuildLogResponse,
    KeyxRequest,
    KeyxResponse,
} from "../pb/c2";
import { emsg } from "../utils";

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

    constructor(protected redchannel: RedChannel, certs: TeamServerCerts, public port: number, public bindIp: string, log?: Logger) {
        this.log = log ?? new Logger();
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

    getAgents(call: grpc.ServerUnaryCall<GetAgentsRequest, GetAgentsResponse>, callback: grpc.sendUnaryData<GetAgentsResponse>): void {
        call.on("error", (args) => {
            throw new Error(`getAgents() error: ${args}`);
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
        call.on("error", (args) => {
            throw new Error(`keyx() error: ${args}`);
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
        call.on("error", (args) => {
            throw new Error(`buildImplant() error: ${args}`);
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
        call.on("error", (args) => {
            throw new Error(`getBuildLog() error: ${args}`);
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
        call.on("error", (args) => {
            throw new Error(`agentCommand() error: ${args}`);
        });

        const responseProto = AgentCommandResponse.create({
            status: CommandStatus.SUCCESS,
        });

        const agentId = call.request.agentId;
        const commandParameters = call.request.parameters;
        const agentCommand = call.request.command;
        try {
            this.redchannel.sendAgentCommand(agentId, agentCommand, commandParameters);
        } catch (e: unknown) {
            responseProto.status = CommandStatus.ERROR;
            responseProto.message = emsg(e);
        }
        callback(null, responseProto);
    }
}
