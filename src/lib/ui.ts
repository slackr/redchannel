import chalk from "chalk";
import cliTable from "cli-table";
import * as readline from "readline";
import RedChannel, { AgentModel } from "./redchannel";
import { emsg } from "../utils/utils";
import { CliTableWithPush } from "../utils/defs";
import Logger from "./logger";
import BaseModule, { ExecuteCallbackFunction, ExecuteCallbackResult, ExecuteReturn } from "../modules/base";

import { implant } from "../pb/implant";

class UserInterface extends Logger {
    redchannel: RedChannel;
    console: readline.Interface;
    usingModule: string | null;
    /**
     * holds the agent object we are currently interacting with
     */
    interact: AgentModel | null;

    constructor(redchannel: RedChannel) {
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

    displayTable(columns: string[], rows: string[][]) {
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
                    completions = Array.from((this.redchannel.modules as any)[this.usingModule].commands.keys());
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

        const command = inputParams.shift();
        if (!command) return;

        if (this.interact) {
            this.processInputParamsInteract(command, inputParams);
        } else {
            this.processInputParamsModule(command, inputParams);
        }
        this.resetPrompt();
    }

    processInputParamsModule(command: string, inputParams: string[]) {
        // when not using a module explicitly, set it to default: c2
        if (!this.usingModule) this.usingModule = "c2";

        const usingModule = (this.redchannel.modules as any)[this.usingModule] as BaseModule;
        switch (command) {
            case "modules":
                const rows: any[] = [];
                for (const moduleName of Object.keys(this.redchannel.modules)) {
                    // prettier-ignore
                    rows.push([
                        chalk.blue(moduleName),
                        (this.redchannel.modules as any)[moduleName].description
                    ]);
                }

                this.displayTable(["module", "description"], rows);
                break;
            case "use":
                const useModuleName = inputParams.shift();
                if (!useModuleName) {
                    this.error("invalid module name, see 'modules'");
                    break;
                }

                if (!(this.redchannel.modules as any)[useModuleName]) {
                    this.error(`unknown module: '${useModuleName}', see 'modules'`);
                    break;
                }
                this.usingModule = useModuleName;
                this.interact = null;
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
            case "delete":
            case "kill":
                const deleteAgentId = inputParams.shift();

                if (!deleteAgentId) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                const agentToDelete = this.redchannel.getAgent(deleteAgentId);
                if (!agentToDelete) {
                    this.error(`agent ${chalk.blue(deleteAgentId)} not found`);
                } else {
                    this.warn(`deleting ${chalk.blue(agentToDelete.id)}, agent may reconnect`);
                    this.redchannel.killAgent(agentToDelete.id);
                }
                break;
            case "debug":
                this.redchannel.modules.c2.config.debug = !this.redchannel.modules.c2.config.debug;
                this.warn(`debug ${this.redchannel.modules.c2.config.debug ? "enabled" : "disabled"}`);
                break;
            case "interact":
                const interactAgentId = inputParams.shift();

                if (!interactAgentId) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                this.interact = this.redchannel.getAgent(interactAgentId);
                if (!this.interact) {
                    this.error(`agent ${chalk.blue(interactAgentId)} not found`);
                    break;
                }
                this.usingModule = "agent";
                this.info(`interacting with ${chalk.blue(this.interact.id)}`);
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

                const setCommand = usingModule.commands.get(`set ${settingName}`);
                if (!setCommand) {
                    this.error(`invalid setting '${settingName}', see 'help'`);
                    break;
                }

                const settingValue = inputParams.join(" ");
                if (!settingValue) {
                    this.error("please specify a setting value, see 'help'");
                    break;
                }

                if (setCommand.validateRegex && !setCommand.validateRegex?.test(settingValue)) {
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
                this.info(`set ${settingName} = ${(usingModule.config as any)[settingName]}`);
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

                if (this.usingModule === "agent" && !this.interact) {
                    this.warn("you must 'interact' with an active agent first, see 'agents'");
                    break;
                }

                this.error(`invalid command: ${command}, see 'help'`);
                break;
        }
    }

    processInputParamsInteract(command: string, inputParams: string[]) {
        if (!this.interact) return;
        const usingModule = this.redchannel.modules.agent as BaseModule;

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
                const agentId = inputParams.shift();
                if (!agentId) {
                    this.error("please specify an agent id, see 'agents'");
                    break;
                }

                this.interact = this.redchannel.getAgent(agentId);
                if (!this.interact) {
                    this.error(`agent '${chalk.blue(agentId)}' not found`);
                } else {
                    this.warn(`interacting with ${chalk.blue(this.interact.id)}`);
                    this.resetPrompt();
                }
                break;
            case "agents":
                this.showAgents();
                break;
            case "shutdown":
                if (!this.hasSecret(this.interact)) {
                    this.error(`cannot send shutdown to ${chalk.blue(this.interact.id)}, start 'keyx' first`);
                    break;
                }

                const agentToShutdown = inputParams.shift();
                if (agentToShutdown !== this.interact.id) {
                    this.warn("please confirm shutdown by entering the agent id, see 'help'");
                    break;
                }

                this.warn(`sending shutdown command to ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.sendCommandShutdown(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "shell":
            case "exec_cmd":
                if (!this.hasSecret(this.interact)) {
                    this.error(`cannot send command to ${chalk.blue(this.interact.id)}, start 'keyx' first`);
                    break;
                }
                if (inputParams.length == 0) {
                    this.error("insufficient parameters, see 'help'");
                    break;
                }

                const executeCommand = inputParams.join(" ");
                this.warn(`sending shell command to ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.sendCommandShell(this.interact.id, executeCommand);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "keyx":
                this.warn(`keyx started with agent ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.sendCommandKeyx(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "send_config":
                if (Object.keys(this.redchannel.modules.agent.config).length === 0) {
                    this.warn(`there are no config changes for ${chalk.blue(this.interact.id)}, see 'help'`);
                    break;
                }
                this.warn(`sending config changes to ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.sendConfigChanges(this.interact.id);
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            case "set":
                const settingName = inputParams.shift();
                if (!settingName) {
                    this.error("please specify a setting name, see 'help'");
                    break;
                }

                const setCommand = usingModule.commands.get(`set ${settingName}`);
                if (!setCommand) {
                    this.error(`invalid setting '${settingName}', see 'help'`);
                    break;
                }

                const settingValue = inputParams.join(" ");
                if (!settingValue) {
                    this.error("please specify a setting value, see 'help'");
                    break;
                }

                if (setCommand.validateRegex && !setCommand.validateRegex?.test(settingValue)) {
                    this.error(`invalid '${settingName}' value, see 'help'`);
                    break;
                }

                let callback: ExecuteCallbackFunction = () => {};
                if (setCommand.executeCallbackAvailable) {
                    callback = (result: ExecuteCallbackResult) => {
                        this.info(result.message);
                    };
                }
                if (setCommand.execute) setCommand.execute?.bind(usingModule)(settingValue, callback.bind(this));
                this.info(`set ${settingName} = ${(usingModule.config as any)[settingName]}`);
                break;
            case "msg":
                if (!this.hasSecret(this.interact)) {
                    this.error(`cannot send msg to ${chalk.blue(this.interact.id)}, start 'keyx' first`);
                    break;
                }

                const message = inputParams.join(" ");
                this.warn(`sending message to ${chalk.blue(this.interact.id)}`);

                try {
                    this.redchannel.queueData(this.interact.id, implant.AgentCommand.AGENT_MESSAGE, Buffer.from(message));
                } catch (ex) {
                    this.error(emsg(ex));
                }
                break;
            default:
                this.processInputParamsModule(command, inputParams);
                break;
        }
    }

    hasSecret(agent: AgentModel) {
        return agent.secret && agent.secret.length > 0;
    }

    error(msg: string | object) {
        this.msg(msg, "error");
    }
    warn(msg: string | object) {
        this.msg(msg, "warn");
    }
    info(msg: string | object) {
        this.msg(msg, "info");
    }
    debug(msg: string | object) {
        if (this.redchannel.modules.c2.config.debug) this.msg(msg, "debug");
    }
    success(msg: string | object) {
        this.msg(msg, "success");
    }
    echo(msg: string | object) {
        this.msg(msg, "echo");
    }
    msg(msg: string | object, level = "info") {
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
