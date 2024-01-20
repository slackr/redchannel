import Logger from "../lib/logger";
import { RedChannelConfig } from "../pb/config";
import { Constants } from "../utils";
import { Module } from "./base";

export default class StaticDnsModule implements Module {
    log: Logger;

    constructor(protected config: RedChannelConfig, log?: Logger) {
        this.log = log ?? new Logger();
        // this.defineCommands({
        //     add: {
        //         arguments: ["<host>", "<ip>"],
        //         description: "add a static DNS A record",
        //         execute: (params: string[]) => {
        //             this.add(params[0], params[1]);
        //         },
        //     },
        //     delete: {
        //         arguments: ["<host>"],
        //         description: "delete static DNS A record",
        //         execute: (params: string[]) => {
        //             this.delete(params[0]);
        //         },
        //     },
        // });
    }

    execute() {
        this.log.info(this.config.staticDns);
        return;
    }

    add(host: string, ip: string) {
        if (!host || !ip) throw new Error("please enter a host and ip");
        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error("invalid host value");
        if (!Constants.VALID_IP_REGEX.test(ip)) throw new Error("invalid ip value");

        this.config.staticDns[host] = ip;
        return { message: `added static dns record ${host} = ${ip}` };
    }

    delete(host: string) {
        if (!host) throw new Error("please enter a host to delete");

        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error("invalid host value");

        delete this.config.staticDns[host];
        this.log.info(`deleted static dns record ${host}`);
    }
}
