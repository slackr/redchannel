import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";
import * as grpc from "@grpc/grpc-js";
import { redChannelDefinition, IRedChannel } from "../pb/c2.grpc-server";
import { Agent, CommandStatus, GetAgentsRequest, GetAgentsResponse, KeyxRequest, KeyxResponse } from "../pb/c2";

export default class TeamServer implements ServerBase {
    log: Logger;
    server: grpc.Server;
    service: IRedChannel;

    constructor(protected redchannel: RedChannel, public port: number, public bindIp: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.server = new grpc.Server();
        this.service = {
            getAgents: this.getAgents.bind(this),
            keyx: this.keyx.bind(this),
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

        agents.forEach((key, value, agent) => {
            agentList.push(
                Agent.create({
                    agentId: key.id,
                    hasKeyx: agent.get("keyx") ? true : false,
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
}
