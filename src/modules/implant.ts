import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";

import Logger from "../lib/logger";
import { Constants, emsg } from "../utils/utils";
import BaseModule, { ExecuteCallbackFunction, ExecuteCallbackResult, ExecuteReturn } from "./base";
import RedChannel from "../lib/redchannel";

const MODULE_DESCRIPTION = "build implants for operations";

const AGENT_PATH = `${process.cwd()}/agent`;
const AGENT_CONFIG_PATH = `${AGENT_PATH}/config/config.go`;
const AGENT_BUILD_SCRIPT = `${AGENT_PATH}/tools/build.py`;
const AGENT_BUILD_LOG_PATH = `${AGENT_PATH}/build/build.log`;

export type ImplantConfig = {
    os: string;
    arch: string;
    resolver: string;
    interval: number;
    output_file: string;
    debug: boolean;
};

export default class ImplantModule extends BaseModule {
    config: ImplantConfig;
    log: Logger;

    /**
     * @param redChannelConfig The redchannel config object, used to grab config data while building the agent config
     * @param redChannel The red channel modules object, used to grab data from other modules while building the agent config
     */
    constructor(protected configFile, protected redChannel: RedChannel) {
        super("implant", configFile);

        this.description = MODULE_DESCRIPTION;

        this.log = new Logger();

        this.config = {
            os: "windows",
            arch: "amd64",
            interval: 5000,
            resolver: "8.8.8.8:53",
            output_file: "",
            debug: false,
        };
        this.config = this.loadConfig();

        this.defineCommands({
            build: {
                arguments: ["[os]", "[arch]"],
                description: "build the agent for the target os and arch",
                execute: (params: string[], callback?: ExecuteCallbackFunction): ExecuteReturn => {
                    return this.run(params, callback);
                },
                executeCallbackAvailable: true,
            },
            log: {
                arguments: [],
                description: "show the build log",
                execute: this.getLog,
            },
            "set os": {
                arguments: ["<windows|linux|darwin|...>"],
                description: "set the target os for the build (GOOS)",
                validateRegex: Constants.VALID_BUILD_TARGET_OS,
                execute: (params: string) => {
                    this.config.os = params;
                },
            },
            "set arch": {
                arguments: ["<amd64|386|arm64|mips|...>"],
                description: "set the target arch for the build (GOARCH)",
                validateRegex: Constants.VALID_BUILD_TARGET_ARCH,
                execute: (params: string) => {
                    this.config.arch = params;
                },
            },
            "set interval": {
                arguments: ["<ms>"],
                description: "set implant c2 query interval",
                validateRegex: /^[0-9]+$/,
                execute: (params: string) => {
                    this.config.interval = Number(params) || this.config.interval;
                },
            },
            "set resolver": {
                arguments: ["<ip:port>"],
                description: "set implant resolver ip:port (8.8.8.8:53)",
                validateRegex: Constants.VALID_IMPLANT_RESOLVER,
                execute: (params: string) => {
                    this.config.resolver = params;
                },
            },
            "set debug": {
                arguments: ["<1|0>"],
                description: "build debug version of the implant",
                execute: (params: string) => {
                    this.config.debug = params != "0" && params != "false" ? true : false;
                },
            },
        });
    }

    run(params: string[], onBuildCompleteCallback?: ExecuteCallbackFunction) {
        const targetOs = params[0] ?? this.config.os;
        const targetArch = params[1] ?? this.config.arch;
        const debug = this.config.debug;

        if (!Constants.VALID_BUILD_TARGET_OS.test(targetOs)) throw new Error(`invalid os value, must be supported by Go (GOOS)`);
        if (!Constants.VALID_BUILD_TARGET_ARCH.test(targetArch)) throw new Error(`invalid arch value, must be supported by Go (GOARCH)`);

        try {
            this.generateConfig();
        } catch (ex) {
            throw new Error(`error generating build config: ${emsg(ex)}`);
        }

        const buildPath = AGENT_PATH;
        const outputFile = `${buildPath}/build/agent${targetOs === "windows" ? ".exe" : ""}`;

        // prettier-ignore
        const commandArguments = [
            `${AGENT_BUILD_SCRIPT}`,
            `${buildPath}`,
            `${outputFile}`,
            targetOs,
            targetArch,
        ];
        if (debug) commandArguments.push("debug");

        const goEnvironment = {
            GOOS: targetOs,
            GOARCH: targetArch,
            GO111MODULE: "auto",
            GOCACHE: path.join(os.tmpdir(), "rc-build-cache"), // 'go cache clean' after build?
            GOPATH: path.join(os.tmpdir(), "rc-build-path"),
            PATH: process.env.PATH,
        };

        const spawnBinary = "python";
        let childProcess: ChildProcessWithoutNullStreams;
        try {
            // TODO: do this with docker instead? https://hub.docker.com/_/golang
            childProcess = spawn(spawnBinary, commandArguments, {
                env: goEnvironment,
                cwd: buildPath,
                windowsVerbatimArguments: true,
            });
            childProcess.on("close", (code) => {
                // send this message to the UI somehow
                const result: ExecuteCallbackResult = { message: `agent build for os: ${targetOs}, arch: ${targetArch}, debug: ${debug ? "true" : "false"}, return code: ${code}`, code: code };
                this.log.success(result.message);
                if (onBuildCompleteCallback) onBuildCompleteCallback(result);
            });
        } catch (ex) {
            throw new Error(`failed to launch build command: '${spawnBinary} ${commandArguments.join(" ")}', err: ${emsg(ex)}`);
        }

        try {
            const logStream = fs.createWriteStream(`${AGENT_BUILD_LOG_PATH}`, { flags: "w" });
            childProcess.stdout.pipe(logStream);
            childProcess.stderr.pipe(logStream);
        } catch (ex) {
            throw new Error(`failed to write log file: ${emsg(ex)}`);
        }

        this.config.output_file = outputFile;

        const binaryUrl = this.redChannel.modules.c2.config.web_url + this.redChannel.modules.c2.config.binary_route;

        return {
            message: `building ${debug ? "(debug)" : ""} agent for os: ${targetOs}, arch: ${targetArch}, binary will be available here: ${outputFile} and ${binaryUrl}`,
        };
    }

    getLog() {
        const logPath = AGENT_BUILD_LOG_PATH;
        let logData = "";
        try {
            logData = fs.readFileSync(logPath).toString();
        } catch (ex) {
            throw new Error(`failed to read build log file: ${emsg(ex)}`);
        }

        return { message: logData };
    }

    private generateConfig() {
        let data: Buffer;
        let configData = "";
        let agentConfigPath = AGENT_CONFIG_PATH;
        try {
            data = fs.readFileSync(`${agentConfigPath}.sample`);
            configData = data.toString();
        } catch (ex) {
            throw new Error(`failed to read agent config file template '${agentConfigPath}.sample': ${emsg(ex)}`);
        }

        configData = configData.replace(/^\s*c\.C2Domain\s*=\s*\".*\".*$/im, `c.C2Domain = "${this.redChannel.modules.c2.config.domain}"`);
        configData = configData.replace(/^\s*c\.C2Password\s*=\s*\".*\".*$/im, `c.C2Password = "${this.redChannel.plaintextPassword}"`);
        configData = configData.replace(/^\s*c\.Resolver\s*=\s*\".*\".*$/im, `c.Resolver = "${this.config.resolver}"`);
        configData = configData.replace(/^\s*c\.C2Interval\s*=.*$/im, `c.C2Interval = ${this.config.interval}`);
        configData = configData.replace(/^\s*c\.ProxyEnabled\s*=.*$/im, `c.ProxyEnabled = ${this.redChannel.modules.proxy.config.enabled}`);
        configData = configData.replace(/^\s*c\.ProxyUrl\s*=\s*\".*\".*$/im, `c.ProxyUrl = "${this.redChannel.modules.proxy.config.url}"`);
        configData = configData.replace(/^\s*c\.ProxyKey\s*=\s*\".*\".*$/im, `c.ProxyKey = "${this.redChannel.modules.proxy.config.key}"`);

        try {
            fs.writeFileSync(agentConfigPath, configData, { flag: "w" });
        } catch (ex) {
            throw new Error(`failed to write agent config file '${agentConfigPath}': ${emsg(ex)}`);
        }
        return { message: `agent config file written to: ${agentConfigPath}` };
    }
}
