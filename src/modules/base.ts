import * as fs from "fs";
import merge from "lodash.merge";
import { emsg } from "../utils/utils";

export interface Command {
    arguments: string[];
    description: string;
    validateRegex?: RegExp;
    execute?: Function;
}
export type CommandName = string;
export type Commands = Map<CommandName, Command>;
export interface RunReturn {
    message: string;
}

export default class BaseModule {
    description: string = "";
    commands: Commands;
    config: any;
    name: string;

    /**
     *
     * @param name The module name
     * @param configFile The redchannel configuration file path relative to the app root (conf/redchannel.conf)
     */
    constructor(name: string, protected configFile: string) {
        this.name = name;
        this.commands = new Map<CommandName, Command>();

        // define common module commands
        this.defineCommands({
            reset: {
                arguments: [],
                description: "reset config to .conf values",
                execute: this.resetConfig,
            },
            config: {
                arguments: [],
                description: "view config",
            },
            help: {
                arguments: [],
                description: "show available commands",
            },
            back: {
                arguments: [],
                description: "back to main menu",
            },
        });
    }

    defineCommands(commands: { [command: CommandName]: Command }) {
        for (const command of Object.keys(commands)) {
            this.commands.set(command, commands[command]);
        }
    }

    loadConfig() {
        return this.resetConfig();
    }
    resetConfig() {
        if (!this.configFile) return;

        let config: any;
        try {
            config = JSON.parse(fs.readFileSync(this.configFile).toString());
        } catch (ex) {
            throw new Error(`error parsing config file: ${emsg(ex)}`);
        }
        return merge(this.config, config[this.name]);
    }

    run(params?: string[]): RunReturn | void {}
}
