import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace redchannel. */
export namespace redchannel {

    /** Properties of a Control. */
    interface IControl {
    }

    /** Represents a Control. */
    class Control implements IControl {

        /**
         * Constructs a new Control.
         * @param [properties] Properties to set
         */
        constructor(properties?: redchannel.IControl);

        /**
         * Creates a new Control instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Control instance
         */
        public static create(properties?: redchannel.IControl): redchannel.Control;

        /**
         * Encodes the specified Control message. Does not implicitly {@link redchannel.Control.verify|verify} messages.
         * @param message Control message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: redchannel.IControl, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Control message, length delimited. Does not implicitly {@link redchannel.Control.verify|verify} messages.
         * @param message Control message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: redchannel.IControl, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Control message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Control
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): redchannel.Control;

        /**
         * Decodes a Control message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Control
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): redchannel.Control;

        /**
         * Verifies a Control message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Control message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Control
         */
        public static fromObject(object: { [k: string]: any }): redchannel.Control;

        /**
         * Creates a plain object from a Control message. Also converts values to other types if specified.
         * @param message Control
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: redchannel.Control, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Control to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Control
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    namespace Control {

        /** AgentCommands enum. */
        enum AgentCommands {
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
            constructor(properties?: redchannel.Control.IAgentConfig);

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
            public static create(properties?: redchannel.Control.IAgentConfig): redchannel.Control.AgentConfig;

            /**
             * Encodes the specified AgentConfig message. Does not implicitly {@link redchannel.Control.AgentConfig.verify|verify} messages.
             * @param message AgentConfig message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: redchannel.Control.IAgentConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified AgentConfig message, length delimited. Does not implicitly {@link redchannel.Control.AgentConfig.verify|verify} messages.
             * @param message AgentConfig message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: redchannel.Control.IAgentConfig, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes an AgentConfig message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns AgentConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): redchannel.Control.AgentConfig;

            /**
             * Decodes an AgentConfig message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns AgentConfig
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): redchannel.Control.AgentConfig;

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
            public static fromObject(object: { [k: string]: any }): redchannel.Control.AgentConfig;

            /**
             * Creates a plain object from an AgentConfig message. Also converts values to other types if specified.
             * @param message AgentConfig
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: redchannel.Control.AgentConfig, options?: $protobuf.IConversionOptions): { [k: string]: any };

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

        /** AgentCommandStatus enum. */
        enum AgentCommandStatus {
            STATUS_UNSPECIFIED = 0,
            STATUS_SUCCESS = 1,
            STATUS_ERROR = 2
        }
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
        constructor(properties?: redchannel.ICommand);

        /**
         * Creates a new Command instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Command instance
         */
        public static create(properties?: redchannel.ICommand): redchannel.Command;

        /**
         * Encodes the specified Command message. Does not implicitly {@link redchannel.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: redchannel.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link redchannel.Command.verify|verify} messages.
         * @param message Command message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: redchannel.ICommand, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): redchannel.Command;

        /**
         * Decodes a Command message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): redchannel.Command;

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
        public static fromObject(object: { [k: string]: any }): redchannel.Command;

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @param message Command
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: redchannel.Command, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
            command?: (redchannel.Control.AgentCommands|null);

            /** Request input */
            input?: (string|null);

            /** Request config */
            config?: (redchannel.Control.IAgentConfig|null);
        }

        /** Represents a Request. */
        class Request implements IRequest {

            /**
             * Constructs a new Request.
             * @param [properties] Properties to set
             */
            constructor(properties?: redchannel.Command.IRequest);

            /** Request command. */
            public command: redchannel.Control.AgentCommands;

            /** Request input. */
            public input: string;

            /** Request config. */
            public config?: (redchannel.Control.IAgentConfig|null);

            /**
             * Creates a new Request instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Request instance
             */
            public static create(properties?: redchannel.Command.IRequest): redchannel.Command.Request;

            /**
             * Encodes the specified Request message. Does not implicitly {@link redchannel.Command.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: redchannel.Command.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link redchannel.Command.Request.verify|verify} messages.
             * @param message Request message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: redchannel.Command.IRequest, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): redchannel.Command.Request;

            /**
             * Decodes a Request message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): redchannel.Command.Request;

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
            public static fromObject(object: { [k: string]: any }): redchannel.Command.Request;

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @param message Request
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: redchannel.Command.Request, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
            command?: (redchannel.Control.AgentCommands|null);

            /** Response output */
            output?: (string|null);

            /** Response status */
            status?: (redchannel.Control.AgentCommandStatus|null);
        }

        /** Represents a Response. */
        class Response implements IResponse {

            /**
             * Constructs a new Response.
             * @param [properties] Properties to set
             */
            constructor(properties?: redchannel.Command.IResponse);

            /** Response command. */
            public command: redchannel.Control.AgentCommands;

            /** Response output. */
            public output: string;

            /** Response status. */
            public status: redchannel.Control.AgentCommandStatus;

            /**
             * Creates a new Response instance using the specified properties.
             * @param [properties] Properties to set
             * @returns Response instance
             */
            public static create(properties?: redchannel.Command.IResponse): redchannel.Command.Response;

            /**
             * Encodes the specified Response message. Does not implicitly {@link redchannel.Command.Response.verify|verify} messages.
             * @param message Response message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encode(message: redchannel.Command.IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Encodes the specified Response message, length delimited. Does not implicitly {@link redchannel.Command.Response.verify|verify} messages.
             * @param message Response message or plain object to encode
             * @param [writer] Writer to encode to
             * @returns Writer
             */
            public static encodeDelimited(message: redchannel.Command.IResponse, writer?: $protobuf.Writer): $protobuf.Writer;

            /**
             * Decodes a Response message from the specified reader or buffer.
             * @param reader Reader or buffer to decode from
             * @param [length] Message length if known beforehand
             * @returns Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): redchannel.Command.Response;

            /**
             * Decodes a Response message from the specified reader or buffer, length delimited.
             * @param reader Reader or buffer to decode from
             * @returns Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): redchannel.Command.Response;

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
            public static fromObject(object: { [k: string]: any }): redchannel.Command.Response;

            /**
             * Creates a plain object from a Response message. Also converts values to other types if specified.
             * @param message Response
             * @param [options] Conversion options
             * @returns Plain object
             */
            public static toObject(message: redchannel.Command.Response, options?: $protobuf.IConversionOptions): { [k: string]: any };

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
