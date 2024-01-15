import { Server as SocketIoServer, DisconnectReason } from "socket.io";
import { createServer, Server as HttpsServer } from "http";
import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";
import * as c2 from "../pb/c2";

export default class SocketServer implements ServerBase {
    httpServer: HttpsServer;
    io: SocketIoServer;
    log: Logger;

    constructor(protected redchannel: RedChannel, public port: number, public bindIp: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.httpServer = createServer();
        this.io = new SocketIoServer(this.httpServer, {});
    }

    start(onSuccess: OnSuccessCallback) {
        this.httpServer.listen(this.port, this.bindIp, undefined, () => {
            this.setupEvents();
            onSuccess();
        });
    }

    setupEvents() {
        this.io.use((client, next) => {
            this.log.info(client.eventNames());
            next();
        });

        this.io.on("connection", (client) => {
            this.log.debug(
                `incoming operator - address: ${client.handshake.address}, remoteAddress: ${client.request.connection?.remoteAddress}, xff: ${
                    client.handshake.headers["x-forwarded-for"] || "n/a"
                }, awaiting auth...`
            );

            client.on("disconnect", (reason: DisconnectReason) => {
                const operator = client.data.operator || "unknown operator";
                this.log.info(`${operator} disconnected: ${reason}`);
            });

            client.on(c2.ServerEvent[c2.ServerEvent.AUTH], (data) => {
                const key = data.key;
                const operator = data.operator;

                if (!key?.length || key.length < 12) {
                    client.emit(c2.ServerEvent[c2.ServerEvent.ERROR], "Invalid authentication token");
                    this.log.error(`invalid authentication token: ${key} from operator: ${operator}`);
                    client.disconnect();
                    return;
                }

                if (this.redchannel.hashedPassword !== key) {
                    client.emit(c2.ServerEvent[c2.ServerEvent.ERROR], "Authentication failed, key mismatch");
                    client.disconnect();
                    return;
                }

                client.emit(c2.ServerEvent[c2.ServerEvent.MESSAGE], "Authentication successful");

                client.data = { operator: operator, isAuthenticated: true };
                this.log.info(`${operator} connected.`);
            });

            client.on(c2.C2Command[c2.C2Command.GET_AGENTS], () => {
                if (!client.data.isAuthenticated) return;

                // const c2CommandProto = c2.C2CommandRequest.decode(data);
                const agents = this.redchannel.getAgents();
                const agentList: c2.Agent[] = [];

                agents.forEach((key, value, agent) => {
                    agentList.push(
                        c2.Agent.create({
                            agentId: key.id,
                            hasKeyx: agent.get("keyx") ? true : false,
                        })
                    );
                });

                const responseProto = c2.GetAgentsResponse.create({
                    agents: agentList,
                    status: c2.CommandStatus.SUCCESS,
                });

                client.emit(c2.C2Command[c2.C2Command.GET_AGENTS], responseProto);
            });
        });
    }
}
