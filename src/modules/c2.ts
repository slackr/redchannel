import BaseModule from "./base";

const MODULE_DESCRIPTION = "handles redchannel c2 management";

export type C2Config = {
    domain: string;
    dns_ip: string;
    dns_port: number;
    web_ip: string;
    web_port: number;
    interval: number;
    binary_route: string;
    web_url: string;
};

export default class C2Module extends BaseModule {
    constructor(domain: string, debug: boolean, protected configFile) {
        super("c2", configFile);

        this.description = MODULE_DESCRIPTION;

        this.config = {
            domain: domain ?? "c2.redchannel.tld",
            dns_ip: "127.0.0.1",
            dns_port: 53,
            web_ip: "127.0.0.1",
            web_port: 4321,
            interval: 5000,
            binary_route: "/agent",
            debug: debug,
            web_url: "",
        };
        this.config = this.getConfigFromFile() as C2Config;

        this.defineCommands({});
    }

    run() {}
}
