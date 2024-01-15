import * as dnsd from "dnsd2";
import Logger from "../lib/logger";
import RedChannel from "../lib/redchannel";
import { OnSuccessCallback, ServerBase } from "./base";

export default class DnsServer implements ServerBase {
    dnsServer: dnsd.Server;
    log: Logger;

    constructor(protected redchannel: RedChannel, public port: number, public bindIp: string, public domain: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.dnsServer = dnsd.createServer(this.redchannel.c2MessageHandler.bind(this.redchannel)) as dnsd.Server;
    }

    start(onSuccess: OnSuccessCallback) {
        // prettier-ignore
        this.dnsServer
            .zone(
                this.domain,
                'ns1.' + this.domain,
                'root@' + this.domain,
                'now',
                '2h',
                '30m',
                '2w',
                '10m'
            )
            .listen(this.port, this.bindIp);
        onSuccess();
    }
}
