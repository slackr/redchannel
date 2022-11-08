import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace implant. */
export namespace implant {

    /** AgentCommand enum. */
    enum AgentCommand {
        AGENT_UNSPECIFIED = 0,
        AGENT_CHECKIN = 1,
        AGENT_SYSINFO = 2,
        AGENT_EXECUTE = 3,
        AGENT_EXECUTE_SHELLCODE = 4,
        AGENT_MESSAGE = 5,
        AGENT_SHUTDOWN = 6,
        AGENT_KEYX = 7,
        AGENT_SET_CONFIG = 8,
        AGENT_IGNORE = 9
    }

    /** AgentCommandStatus enum. */
    enum AgentCommandStatus {
        STATUS_UNSPECIFIED = 0,
        STATUS_SUCCESS = 1,
        STATUS_ERROR = 2
    }

    /** Properties of an AgentConfig. */
    interface IAgentConfig {

        /** AgentConfig c2Domain */
        c2Domain?: (string|null);

        /** AgentConfig c2Password */
        c2Password?: (string|null);

        /** AgentConfig resolver */
        resolver?: (string|null);

        /** AgentConfig c2IntervalMs */
        c2IntervalMs?: (number|null);

        /** AgentConfig useWebChannel */
        useWebChannel?: (boolean|null);

        /** AgentConfig webUrl */
        webUrl?: (string|null);

        /** AgentConfig webKey */
        webKey?: (string|null);
    }

    /** Represents an AgentConfig. */
    class AgentConfig implements IAgentConfig {

        /**
         * Constructs a new AgentConfig.
         * @param [properties] Properties to set
         */
        constructor(properties?: implant.IAgentConfig);

        /** AgentConfig c2Domain. */
        public c2Domain: string;

        /** AgentConfig c2Password. */
        public c2Password: string;

        /** AgentConfig resolver. */
        public resolver: string;

        /** AgentConfig c2IntervalMs. */
        public c2IntervalMs: number;

        /** AgentConfig useWebChannel. */
        public useWebChannel: boolean;

        /** AgentConfig webUrl. */
        public webUrl: string;

        /** AgentConfig webKey. */
        public webKey: string;

        /**
         * Creates a new AgentConfig instance using the specified properties.
         * @param [properties] Properties to set
         * @returns AgentConfig instance
         */
        public static create(properties?: implant.IAgentConfig): implant.AgentConfig;

        /**
         * Encodes the specified AgentConfig message. Does not implicitly {@link implant.AgentConfig.verify|verify} messages.
         * @param message AgentConfig message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: implant.IAgentConfig, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified AgentConfig message, length delimited. Does not implicitly {@link implant.AgentConfig.verify|verify} messages.
         * @param message AgentConfig message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: implant.IAgentConfig, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes an AgentConfig message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns AgentConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): implant.AgentConfig;

        /**
         * Decodes an AgentConfig message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns AgentConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): implant.AgentConfig;

        /**
         * Verifies an AgentConfig message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates an AgentConfig message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns AgentConfig
         */
        public static fromObject(object: { [k: string]: any }): implant.AgentConfig;

        /**
         * Creates a plain object from an AgentConfig message. Also converts values to other types if specified.
         * @param message AgentConfig
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: implant.AgentConfig, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this AgentConfig to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for AgentConfig
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SysInfoData. */
    interface ISysInfoData {

        /** SysInfoData hostname */
        hostname?: (string|null);

        /** SysInfoData ip */
        ip?: (string[]|null);

        /** SysInfoData user */
        user?: (string|null);

        /** SysInfoData uid */
        uid?: (string|null);

        /** SysInfoData gid */
        gid?: (string|null);
    }

    /** Represents a SysInfoData. */
    class SysInfoData implements ISysInfoData {

        /**
         * Constructs a new SysInfoData.
         * @param [properties] Properties to set
         */
        constructor(properties?: implant.ISysInfoData);

        /** SysInfoData hostname. */
        public hostname: string;

        /** SysInfoData ip. */
        public ip: string[];

        /** SysInfoData user. */
        public user: string;

        /** SysInfoData uid. */
        public uid: string;

        /** SysInfoData gid. */
        public gid: string;

        /**
         * Creates a new SysInfoData instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SysInfoData instance
         */
        public static create(properties?: implant.ISysInfoData): implant.SysInfoData;

        /**
         * Encodes the specified SysInfoData message. Does not implicitly {@link implant.SysInfoData.verify|verify} messages.
         * @param message SysInfoData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: implant.ISysInfoData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SysInfoData message, length delimited. Does not implicitly {@link implant.SysInfoData.verify|verify} messages.
         * @param message SysInfoData message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: implant.ISysInfoData, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SysInfoData message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SysInfoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): implant.SysInfoData;

        /**
         * Decodes a SysInfoData message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SysInfoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): implant.SysInfoData;

        /**
         * Verifies a SysInfoData message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SysInfoData message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SysInfoData
         */
        public static fromObject(object: { [k: string]: any }): implant.SysInfoData;

        /**
         * Creates a plain object from a SysInfoData message. Also converts values to other types if specified.
         * @param message SysInfoData
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: implant.SysInfoData, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SysInfoData to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SysInfoData
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a Command. */
    interface ICommand {
    }

    /** Represents a Command. */
    class Command implements ICommand {

        /**
         * Constructs a new Command.
         * @param [properties] Properties to set
         */
        constructor(properties?: implant.ICommand);

        /**
         * Creates a new Command instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Command instance
         */
        public static create(properties?: implant.ICommand): implant.Command;

        /**
         * Encodes the specified Command message. Does not implicitly {@link implant.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: implant.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link implant.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: implant.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): implant.Command;

        /**
         * Decodes a Command message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): implant.Command;

        /**
         * Verifies a Command message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Command message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Command
         */
        public static fromObject(object: { [k: string]: any }): implant.Command;

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @param message Command
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: implant.Command, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Command to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Command
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Command {

        /** Properties of a Request. */
        interface IRequest {

            /** Request command */
            command?: (implant.AgentCommand|null);

            /** Request input */
            input?: (Uint8Array|null);

            /** Request config */
            config?: (implant.IAgentConfig|null);
        }

        /** Represents a Request. */
        class Request implements IRequest {

            /**
             * Constructs a new Request.
             * @param [properties] Properties to set
             */
            constructor(properties?: implant.Command.IRequest);

            /** Request command. */
            public command: implant.AgentCommand;

            /** Request input. */
            public input: Uint8Array;

            /** Request config. */
            public config?: (implant.IAgentConfig|null);

            /**
             * Creates a new Request instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Request instance
             */
            public static create(properties?: implant.Command.IRequest): implant.Command.Request;

            /**
             * Encodes the specified Request message. Does not implicitly {@link implant.Command.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: implant.Command.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link implant.Command.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: implant.Command.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): implant.Command.Request;

            /**
             * Decodes a Request message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): implant.Command.Request;

            /**
             * Verifies a Request message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Request message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Request
             */
            public static fromObject(object: { [k: string]: any }): implant.Command.Request;

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @param message Request
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: implant.Command.Request, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Request to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Request
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }

        /** Properties of a Response. */
        interface IResponse {

            /** Response command */
            command?: (implant.AgentCommand|null);

            /** Response output */
            output?: (Uint8Array|null);

            /** Response sysinfo */
            sysinfo?: (implant.ISysInfoData|null);

            /** Response status */
            status?: (implant.AgentCommandStatus|null);
        }

        /** Represents a Response. */
        class Response implements IResponse {

            /**
             * Constructs a new Response.
             * @param [properties] Properties to set
             */
            constructor(properties?: implant.Command.IResponse);

            /** Response command. */
            public command: implant.AgentCommand;

            /** Response output. */
            public output: Uint8Array;

            /** Response sysinfo. */
            public sysinfo?: (implant.ISysInfoData|null);

            /** Response status. */
            public status: implant.AgentCommandStatus;

            /**
             * Creates a new Response instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Response instance
             */
            public static create(properties?: implant.Command.IResponse): implant.Command.Response;

            /**
             * Encodes the specified Response message. Does not implicitly {@link implant.Command.Response.verify|verify} messages.
             * @param message Response message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: implant.Command.IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Response message, length delimited. Does not implicitly {@link implant.Command.Response.verify|verify} messages.
             * @param message Response message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: implant.Command.IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Response message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): implant.Command.Response;

            /**
             * Decodes a Response message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): implant.Command.Response;

            /**
             * Verifies a Response message.
             * @param message Plain object to verify
             * @returns `null` if valid, otherwise the reason why it is not
             */
            public static verify(message: { [k: string]: any }): (string|null);

            /**
             * Creates a Response message from a plain object. Also converts values to their respective internal types.
             * @param object Plain object
             * @returns Response
             */
            public static fromObject(object: { [k: string]: any }): implant.Command.Response;

            /**
             * Creates a plain object from a Response message. Also converts values to other types if specified.
             * @param message Response
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: implant.Command.Response, options?: $protobuf.IConversionOptions): { [k: string]: any };

            /**
             * Converts this Response to JSON.
             * @returns JSON object
             */
            public toJSON(): { [k: string]: any };

            /**
             * Gets the default type url for Response
             * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns The default type url
             */
            public static getTypeUrl(typeUrlPrefix?: string): string;
        }
    }
}
