import * as crypto from "crypto";

export const DefaultConfig: RedChannelConfig = {
    c2: {
        domain: "c2.redchannel.tld",
        dns_ip: "127.0.0.1",
        dns_port: 53,
        web_ip: "127.0.0.1",
        web_port: 4321,
        interval: 5000,
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
    domain: string;
    dns_ip: string;
    dns_port: number;
    web_ip: string;
    web_port: number;
    interval: number;
    binary_route: string;
    web_url: string;
    debug: boolean;
}

export type AgentModuleConfig = {
    proxy_url?: string;
    proxy_enabled?: boolean;
    proxy_key?: string;
};

export interface SkimmerModuleConfig {
    payload_route: string;
    data_route: string;
    url: string;
    target_classes: string[];
    target_ids: string[];
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
