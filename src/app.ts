import { createCommand } from "commander";
import _merge from "lodash.merge";
import * as fs from "fs";

import RedChannel from "./lib/redchannel";
import Logger from "./lib/logger";
import { Config, Constants, RedChannelBanner, emsg } from "./utils";
import { DefaultConfig } from "./lib/config";
import { TeamServer, WebServer, DnsServer } from "./server";
import { TeamServerCerts } from "./server/teamserver";
import { LogLevel, RedChannelConfig } from "./pb/c2";

const log = new Logger();
log.msg(RedChannelBanner);

const program = createCommand();
program
    .version(Constants.VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", Config.DEFAULT_CONFIG_FILE)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-d, --domain <domain>", "specify the c2 domain")
    .option("-D, --debug", "enable debug", false)
    .option("--dns-ip [ip]", "bind dns c2 to ip")
    .option("--dns-port [port]", "listen for dns on a specific port")
    .option("--web-ip [ip]", "bind web server to ip")
    .option("--web-port [port]", "listen for web on a specific port")
    .option("--ts-ip [ip]", "bind teamserver to ip")
    .option("--ts-port [port]", "listen for teamserver connections on a specific port")
    .parse();

// env password takes priority over commandline
const password = (process.env.RC_PASSWORD as string) ?? (program.getOptionValue("password") as string);
if (!password?.length) {
    log.error("invalid c2 password: please specify a c2 password via command-line or the RC_PASSWORD environment variable, see '--help'");
    process.exit(1);
}

const configFromCli: RedChannelConfig = _merge(DefaultConfig, {
    c2: {
        domain: program.getOptionValue("domain"),
        dnsIp: program.getOptionValue("ip"),
        dnsPort: program.getOptionValue("port"),
        webIp: program.getOptionValue("webIp"),
        webPort: program.getOptionValue("webPort"),
        wsIp: program.getOptionValue("wsIp"),
        wsPort: program.getOptionValue("wsPort"),
        tsIp: program.getOptionValue("tsIp"),
        tsPort: program.getOptionValue("tsPort"),
        debug: program.getOptionValue("debug"),
    },
});

const cliConfigFilePath = program.getOptionValue("config");

let redchannel: RedChannel;
try {
    redchannel = new RedChannel(password, cliConfigFilePath, configFromCli);
} catch (ex) {
    log.error(`error instantiating redchannel: ${emsg(ex)}`);
    process.exit(1);
}

if (redchannel.config.c2?.debug) {
    log.warn("debug is enabled");
    log.level = LogLevel.DEBUG;
}

process.on("uncaughtException", (ex, origin) => {
    log.error(`process error: ${emsg(ex)}, origin: ${origin}`);
    log.debug(ex, origin);
});

const c2Config = redchannel.config.c2;
if (!c2Config?.webPort || !c2Config.webIp) throw new Error(`invalid c2 configuration: invalid ip or port`);

const webServer = new WebServer(redchannel, c2Config.webPort, c2Config.webIp, log);
webServer.start(() => {
    log.info(`c2-web listening on ${webServer.bindIp}:${webServer.port}`);
});

if (!c2Config?.dnsPort || !c2Config.dnsIp) throw new Error(`invalid c2 configuration: invalid ip or port`);
const dnsServer = new DnsServer(redchannel, c2Config.dnsPort, c2Config.dnsIp, c2Config.domain, log);
dnsServer.start(() => {
    log.info(`c2-dns listening on: ${c2Config.dnsIp}:${c2Config.dnsPort}, c2 domain: ${c2Config.domain}`);
});

/**
 * c2-ts used by operators
 */
const certs: TeamServerCerts = {
    ca: fs.readFileSync(__dirname + "/../certs/ca.crt"),
    serverCert: fs.readFileSync(__dirname + "/../certs/server.crt"),
    serverKey: fs.readFileSync(__dirname + "/../certs/server.key"),
};

const teamServer = new TeamServer(redchannel, certs, c2Config.tsPort, c2Config.tsIp, log);
teamServer.start(() => {
    log.info(`teamserver listening on ${teamServer.bindIp}:${teamServer.port}`);
});
