import chalk from "chalk";
import cliTable from "cli-table";
import * as readline from "readline";
import RedChannel, { AgentModel } from "./redchannel";
import { emsg } from "../utils/utils";
import { CliTableWithPush } from "../utils/defs";
import Logger from "./logger";
import BaseModule, { Command, ExecuteCallbackFunction, ExecuteCallbackResult, ExecuteReturn } from "../modules/base";

import { implant } from "../pb/implant";

class UserInterface extends Logger {
    redchannel: RedChannel;
    console: readline.Interface;
    usingModule: string | null;
    /**
     * holds the agent object we are currently interacting with
     */
    interact: AgentModel | null;

    constructor(redchannel) {
        super();

        this.redchannel = redchannel;
        this.usingModule = "c2";
        this.interact = null;

        this.console = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: this.completerHandler.bind(this),
        });
        this.console.on("line", this.inputHandler.bind(this));
    }

    showAgents() {
        const rows: any[] = [];
        for (const id of this.redchannel.agents.keys()) {
            const agent = this.redchannel.agents.get(id)!;
            const agentSecret = this.hasSecret(agent) ? agent.secret.toString("hex") : "n/a";
            // prettier-ignore
            rows.push([
                chalk.blue(agent.id),
                agent.ip,
                agent.channel,
                chalk.greenBright(agentSecret),
                agent.lastseen ? new Date(agent.lastseen * 1000).toLocaleString() : "never"
            ]);
        }

        this.displayTable(["id", "src", "channel", "secret", "lastseen"], rows);
    }

    showHelp(module: BaseModule) {
        this.info(`${module.name} commands:`);

        const rows: any[] = [];
        for (const commandName of module.commands.keys()) {
            const command = module.commands.get(commandName);
            if (command) rows.push([chalk.yellow(commandName), chalk.red(command.arguments.join(" ")), chalk.yellow(command.description)]);
        }

        this.displayTable(["command", "arguments", "description"], rows);
    }

    displayTable(columns, rows) {
        const table = new cliTable({
            head: columns,
        }) as CliTableWithPush;

        rows.forEach((row) => {
            table.push(row);
        });
        this.echo(chalk.gray(table.toString()));
    }

    completerHandler(line: string) {
        if (!line) return;

        let completions: string[] = [];

        const command = line.split(" ")[0];
        switch (command) {
            case "interact":
            case "kill":
                completions = Array.from(this.redchannel.getAllAgents()).map((agentId) => `${command} ${agentId}`);
                break;
            case "use":
                completions = Object.keys(this.redchannel.modules).map((moduleName) => `use ${moduleName}`);
                break;
            default:
                if (this.usingModule) {
                    completions = Array.from(this.redchannel.modules[this.usingModule].commands.keys());
                } else {
                    completions = Array.from(this.redchannel.modules.c2.commands.keys());
                }
                break;
        }

        const hits = completions.filter((c) => c.startsWith(line));
        return [hits, line];
    }

    inputHandler(input: string) {
        if (!input.replace(/ /g, "")) {
            this.resetPrompt();
            return;
        }

        const inputParams = input.split(" ");
        if (this.interact) {
            this.processInputParamsInteract(inputParams);
        } else {
            this.processInputParamsModule(inputParams);
        }
        this.resetPrompt();
    }

    processInputParamsModule(inputParams: string[]) {
        if (!this.usingModule) this.usingModule = "c2";

        const command = inputParams.shift();
        if (!command) return;

        const usingModule = this.redchannel.modules[this.usingModule] as BaseModule;
        switch (command) {
            case "modules":
                const rows: any[] = [];
                for (const moduleName of Object.keys(this.redchannel.modules)) {
                    // prettier-ignore
                    rows.push([
                        chalk.blue(moduleName),
                        this.redchannel.modules[moduleName].description
                    ]);
                }

                this.displayTable(["module", "description"], rows);
                break;
            case "use":
                const useModuleName = inputParams.shift();
                if (!useModuleName) {
                    this.error("invalid module name, see 'help'");
                    break;
                }

                if (!this.redchannel.modules[useModuleName]) {
                    this.error("unknown module: '" + useModuleName + "', see 'help'");
                    break;
                }
                this.usingModule = useModuleName;
                this.resetPrompt();
                break;
            case "keyx":
                this.warn("keyx started with all agents");

                try {
                    this.redchannel.broadcastKeyx();
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "agents":
                this.showAgents();
                break;
            case "sysinfo":
                // TODO: request sysinfo from all agents
                break;
            case "kill":
                const killAgentId = inputParams.shift();

                if (!killAgentId) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                const agentToKill = this.redchannel.getAgent(killAgentId);
                if (!agentToKill) {
                    this.error("agent " + chalk.blue(killAgentId) + " not found");
                } else {
                    this.warn("killing " + chalk.blue(agentToKill.id) + ", agent may reconnect");
                    this.redchannel.killAgent(agentToKill.id);
                }
                break;
            case "debug":
                this.redchannel.modules.c2.config.debug = !this.redchannel.modules.c2.config.debug;
                this.warn("debug " + (this.redchannel.modules.c2.config.debug ? "enabled" : "disabled"));
                break;
            case "interact":
                const interactAgentId = inputParams.shift();

                if (typeof interactAgentId == "undefined" || interactAgentId.length == 0) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                this.interact = this.redchannel.getAgent(interactAgentId);
                if (!this.interact) {
                    this.error("agent " + chalk.blue(interactAgentId) + " not found");
                } else {
                    this.info("interacting with " + chalk.blue(this.interact.id) + "");
                }
                break;
            case "reload":
            case "reset":
                const resetCommand = usingModule.commands.get("reset");
                if (resetCommand && resetCommand.execute) {
                    this.info(resetCommand.execute());
                } else {
                    this.warn("config not available");
                }
                this.info("module configuration reset, see 'config'");
                break;
            case "ls":
            case "info":
            case "config":
                const configCommand = usingModule.commands.get("config");
                if (configCommand && configCommand.execute) {
                    this.info("module config:");
                    this.info(configCommand.execute());
                } else {
                    this.warn("config not available");
                }
                break;
            case "help":
                this.showHelp(usingModule);
                break;
            case "back":
                this.usingModule = "c2";
                this.resetPrompt();
                break;
            case "set":
                const settingName = inputParams.shift();
                if (!settingName) {
                    this.error("please specify a setting name, see 'help'");
                    break;
                }
                const settingValue = inputParams.join(" ");
                if (!settingValue) {
                    this.error("please specify a setting value, see 'help'");
                    break;
                }

                const setCommand = usingModule.commands.get(`set ${settingName}`) as Command;

                if (setCommand.validateRegex && !setCommand.validateRegex.test(settingValue)) {
                    this.error(`invalid '${settingName}' value, see 'help'`);
                    break;
                }

                let callback: ExecuteCallbackFunction = () => {};
                if (setCommand.executeCallbackAvailable) {
                    callback = (result: ExecuteCallbackResult) => {
                        this.info(result.message);
                    };
                }
                if (setCommand.execute) setCommand.execute.bind(usingModule)(settingValue, callback.bind(this));
                this.info("set " + settingName + " = '" + usingModule.config[settingName] + "'");
                break;
            default:
                // is the module a command?
                const executeCommand = usingModule.commands.get(command);
                if (executeCommand?.execute) {
                    let commandResult: ExecuteReturn;

                    let callback: ExecuteCallbackFunction = () => {};
                    if (executeCommand.executeCallbackAvailable) {
                        callback = (result: ExecuteCallbackResult) => {
                            this.info(result.message);
                        };
                    }
                    try {
                        commandResult = executeCommand.execute.bind(usingModule)(inputParams, callback.bind(this));
                    } catch (ex) {
                        this.error(`error running command ${command}: ${emsg(ex)}`);
                        break;
                    }
                    this.info(commandResult.message);
                    break;
                }
                this.error("invalid command: " + command + ", see 'help'");
                break;
        }
    }

    processInputParamsInteract(param: string[]) {
        if (!this.interact) return;

        const command = param.shift();
        if (!command) return;

        switch (command) {
            case "debug":
                this.redchannel.modules.c2.config.debug = !this.redchannel.modules.c2.config.debug;
                this.warn(`debug ${this.redchannel.modules.c2.config.debug ? "enabled" : "disabled"}`);
                break;
            case "back":
                this.interact = null;
                this.resetPrompt();
                break;
            case "help":
                this.showHelp(this.redchannel.modules.agent);
                break;
            case "sysinfo":
                if (!this.hasSecret(this.interact)) {
                    this.error(`cannot send sysinfo to ${chalk.blue(this.interact.id)}, start 'keyx' first`);
                    break;
                }

                this.info(`requesting sysinfo from ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.sendCommandSysinfo(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "interact":
                const agentId = param.shift();
                if (!agentId) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                this.interact = this.redchannel.getAgent(agentId);
                if (!this.interact) {
                    this.error("agent '" + chalk.blue(this.interact ? agentId : "") + "' not found");
                } else {
                    this.warn("interacting with " + chalk.blue(this.interact.id));
                    this.resetPrompt();
                }
                break;
            case "agents":
                this.showAgents();
                break;
            case "shutdown":
                if (!this.hasSecret(this.interact)) {
                    this.error("cannot send shutdown to " + chalk.blue(this.interact.id) + ", start 'keyx' first");
                    break;
                }

                const agentToShutdown = param.shift();
                if (agentToShutdown !== this.interact.id) {
                    this.warn("please confirm shutdown by entering the agent id, see 'help'");
                    break;
                }

                this.warn("sending shutdown command to " + chalk.blue(this.interact.id));

                try {
                    this.redchannel.sendCommandShutdown(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "shell":
            case "exec_cmd":
                if (!this.hasSecret(this.interact)) {
                    this.error("cannot send command to " + chalk.blue(this.interact.id) + ", start 'keyx' first");
                    break;
                }

                const executeCommand = param.join(" ");
                if (executeCommand.length == 0) {
                    this.error("command failed, insufficient parameters, see 'help'");
                    break;
                }

                this.warn("sending shell command to " + chalk.blue(this.interact.id) + "");

                try {
                    this.redchannel.sendCommandShell(this.interact.id, executeCommand);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "set":
                if (!this.hasSecret(this.interact)) {
                    this.error("cannot send config to " + chalk.blue(this.interact.id) + ", start 'keyx' first");
                    break;
                }

                const setting = param.shift();
                if (!setting) {
                    this.error("please specify a setting, see 'help'");
                    break;
                }

                const agentSettings = {
                    // domain: this.redchannel.modules.c2.config.c2.domain, // cannot set these dynamically
                    // password: this.redchannel.modules.c2.config.c2.password, // cannot set these dynamically
                    interval: this.redchannel.modules.c2.config.interval,
                    proxy_enabled: this.redchannel.modules.proxy.config.enabled,
                    proxy_url: this.redchannel.modules.proxy.config.url,
                    proxy_key: this.redchannel.modules.proxy.config.key,
                };

                const agentConfigToProxyMap = {
                    domain: "d",
                    interval: "i",
                    password: "p",
                    proxy_enabled: "pe",
                    proxy_url: "pu",
                    proxy_key: "pk",
                };

                if (!Object.keys(agentSettings).includes(setting)) {
                    this.error("invalid config setting, see 'help'");
                    break;
                }

                let configValue = param.join(" ");
                if (configValue.length === 0) {
                    this.error("please specify config setting value, see 'help'");
                    break;
                }

                // TODO: regex validate value
                const settingType = typeof agentSettings[setting];
                switch (settingType) {
                    case "boolean":
                        configValue = ["off", "0", "false", "no"].includes(configValue) ? "false" : "true";
                        break;
                    default:
                        // numbers, strings, etc
                        break;
                }

                const setConfigData = agentConfigToProxyMap[setting] + "=" + configValue;

                // if changing the c2 password, issue keyx again
                this.success("setting '" + agentConfigToProxyMap[setting] + "' to value '" + configValue + "' on agent: " + this.interact.id);

                try {
                    this.redchannel.sendCommandSetConfig(this.interact.id, setConfigData);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "keyx":
                this.warn("keyx started with agent " + chalk.blue(this.interact.id));

                try {
                    this.redchannel.sendCommandKeyx(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "msg":
                if (!this.hasSecret(this.interact)) {
                    this.error("cannot send msg to " + chalk.blue(this.interact.id) + ", start 'keyx' first");
                    break;
                }

                const message = param.join(" ");
                this.warn("sending message to " + chalk.blue(this.interact.id) + "");

                try {
                    this.redchannel.queueData(this.interact.id, implant.AgentCommand.AGENT_MESSAGE, Buffer.from(message));
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            default:
                this.error(`invalid command: ${command}, see 'help'`);
                break;
        }
    }

    hasSecret(agent: AgentModel) {
        return agent.secret && agent.secret.length > 0;
    }

    error(msg) {
        this.msg(msg, "error");
    }
    warn(msg) {
        this.msg(msg, "warn");
    }
    info(msg) {
        this.msg(msg, "info");
    }
    debug(msg) {
        if (this.redchannel.modules.c2.config.debug) this.msg(msg, "debug");
    }
    success(msg) {
        this.msg(msg, "success");
    }
    echo(msg) {
        this.msg(msg, "echo");
    }
    msg(msg, level = "info") {
        if (process.stdout.clearLine) process.stdout.clearLine(0);
        if (process.stdout.cursorTo) process.stdout.cursorTo(0);

        switch (level) {
            case "debug":
                console.log(chalk.gray(`* ${msg}`));
                break;
            case "warn":
                console.log(chalk.yellowBright(`* ${msg}`));
                break;
            case "error":
                console.log(chalk.redBright(`! ${msg}`));
                break;
            case "success":
                console.log(chalk.greenBright(`* ${msg}`));
                break;
            case "echo":
                console.log(msg);
                break;
            case "info":
            default:
                console.log(chalk.gray(`* ${msg}`));
                break;
        }
        this.resetPrompt();
    }

    resetPrompt() {
        const prompt = chalk.red("> ");
        if (this.interact) {
            this.console.setPrompt(chalk.red("agent(") + chalk.blue(this.interact.id) + chalk.red(")") + prompt);
        } else if (this.usingModule) {
            this.console.setPrompt(this.usingModule + prompt);
        } else {
            this.console.setPrompt(prompt);
        }
        this.console.prompt(true);
    }
}

export default UserInterface;
