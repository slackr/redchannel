import chalk from "chalk";
import cliTable from "cli-table";
import * as readline from "readline";
import * as fs from "fs";
import RedChannel, { AgentCommand } from "./redchannel";
import { emsg } from "../utils/utils";
import { CliTableWithPush } from "../utils/defs";
import Logger from "./logger";
import Helper from "./helper";

const Commands = Helper.Commands();

class UserInterface extends Logger {
    redchannel: RedChannel;
    console: readline.Interface;

    constructor(redchannel) {
        super();
        this.redchannel = redchannel;
        this.console = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: this.completer_handler.bind(this),
        });
        this.console.on("line", this.input_handler.bind(this));
    }

    show_agents() {
        // this.info("agents:");
        const rows: any[] = [];
        Object.keys(this.redchannel.agents).forEach((a) => {
            const agent = this.redchannel.agents[a];
            const agentSecret = agent.secret != null ? agent.secret.toString("hex") : "n/a";
            // prettier-ignore
            rows.push([
                chalk.blue(agent.id),
                agent.ip,
                agent.channel,
                chalk.greenBright(agentSecret),
                agent.lastseen ? new Date(agent.lastseen * 1000).toLocaleString() : "never"
            ]);
        });

        this.display_table(["id", "src", "channel", "secret", "lastseen"], rows);
    }

    show_help(help_module) {
        this.info(`${help_module} commands:`);

        const rows: any[] = [];
        Object.keys(Commands[help_module]).forEach((cmd) => {
            rows.push([chalk.yellow(cmd), chalk.red(Commands[help_module][cmd]["params"].join(" ")), chalk.yellow(Commands[help_module][cmd]["desc"])]);
        });
        if (this.redchannel.using_module) {
            Object.keys(Commands.module_common).forEach((cmd) => {
                rows.push([chalk.yellow(cmd), chalk.red(Commands.module_common[cmd]["params"].join(" ")), chalk.yellow(Commands.module_common[cmd]["desc"])]);
            });
        }

        this.display_table(["command", "params", "description"], rows);
    }

    display_table(columns, rows) {
        const table = new cliTable({
            head: columns,
        }) as CliTableWithPush;

        rows.forEach((row) => {
            table.push(row);
        });
        this.echo(chalk.gray(table.toString()));
    }

    completer_handler(line) {
        let completions: string[] = [];

        const command = line.split(" ")[0];
        if (command == "interact" || command == "kill") {
            completions = this.redchannel.get_all_agents(command + " ");
        } else {
            if (this.redchannel.interact) {
                completions = Object.keys(Commands.agent);
            } else if (this.redchannel.using_module) {
                completions = Object.keys(Commands[this.redchannel.using_module]);
                completions = completions.concat(Object.keys(Commands.module_common));
            } else {
                completions = Object.keys(Commands.c2);
            }
        }

        const hits = completions.filter((c) => c.startsWith(line));
        return [hits, line];
    }

    input_handler(input) {
        if (!input.replace(/ /g, "")) {
            this.reset_prompt();
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
                    this.reset_prompt();
                    break;
                case "help":
                    this.show_help("agent");
                    break;
                case "sysinfo":
                    if (!this.redchannel.interact.secret) {
                        this.error(`cannot send sysinfo to ${chalk.blue(this.redchannel.interact.id)}, start 'keyx' first`);
                        break;
                    }

                    this.info(`requesting sysinfo from ${chalk.blue(this.redchannel.interact.id)}`);

                    this.redchannel.command_sysinfo();
                    break;
                case "interact":
                    const agentId = param.shift();

                    if (typeof agentId == "undefined" || agentId.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    this.redchannel.interact = this.redchannel.get_agent(agentId);
                    if (!this.redchannel.interact) {
                        this.error("agent '" + chalk.blue(this.redchannel.interact ? agentId : "") + "' not found");
                    } else {
                        this.warn("interacting with " + chalk.blue(this.redchannel.interact.id));
                        this.reset_prompt();
                    }
                    break;
                case "agents":
                    this.show_agents();
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
                    this.redchannel.command_shutdown();
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
                    this.redchannel.command_shell(executeCommand);
                    break;
                case "set":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send config to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const setting = param.shift();
                    const agent_settings = {
                        // domain: this.redchannel.config.c2.domain, // cannot set these dynamically
                        // password: this.redchannel.config.c2.password, // cannot set these dynamically
                        interval: this.redchannel.config.c2.interval,
                        proxy_enabled: this.redchannel.config.proxy.enabled,
                        proxy_url: this.redchannel.config.proxy.url,
                        proxy_key: this.redchannel.config.proxy.key,
                    };

                    const config_name_map = {
                        domain: "d",
                        interval: "i",
                        password: "p",
                        proxy_enabled: "pe",
                        proxy_url: "pu",
                        proxy_key: "pk",
                    };

                    if (!Object.keys(agent_settings).includes(setting)) {
                        this.error("invalid config setting, see 'help'");
                        break;
                    }

                    let configValue = param.join(" ");
                    if (configValue.length === 0) {
                        this.error("please specify config setting value, see 'help'");
                        break;
                    }

                    // TODO: regex validate value
                    const settingType = typeof agent_settings[setting];
                    switch (settingType) {
                        case "boolean":
                            configValue = ["off", "0", "false", "no"].includes(configValue) ? "false" : "true";
                            break;
                        default:
                            // numbers, strings, etc
                            break;
                    }

                    const setConfigData = config_name_map[setting] + "=" + configValue;

                    // if changing the c2 password, issue keyx again
                    this.success("setting '" + config_name_map[setting] + "' to value '" + configValue + "' on agent: " + this.redchannel.interact.id);
                    this.redchannel.command_set_config(setConfigData);
                    break;
                case "keyx":
                    this.warn("keyx started with agent " + chalk.blue(this.redchannel.interact.id));
                    this.redchannel.command_keyx(this.redchannel.interact.id);
                    break;
                case "msg":
                    if (!this.redchannel.interact.secret) {
                        this.error("cannot send msg to " + chalk.blue(this.redchannel.interact.id) + ", start 'keyx' first");
                        break;
                    }

                    const message = param.join(" ");
                    this.warn("sending message to " + chalk.blue(this.redchannel.interact.id) + "");
                    this.redchannel.queue_data(this.redchannel.interact.id, AgentCommand.AGENT_MSG, message);
                    break;
                default:
                    this.error(`invalid command: ${command}, see 'help'`);
                    break;
            }
        } else if (this.redchannel.using_module.length > 0) {
            const usingModule = this.redchannel.using_module;
            switch (command) {
                case "reload":
                case "reset":
                    try {
                        const config = JSON.parse(fs.readFileSync(this.redchannel.config_file).toString());
                        this.redchannel.config[usingModule] = config[usingModule];
                        this.info("module configuration reset, see 'config'");
                    } catch (ex) {
                        this.error(`error parsing config file ${this.redchannel.config_file} during reset: ${emsg(ex)}`);
                    }
                    break;
                case "ls":
                case "info":
                case "config":
                    this.info("module config:");
                    this.info(JSON.stringify(this.redchannel.config[usingModule], null, "  "));
                    break;
                case "help":
                    this.show_help(usingModule);
                    break;
                case "back":
                    this.redchannel.using_module = "";
                    this.reset_prompt();
                    break;
                case "set":
                    const settingName = param.shift();
                    const settingType = typeof this.redchannel.config[usingModule][settingName];
                    if (settingType === "undefined") {
                        this.error("unknown module setting '" + settingName + "', see 'help'");
                        break;
                    }

                    const settingValue = param.join(" ");
                    if (settingValue.length === 0) {
                        this.error("please specify setting value, see 'help'");
                        break;
                    }

                    // get the help object for the command (for set, its 'set property')
                    const commandHelp = Commands[usingModule][command + " " + settingName];
                    if (commandHelp.validate_regex && commandHelp.validate_regex.test instanceof Function && !commandHelp.validate_regex.test(settingValue)) {
                        this.error("invalid setting value, see 'help'");
                        break;
                    }
                    switch (settingType) {
                        case "number":
                            this.redchannel.config[usingModule][settingName] = parseInt(settingValue);
                            break;
                        case "boolean":
                            this.redchannel.config[usingModule][settingName] = ["off", "0", "false", "no"].includes(settingValue) ? false : true;
                            break;
                        case "object":
                            this.redchannel.config[usingModule][settingName] = settingValue.split(",");
                            break;
                        default:
                            this.redchannel.config[usingModule][settingName] = settingValue;
                            break;
                    }
                    this.info("set " + settingName + " = '" + this.redchannel.config[usingModule][settingName] + "'");

                    if (typeof this.redchannel.modules[usingModule].actions[command + " " + settingName] === "function") {
                        // call it with this.redchannel as first param
                        try {
                            const commandResult = this.redchannel.modules[usingModule].actions[command + " " + settingName].bind(this.redchannel)(param);
                            if (commandResult) this.info(commandResult.message);
                        } catch (ex) {
                            this.error(emsg(ex));
                        }
                    }

                    break;
                default:
                    // is the command a module action?
                    if (typeof this.redchannel.modules[usingModule].actions[command] === "function") {
                        // call it with this.redchannel as first param
                        let ret = this.redchannel.modules[usingModule].actions[command].bind(this.redchannel)(param);
                        if (ret.error) this.error(ret.message);
                        if (!ret.error && ret.message.length > 0) this.info(ret.message);
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

                    this.redchannel.interact = this.redchannel.get_agent(interactAgentId);
                    if (!this.redchannel.interact) {
                        this.error("agent " + chalk.blue(interactAgentId) + " not found");
                    } else {
                        this.info("interacting with " + chalk.blue(this.redchannel.interact.id) + "");
                    }
                    break;
                case "keyx":
                    this.warn("keyx started with all agents");
                    this.redchannel.command_keyx(); // null agent id will send broadcast
                    break;
                case "agents":
                    this.show_agents();
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

                    const agentToKill = this.redchannel.get_agent(killAgentId);
                    if (!agentToKill) {
                        this.error("agent " + chalk.blue(killAgentId) + " not found");
                    } else {
                        this.warn("killing " + chalk.blue(agentToKill.id) + ", agent may reconnect");
                        this.redchannel.kill_agent(agentToKill.id);
                    }
                    break;
                case "help":
                    this.show_help("c2");
                    break;
                case "use":
                    const useModuleName = param.shift();
                    if (!useModuleName) {
                        this.error("unknown module: '" + useModuleName + "', see 'help'");
                        break;
                    }
                    this.redchannel.using_module = useModuleName;
                    this.reset_prompt();
                    break;
                default:
                    this.error(`invalid command: ${command}, see 'help'`);
                    break;
            }
        }

        this.reset_prompt();
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
        this.reset_prompt();
    }

    reset_prompt() {
        const prompt = chalk.red("> ");
        if (this.redchannel.interact) {
            this.console.setPrompt(chalk.red("agent(") + chalk.blue(this.redchannel.interact.id) + chalk.red(")") + prompt);
        } else if (this.redchannel.using_module.length > 0) {
            this.console.setPrompt(this.redchannel.using_module + prompt);
        } else {
            this.console.setPrompt(prompt);
        }
        this.console.prompt(true);
    }
}

export default UserInterface;
