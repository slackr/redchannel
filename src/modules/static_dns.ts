import RedChannel from "../lib/redchannel";
import { Constants } from "../utils/utils";
import BaseModule from "./base";

const MODULE_DESCRIPTION = "add or remove static dns records for the dns c2";

const DEFAULT_CONFIG = {};

export type StaticDnsHost = string;
export type StaticDnsIp = string;

export type StaticDnsModuleConfig = Map<StaticDnsHost, StaticDnsIp>;

export default class StaticDnsModule extends BaseModule {
    config: Map<StaticDnsHost, StaticDnsIp>;

    constructor(protected redChannel: RedChannel, mergeConfig: Partial<StaticDnsModuleConfig>) {
        super("static_dns", redChannel.configFile, mergeConfig);

        this.description = MODULE_DESCRIPTION;

        this.config = new Map<StaticDnsHost, StaticDnsIp>(Object.entries(this.resetConfig(DEFAULT_CONFIG)));

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

    add(host: string, ip: string) {
        if (!host || !ip) throw new Error(`please enter a host and ip, see 'help'"`);
        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);
        if (!Constants.VALID_IP_REGEX.test(ip)) throw new Error(`invalid ip value, see 'help'`);

        this.config.set(host, ip);
        return { message: `added static dns record ${host} = ${ip}` };
    }

    delete(host: string) {
        if (!host) throw new Error(`please enter a host, see 'help'"`);

        if (!Constants.VALID_HOST_REGEX.test(host)) throw new Error(`invalid host value, see 'help'`);

        this.config.delete(host);
        return { message: `deleted static dns record ${host}` };
    }
}
