import express, { Express } from "express";
import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";

export default class WebServer implements ServerBase {
    webServer: Express;
    log: Logger;

    constructor(protected redchannel: RedChannel, public port: number, public bindIp: string) {
        this.log = this.redchannel.log ?? new Logger();
        this.webServer = express();
        this.setupRoutes();
    }

    start(onSuccess: OnSuccessCallback) {
        this.webServer.listen(this.port, this.bindIp, () => {
            onSuccess();
        });
    }

    setupRoutes() {
        if (!this.redchannel.config.skimmer?.dataRoute) {
            this.log.error(`invalid skimmer dataRoute`);
            return;
        }
        if (!this.redchannel.config.skimmer?.payloadRoute) {
            this.log.error(`invalid skimmer payloadRoute`);
            return;
        }

        this.webServer.get(this.redchannel.config.skimmer?.dataRoute, this.redchannel.modules.skimmer.dataRouteHandler.bind(this.redchannel.modules.skimmer));
        this.webServer.get(this.redchannel.config.skimmer?.payloadRoute, this.redchannel.modules.skimmer.payloadRouteHandler.bind(this.redchannel.modules.skimmer));
    }
}
