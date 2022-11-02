import chalk from "chalk";
import cliTable from "cli-table";
import * as readline from "readline";
import RedChannel, { AgentCommand } from "./redchannel";
import { emsg } from "../utils/utils";
import { CliTableWithPush } from "../utils/defs";
import Logger from "./logger";
import BaseModule, { Command, RunReturn } from "../modules/base";

class UserInterface extends Logger {
    redchannel: RedChannel;
    console: readline.Interface;

    constructor(redchannel) {
        super();
        this.redchannel = redchannel;
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
            const agentSecret = agent.secret != null ? agent.secret.toString("hex") : "n/a";
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

    completerHandler(line) {
        let completions: string[] = [];

        const command = line.split(" ")[0];
        if (command == "interact" || command == "kill") {
            completions = this.redchannel.getAllAgents(command + " ");
        } else if (command == "use") {
            completions = Object.keys(this.redchannel.modules);
        } else {
            if (this.redchannel.interact) {
                completions = Object.keys(this.redchannel.modules.agent);
            } else if (this.redchannel.usingModule) {
                completions = Object.keys(this.redchannel.modules[this.redchannel.usingModule].commands);
                completions = completions.concat(Object.keys(new BaseModule("base", "").commands));
            } else {
                completions = Object.keys(this.redchannel.modules.c2);
            }
        }

        const hits = completions.filter((c) => c.startsWith(line));
        return [hits, line];
    }

    inputHandler(input) {
        if (!input.replace(/ /g, "")) {
            this.resetPrompt();
            return;
        }

        const param = input.split(" ");
        const command = param.shift();

        if (this.redchannel.interact) {
            switch (command) {
                case "debug":
                    this.redchannel.config.debug = !this.redchannel.config.debug;
                    this.warn(`debug ${this.redchannel.config.debug ? "enabled" : "disabled"}`);
                    break;
                case "back":
                    this.redchannel.interact = null;
                    this.resetPrompt();
                    break;
                case "help":
                    this.showHelp(this.redchannel.modules.agent);
                    break;
                case "sysinfo":
                    if (!this.redchannel.interact.secret) {
                        this.error(`cannot send sysinfo to ${chalk.blue(this.redchannel.interact.id)}, start 'keyx' first`);
                        break;
                    }

                    this.info(`requesting sysinfo from ${chalk.blue(this.redchannel.interact.id)}`);

                    this.redchannel.sendCommandSysinfo();
                    break;
                case "interact":
                    const agentId = param.shift();

                    if (typeof agentId == "undefined" || agentId.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    this.redchannel.interact = this.redchannel.getAgent(agentId);
                    if (!this.redchannel.interact) {
                        this.error("agent '" + chalk.blue(this.redchannel.interact ? agentId : "") + "' not found");
                    } else {
                        this.warn("interacting with " + chalk.blue(this.redchannel.interact.id));
                        this.resetPrompt();
                    }
                    break;
                case "agents":
                    this.showAgents();
                    break;
                case "shutdown":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send shutdown to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const agentToShutdown = param.shift();
                    if (agentToShutdown !== this.redchannel.interact.id) {
                        this.warn("please confirm shutdown by entering the agent id, see 'help'");
                        break;
                    }

                    this.warn("sending shutdown command to " + chalk.blue(this.redchannel.interact.id));
                    this.redchannel.sendCommandShutdown();
                    break;
                case "shell":
                case "exec_cmd":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send command to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const executeCommand = param.join(" ");
                    if (executeCommand.length == 0) {
                        this.error("command failed, insufficient parameters, see 'help'");
                        break;
                    }

                    this.warn("sending shell command to " + chalk.blue(this.redchannel.interact.id) + "");
                    this.redchannel.sendCommandShell(executeCommand);
                    break;
                case "set":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send config to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const setting = param.shift();
                    const agentSettings = {
                        // domain: this.redchannel.config.c2.domain, // cannot set these dynamically
                        // password: this.redchannel.config.c2.password, // cannot set these dynamically
                        interval: this.redchannel.config.c2.interval,
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
                    this.success("setting '" + agentConfigToProxyMap[setting] + "' to value '" + configValue + "' on agent: " + this.redchannel.interact.id);
                    this.redchannel.sendCommandSetConfig(setConfigData);
                    break;
                case "keyx":
                    this.warn("keyx started with agent " + chalk.blue(this.redchannel.interact.id));
                    this.redchannel.sendCommandKeyx(this.redchannel.interact.id);
                    break;
                case "msg":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send msg to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const message = param.join(" ");
                    this.warn("sending message to " + chalk.blue(this.redchannel.interact.id) + "");
                    this.redchannel.queueData(this.redchannel.interact.id, AgentCommand.AGENT_MSG, message);
                    break;
                default:
                    this.error(`invalid command: ${command}, see 'help'`);
                    break;
            }
        } else if (this.redchannel.usingModule) {
            const usingModule = this.redchannel.modules[this.redchannel.usingModule] as BaseModule;
            switch (command) {
                case "reload":
                case "reset":
                    try {
                        usingModule.resetConfig();
                    } catch (ex) {
                        this.error(`error resetting module config: ${emsg(ex)}`);
                        break;
                    }
                    this.info("module configuration reset, see 'config'");
                    break;
                case "ls":
                case "info":
                case "config":
                    this.info("module config:");
                    this.info(JSON.stringify(usingModule.config, null, "  "));
                    break;
                case "help":
                    this.showHelp(usingModule);
                    break;
                case "back":
                    this.redchannel.usingModule = "";
                    this.resetPrompt();
                    break;
                case "set":
                    const settingName = param.shift();
                    const settingValue = param.join(" ");
                    if (settingValue.length === 0) {
                        this.error("please specify setting value, see 'help'");
                        break;
                    }

                    const setCommand = usingModule.commands.get(`set ${settingName}`) as Command;

                    if (setCommand.validateRegex && !setCommand.validateRegex.test(settingValue)) {
                        this.error(`invalid '${settingName}' value, see 'help'`);
                        break;
                    }
                    if (setCommand.execute) setCommand.execute(settingValue);

                    this.info("set " + settingName + " = '" + usingModule.config[settingName] + "'");
                    break;
                default:
                    // is the module command?
                    const executeCommand = usingModule.commands.get(command);
                    if (executeCommand?.execute) {
                        let commandReturn: RunReturn;
                        try {
                            commandReturn = executeCommand.execute(param);
                        } catch (ex) {
                            this.error(`error running command ${command}: ${emsg(ex)}`);
                            break;
                        }
                        this.info(commandReturn.message);
                        break;
                    }
                    this.error("invalid command: " + command + ", see 'help'");
                    break;
            }
        } else {
            // main menu
            switch (command) {
                case "debug":
                    this.redchannel.config.debug = !this.redchannel.config.debug;
                    this.warn("debug " + (this.redchannel.config.debug ? "enabled" : "disabled"));
                    break;
                case "interact":
                    const interactAgentId = param.shift();

                    if (typeof interactAgentId == "undefined" || interactAgentId.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    this.redchannel.interact = this.redchannel.getAgent(interactAgentId);
                    if (!this.redchannel.interact) {
                        this.error("agent " + chalk.blue(interactAgentId) + " not found");
                    } else {
                        this.info("interacting with " + chalk.blue(this.redchannel.interact.id) + "");
                    }
                    break;
                case "keyx":
                    this.warn("keyx started with all agents");
                    this.redchannel.sendCommandKeyx(); // null agent id will send broadcast
                    break;
                case "agents":
                    this.showAgents();
                    break;
                case "sysinfo":
                    // TODO: request sysinfo from all agents
                    break;
                case "kill":
                    const killAgentId = param.shift();

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
                case "help":
                    this.showHelp(this.redchannel.modules.c2);
                    break;
                case "use":
                    const useModuleName = param.shift();
                    if (!useModuleName) {
                        this.error("unknown module: '" + useModuleName + "', see 'help'");
                        break;
                    }
                    this.redchannel.usingModule = useModuleName;
                    this.resetPrompt();
                    break;
                default:
                    this.error(`invalid command: ${command}, see 'help'`);
                    break;
            }
        }

        this.resetPrompt();
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
        if (this.redchannel.config.debug) this.msg(msg, "debug");
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
        if (this.redchannel.interact) {
            this.console.setPrompt(chalk.red("agent(") + chalk.blue(this.redchannel.interact.id) + chalk.red(")") + prompt);
        } else if (this.redchannel.usingModule.length > 0) {
            this.console.setPrompt(this.redchannel.usingModule + prompt);
        } else {
            this.console.setPrompt(prompt);
        }
        this.console.prompt(true);
    }
}

export default UserInterface;
