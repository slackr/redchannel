import BaseModule from "./base";

export default class C2Module extends BaseModule {
    constructor(protected configFile) {
        super("c2", configFile);

        this.config = this.loadConfig;

        this.defineCommands({
            keyx: {
                arguments: [],
                description: "start key exchange with all agents",
            },
            agents: {
                arguments: [],
                description: "show active agents",
            },
            interact: {
                arguments: ["<agent id>"],
                description: "interact with an agent",
            },
            kill: {
                arguments: ["<agent id>"],
                description: "deletes the agent from memory, agent may reconnect",
            },
            debug: {
                arguments: [],
                description: "show verbose messages",
            },
            "use skimmer": {
                arguments: [],
                description: "use the skimmer module",
            },
            "use proxy": {
                arguments: [],
                description: "use the proxy module",
            },
            "use static_dns": {
                arguments: [],
                description: "use the static_dns module to add or remove static dns records",
            },
            "use implant": {
                arguments: [],
                description: "use the implant module to build agents",
            },
            help: {
                arguments: [],
                description: "show available commands",
            },
        });
    }

    run() {}
}
