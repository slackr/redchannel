import { Server as SocketIoServer, DisconnectReason } from "socket.io";
import { createServer, Server as HttpServer } from "http";
import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";

export default class SocketServer {
    httpServer: HttpServer;
    io: SocketIoServer;
    log: Logger;

    constructor(protected redchannel: RedChannel, public port: number, public bindHost: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.httpServer = createServer();
        this.io = new SocketIoServer(this.httpServer, {});
    }

    start(onSuccess: () => void) {
        this.httpServer.listen(this.port, this.bindHost, undefined, () => {
            this.setupEvents();
            onSuccess();
        });
    }

    setupEvents() {
        this.io.on("connection", (client) => {
            this.log.info(`client connected: ${client.handshake.address}, ${client.request.connection?.remoteAddress}, ${client.handshake.headers["x-forwarded-for"]}`);
            // client.emit('message', 'Waiting for authentication...');

            client.on("init", async (data) => {
                const key = data.key;
                const operator = data.operator;

                if (!key?.length || key.length < 12) {
                    client.emit("error", "Invalid authentication token");
                    this.log.error(`invalid authentication token: ${key} from operator: ${operator}`);
                    client.disconnect();
                    return;
                }

                client.emit("message", "Authenticating...");
                if (this.redchannel.hashedPassword !== key) {
                    client.emit("error", "Authentication mismatch");
                    client.disconnect();
                    return;
                }

                client.emit("message", "Authentication successful");
                this.log.info(`${operator} authenticated successfully`);

                client.data = { operator: operator, isAuthenticated: true };

                client.on("disconnect", (reason: DisconnectReason) => {
                    this.log.info(`${operator ?? "unknown operator"} disconnected: ${reason}`);
                });
            });
        });
    }
}
