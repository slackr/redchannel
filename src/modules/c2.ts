import _merge from "lodash.merge";

import RedChannel from "../lib/redchannel";
import BaseModule from "./base";

const MODULE_DESCRIPTION = "handles redchannel c2 management";

const DEFAULT_CONFIG: C2ModuleConfig = {
    domain: "c2.redchannel.tld",
    dns_ip: "127.0.0.1",
    dns_port: 53,
    web_ip: "127.0.0.1",
    web_port: 4321,
    interval: 5000,
    binary_route: "/agent",
    debug: true,
    web_url: "",
};

export type C2ModuleConfig = {
    domain: string;
    dns_ip: string;
    dns_port: number;
    web_ip: string;
    web_port: number;
    interval: number;
    binary_route: string;
    web_url: string;
    debug: boolean;
};

export default class C2Module extends BaseModule {
    config: C2ModuleConfig;

    constructor(protected redChannel: RedChannel, mergeConfig: Partial<C2ModuleConfig>) {
        super("c2", redChannel.configFile, mergeConfig);

        this.description = MODULE_DESCRIPTION;

        this.config = this.resetConfig(DEFAULT_CONFIG);

        this.defineCommands({});
    }

    run() {}
}
