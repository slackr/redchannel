import express, { Express } from "express";
import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";

export default class WebServer implements ServerBase {
    webServer: Express;
    log: Logger;

    constructor(protected redchannel: RedChannel, public port: number, public bindIp: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.webServer = express();
        this.setupRoutes();
    }

    start(onSuccess: OnSuccessCallback) {
        this.webServer.listen(this.port, this.bindIp, () => {
            onSuccess();
        });
    }

    setupRoutes() {
        this.webServer.get(this.redchannel.config.skimmer.data_route, this.redchannel.modules.skimmer.dataRouteHandler.bind(this.redchannel.modules.skimmer));
        this.webServer.get(this.redchannel.config.skimmer.payload_route, this.redchannel.modules.skimmer.payloadRouteHandler.bind(this.redchannel.modules.skimmer));
    }
}
