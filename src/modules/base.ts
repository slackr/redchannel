import * as fs from "fs";
import _merge from "lodash.merge";
import { ModulesConfig } from "../lib/redchannel";
import { emsg } from "../utils/utils";

const DEFAULT_CONFIG: BaseModuleConfig = {};

export interface Command {
    arguments: string[];
    description: string;
    validateRegex?: RegExp;
    execute?: Function;
    executeCallbackAvailable?: boolean;
}
export interface ExecuteCallbackResult {
    message: string;
    code?: number | null;
}

export type ExecuteCallbackFunction = (result: ExecuteCallbackResult) => void;

export type CommandName = string;
export type Commands = Map<CommandName, Command>;

export interface ExecuteReturn {
    message: string;
}

export interface BaseModuleConfig {}

export default class BaseModule {
    description: string = "";
    commands: Commands;
    name: string;
    config: BaseModuleConfig;

    /**
     *
     * @param name The module name
     * @param configFile The redchannel configuration file path relative to the app root (conf/redchannel.conf)
     */
    constructor(name: string, protected configFile: string, protected mergeConfig: Partial<BaseModuleConfig>) {
        this.name = name;
        this.commands = new Map<CommandName, Command>();

        this.config = DEFAULT_CONFIG;

        // define common module commands
        this.defineCommands({
            reset: {
                arguments: [],
                description: "reset config to initial values (default << conf << cli)",
                execute: () => {
                    this.config = this.resetConfig({});
                },
            },
            config: {
                arguments: [],
                description: "view config",
                execute: () => {
                    return JSON.stringify(this.config || {}, null, 2);
                },
            },
            keyx: {
                arguments: [],
                description: "start key exchange with all agents",
            },
            agents: {
                arguments: [],
                description: "show active agents",
            },
            kill: {
                arguments: ["<agent id>"],
                description: "deletes the agent from memory, agent may reconnect",
            },
            interact: {
                arguments: ["<agent id>"],
                description: "interact with an agent",
            },
            back: {
                arguments: [],
                description: "back to c2 menu",
            },
            help: {
                arguments: [],
                description: "show available commands",
            },
            debug: {
                arguments: [],
                description: "show debug information messages",
            },
            use: {
                arguments: ["<module name>"],
                description: "use a module",
            },
            modules: {
                arguments: [],
                description: "show all modules",
            },
        });
    }

    defineCommands(commands: { [command: CommandName]: Command }) {
        for (const command of Object.keys(commands)) {
            this.commands.set(command, commands[command]);
        }
    }

    resetConfig(initialConfig: any) {
        let config: any = initialConfig;

        if (this.configFile) {
            let fullConfig: ModulesConfig;
            try {
                fullConfig = JSON.parse(fs.readFileSync(this.configFile).toString()) as ModulesConfig;
            } catch (ex) {
                throw new Error(`error parsing config file: ${emsg(ex)}`);
            }
            config = _merge(config, (fullConfig as any)[this.name]);
        }
        // mergeConfig (from cli) will trump file config
        if (this.mergeConfig) config = _merge(config, this.mergeConfig);
        return config;
    }

    run(params?: string[]): ExecuteReturn | void {}
}
