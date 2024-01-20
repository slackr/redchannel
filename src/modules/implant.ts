import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import EventEmitter from "node:events";

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import Logger from "../lib/logger";
import { Constants, emsg } from "../utils";
import { Module } from "./base";
import { RedChannelConfig } from "../pb/config";

const AGENT_PATH = `${process.cwd()}/agent`;
const AGENT_CONFIG_PATH = `${AGENT_PATH}/config/config.go`;
const AGENT_BUILD_SCRIPT = `${AGENT_PATH}/tools/build.py`;
const AGENT_BUILD_PATH = `${AGENT_PATH}/build`;
const AGENT_BUILD_LOG_PATH = `${AGENT_BUILD_PATH}/build.log`;

export type BuildParameters = {
    os: string; //"windows" | "linux" | "darwin";
    arch: string; //"amd64" | "386" | "arm64" | "arm";
    debug: boolean;
};

export enum BuildEvent {
    BUILD_STDOUT = "buildStdOut",
    BUILD_STDERR = "buildStdErr",
    BUILD_END = "buildEnd",
}

export default class ImplantModule implements Module {
    outputFile: string;
    log: Logger;
    buildParameters: BuildParameters;
    eventEmitter: EventEmitter;

    constructor(protected config: RedChannelConfig, protected c2HashedPassword: string, log?: Logger) {
        this.log = log ?? new Logger();
        this.outputFile = "";
        this.buildParameters = {
            os: "windows",
            arch: "amd64",
            debug: false,
        };
        this.eventEmitter = new EventEmitter({});

        // this.defineCommands({
        //     build: {
        //         arguments: ["[os]", "[arch]"],
        //         description: "build the agent for the target os and arch",
        //         execute: (params: string[], callback?: ExecuteCallbackFunction): ExecuteReturn => {
        //             return this.run(params, callback);
        //         },
        //         executeCallbackAvailable: true,
        //     },
        //     log: {
        //         arguments: [],
        //         description: "show the build log",
        //         execute: this.getLog,
        //     },
        //     payload: {
        //         arguments: [],
        //         description: "get the binary location on disk",
        //         execute: () => {
        //             if (!this.outputFile) return { message: "agent binary not built yet, see 'build'" };
        //             return { message: `agent binary can be found here: ${this.outputFile}` };
        //         },
        //     },
        //     "set os": {
        //         arguments: ["<windows|linux|darwin|...>"],
        //         description: "set the target os for the build (GOOS)",
        //         validateRegex: Constants.VALID_BUILD_TARGET_OS,
        //         execute: (params?: string) => {
        //             this.config.os = params || "windows";
        //         },
        //     },
        //     "set arch": {
        //         arguments: ["<amd64|386|arm64|mips|...>"],
        //         description: "set the target arch for the build (GOARCH)",
        //         validateRegex: Constants.VALID_BUILD_TARGET_ARCH,
        //         execute: (params: string) => {
        //             this.config.arch = params;
        //         },
        //     },
        //     "set interval": {
        //         arguments: ["<ms>"],
        //         description: "set implant c2 query interval",
        //         validateRegex: /^[0-9]+$/,
        //         execute: (params: string) => {
        //             this.config.interval = Number(params) || this.config.interval;
        //         },
        //     },
        //     "set resolver": {
        //         arguments: ["<ip:port>"],
        //         description: "set implant resolver ip:port (8.8.8.8:53) to use for dns channel",
        //         validateRegex: Constants.VALID_IMPLANT_RESOLVER,
        //         execute: (params: string) => {
        //             this.config.resolver = params;
        //         },
        //     },
        //     "set throttle_sendq": {
        //         arguments: ["<1|0>"],
        //         description: "throttle c2 communication (enable) or just send it all at once (disable)",
        //         execute: (params: string) => {
        //             this.config.throttle_sendq = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        //     "set proxy_url": {
        //         arguments: ["<url>"],
        //         description: "set the proxy url to use (http://proxy.domain.tld/proxy.php)",
        //         validateRegex: Constants.VALID_URL_REGEX,
        //         execute: (params: string) => {
        //             this.config.proxy_url = params;
        //         },
        //     },
        //     "set proxy_enabled": {
        //         arguments: ["<1|0>"],
        //         description: "enable or disable proxy communication (web channel)",
        //         execute: (params: string) => {
        //             this.config.proxy_enabled = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        //     "set proxy_key": {
        //         arguments: ["<key>"],
        //         description: "key to use for proxy communication",
        //         execute: (params: string) => {
        //             this.config.proxy_key = params;
        //         },
        //     },
        //     "set debug": {
        //         arguments: ["<1|0>"],
        //         description: "build debug version of the implant",
        //         execute: (params: string) => {
        //             this.config.debug = params !== "0" && params !== "false" ? true : false;
        //         },
        //     },
        // });
    }

    execute(): void {
        const targetOs = this.buildParameters.os;
        const targetArch = this.buildParameters.arch;
        const debug = this.buildParameters.debug;

        if (!Constants.VALID_BUILD_TARGET_OS.test(targetOs)) throw new Error("invalid os value, must be supported by Go (GOOS)");
        if (!Constants.VALID_BUILD_TARGET_ARCH.test(targetArch)) throw new Error("invalid arch value, must be supported by Go (GOARCH)");

        try {
            this.generateConfig();
        } catch (ex) {
            throw new Error(`error generating build config: ${emsg(ex)}`);
        }

        const outputFile = `${AGENT_BUILD_PATH}/agent${targetOs === "windows" ? ".exe" : ""}`;
        this.outputFile = outputFile;

        // prettier-ignore
        const commandArguments = [
            `${AGENT_BUILD_SCRIPT}`,
            `${AGENT_PATH}`,
            `${outputFile}`,
            targetOs,
            targetArch,
        ];
        if (debug) commandArguments.push("debug");

        const goCachePath = path.join(os.tmpdir(), "rc-build-cache");
        const goPath = path.join(os.tmpdir(), "rc-build-path");
        const goEnvironment = {
            GOOS: targetOs,
            GOARCH: targetArch,
            GO111MODULE: "auto",
            GOCACHE: goCachePath, // 'go clean -modcache' after build?
            GOPATH: goPath,
            PATH: `${goPath}/bin:${process.env.PATH}`,
            HOME: `${goPath}/home`,
            XDG_CACHE_HOME: `${goPath}/xdg-home`,
        };

        const spawnBinary = "python";
        let childProcess: ChildProcessWithoutNullStreams;
        try {
            childProcess = spawn(spawnBinary, commandArguments, {
                env: goEnvironment,
                cwd: AGENT_PATH,
                windowsVerbatimArguments: true,
            });
            childProcess.on("close", (code) => {
                const message = `agent build for os: ${targetOs}, arch: ${targetArch}, debug: ${debug ? "true" : "false"}, return code: ${code}`;
                if (code !== 0) {
                    this.log.error(message);
                    this.eventEmitter.emit(BuildEvent.BUILD_STDERR, message);
                } else {
                    this.log.info(message);
                    this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, message);
                }
                this.eventEmitter.emit(BuildEvent.BUILD_END, code);
            });
        } catch (ex) {
            throw new Error(`failed to launch build command: '${spawnBinary} ${commandArguments.join(" ")}', err: ${emsg(ex)}`);
        }

        try {
            const logStream = fs.createWriteStream(`${AGENT_BUILD_LOG_PATH}`, { flags: "w" });
            childProcess.stdout.pipe(logStream);
            childProcess.stderr.pipe(logStream);

            // data is chunked
            childProcess.stdout.on("data", (chunk) => {
                this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, chunk);
            });
            childProcess.stderr.on("data", (chunk) => {
                this.eventEmitter.emit(BuildEvent.BUILD_STDERR, chunk);
            });
            /**
             * if we want to send one line at a time we can use this, but this is too noisy 
             * 
            // send messages to any event listeners (build implant stream rpc)
            let stdOutLine = "";
            childProcess.stdout.on("data", (chunk) => {
                stdOutLine += chunk || "";
                const lines = stdOutLine.split("\n");
                while (lines.length > 1) {
                    const line = lines.shift();
                    this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, line);
                }
                stdOutLine = lines.shift() || "";
                this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, stdOutLine);
            });
            childProcess.stdout.on("end", () => {
                this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, stdOutLine);
            });

            let stdErrLine = "";
            childProcess.stderr.on("data", (chunk) => {
                stdErrLine += chunk || "";
                const lines = stdErrLine.split("\n");
                while (lines.length > 1) {
                    const line = lines.shift();
                    this.eventEmitter.emit(BuildEvent.BUILD_STDERR, line);
                }
                stdErrLine = lines.shift() || "";
                this.eventEmitter.emit(BuildEvent.BUILD_STDERR, stdErrLine);
            });
            childProcess.stderr.on("end", () => {
                this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, stdErrLine);
            });
             */
        } catch (ex) {
            const errorMessage = `failed to write log file: ${emsg(ex)}`;
            this.eventEmitter.emit(BuildEvent.BUILD_STDERR, errorMessage);
            throw new Error(errorMessage);
        }

        let binaryUrl = "";
        if (this.config.c2?.webIp && this.config.c2?.binaryRoute) binaryUrl = this.config.c2.webUrl + this.config.c2.binaryRoute;

        const buildMessage = `building ${debug ? "(debug)" : ""} agent for os: ${targetOs}, arch: ${targetArch}, binary will be available here: ${outputFile} ${
            binaryUrl.length > 0 ? `and ${binaryUrl}` : ""
        }`;
        this.log.info(buildMessage);
        this.eventEmitter.emit(BuildEvent.BUILD_STDOUT, buildMessage);
    }

    getLog(): string {
        const logPath = AGENT_BUILD_LOG_PATH;
        let logData = "";
        try {
            logData = fs.readFileSync(logPath).toString();
        } catch (ex) {
            throw new Error(`failed to read build log file: ${emsg(ex)}`);
        }

        return logData;
    }

    private generateConfig() {
        if (!this.config.c2) throw new Error(`missing c2 config`);
        if (!this.config.implant) throw new Error(`missing implant config`);

        let data: Buffer;
        let configData = "";
        const agentConfigPath = AGENT_CONFIG_PATH;
        try {
            data = fs.readFileSync(`${agentConfigPath}.sample`);
            configData = data.toString();
        } catch (ex) {
            throw new Error(`failed to read agent config file template '${agentConfigPath}.sample': ${emsg(ex)}`);
        }

        configData = configData.replace(/^\s*c\.C2Domain\s*=\s*".*".*$/im, `c.C2Domain = "${this.config.c2.domain}"`);
        configData = configData.replace(/^\s*c\.C2Password\s*=\s*".*".*$/im, `c.C2Password = "${this.c2HashedPassword}"`);
        configData = configData.replace(/^\s*c\.Resolver\s*=\s*".*".*$/im, `c.Resolver = "${this.config.implant.resolver}"`);
        configData = configData.replace(/^\s*c\.C2Interval\s*=.*$/im, `c.C2Interval = ${this.config.implant.interval}`);
        configData = configData.replace(/^\s*c\.ProxyEnabled\s*=.*$/im, `c.ProxyEnabled = ${this.config.implant.proxyEnabled}`);
        configData = configData.replace(/^\s*c\.ProxyUrl\s*=\s*".*".*$/im, `c.ProxyUrl = "${this.config.implant.proxyUrl}"`);
        configData = configData.replace(/^\s*c\.ProxyKey\s*=\s*".*".*$/im, `c.ProxyKey = "${this.config.implant.proxyKey}"`);
        configData = configData.replace(/^\s*c\.ThrottleSendQ\s*=.*$/im, `c.ThrottleSendQ = ${!this.config.implant.throttleSendq}`);

        try {
            fs.writeFileSync(agentConfigPath, configData, { flag: "w" });
        } catch (ex) {
            throw new Error(`failed to write agent config file '${agentConfigPath}': ${emsg(ex)}`);
        }

        this.log.info(`agent config file written to: ${agentConfigPath}`);
    }
}
