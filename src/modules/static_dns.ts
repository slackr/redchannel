import { Constants } from "../utils/utils";
import BaseModule from "./base";

const MODULE_DESCRIPTION = "add or remove static dns records for the dns c2";

export type StaticDnsHost = string;
export type StaticDnsIp = string;

export default class StaticDnsModule extends BaseModule {
    config: Map<StaticDnsHost, StaticDnsIp>;

    constructor(protected configFile) {
        super("static_dns", configFile);

        this.description = MODULE_DESCRIPTION;

        this.config = new Map<StaticDnsHost, StaticDnsIp>(Object.entries(this.loadConfig()));

        this.defineCommands({
            add: {
                arguments: ["<host>", "<ip>"],
                description: "add a static DNS A record",
                execute: (params: string[]) => {
                    this.add(params[0], params[1]);
                },
            },
            delete: {
                arguments: ["<host>"],
                description: "delete static DNS A record",
                execute: (params: string[]) => {
                    this.delete(params[0]);
                },
            },
        });
    }

    run() {}

    add(host, ip) {
        if (!host || !ip) throw new Error(`please enter a host and ip, see 'help'"`);
        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);
        if (!Constants.VALID_IP_REGEX.test(ip)) throw new Error(`invalid ip value, see 'help'`);

        this.config[host] = ip;
        return { message: `added static dns record ${host} = ${ip}` };
    }

    delete(host: string) {
        if (!host) throw new Error(`please enter a host, see 'help'"`);

        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);

        this.config.delete(host);
        return { message: `deleted static dns record ${host}` };
    }
}
