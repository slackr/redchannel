/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.redchannel = (function() {

    /**
     * Namespace redchannel.
     * @exports redchannel
     * @namespace
     */
    var redchannel = {};

    /**
     * AgentCommand enum.
     * @name redchannel.AgentCommand
     * @enum {number}
     * @property {number} AGENT_UNSPECIFIED=0 AGENT_UNSPECIFIED value
     * @property {number} AGENT_CHECKIN=1 AGENT_CHECKIN value
     * @property {number} AGENT_SYSINFO=2 AGENT_SYSINFO value
     * @property {number} AGENT_EXECUTE=3 AGENT_EXECUTE value
     * @property {number} AGENT_EXECUTE_SHELLCODE=4 AGENT_EXECUTE_SHELLCODE value
     * @property {number} AGENT_MESSAGE=5 AGENT_MESSAGE value
     * @property {number} AGENT_SHUTDOWN=6 AGENT_SHUTDOWN value
     * @property {number} AGENT_KEYX=7 AGENT_KEYX value
     * @property {number} AGENT_SET_CONFIG=8 AGENT_SET_CONFIG value
     * @property {number} AGENT_IGNORE=9 AGENT_IGNORE value
     */
    redchannel.AgentCommand = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "AGENT_UNSPECIFIED"] = 0;
        values[valuesById[1] = "AGENT_CHECKIN"] = 1;
        values[valuesById[2] = "AGENT_SYSINFO"] = 2;
        values[valuesById[3] = "AGENT_EXECUTE"] = 3;
        values[valuesById[4] = "AGENT_EXECUTE_SHELLCODE"] = 4;
        values[valuesById[5] = "AGENT_MESSAGE"] = 5;
        values[valuesById[6] = "AGENT_SHUTDOWN"] = 6;
        values[valuesById[7] = "AGENT_KEYX"] = 7;
        values[valuesById[8] = "AGENT_SET_CONFIG"] = 8;
        values[valuesById[9] = "AGENT_IGNORE"] = 9;
        return values;
    })();

    /**
     * AgentCommandStatus enum.
     * @name redchannel.AgentCommandStatus
     * @enum {number}
     * @property {number} STATUS_UNSPECIFIED=0 STATUS_UNSPECIFIED value
     * @property {number} STATUS_SUCCESS=1 STATUS_SUCCESS value
     * @property {number} STATUS_ERROR=2 STATUS_ERROR value
     */
    redchannel.AgentCommandStatus = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "STATUS_UNSPECIFIED"] = 0;
        values[valuesById[1] = "STATUS_SUCCESS"] = 1;
        values[valuesById[2] = "STATUS_ERROR"] = 2;
        return values;
    })();

    redchannel.AgentConfig = (function() {

        /**
         * Properties of an AgentConfig.
         * @memberof redchannel
         * @interface IAgentConfig
         * @property {string|null} [c2Domain] AgentConfig c2Domain
         * @property {string|null} [c2Password] AgentConfig c2Password
         * @property {string|null} [resolver] AgentConfig resolver
         * @property {number|null} [c2IntervalMs] AgentConfig c2IntervalMs
         * @property {boolean|null} [useWebChannel] AgentConfig useWebChannel
         * @property {string|null} [webUrl] AgentConfig webUrl
         * @property {string|null} [webKey] AgentConfig webKey
         */

        /**
         * Constructs a new AgentConfig.
         * @memberof redchannel
         * @classdesc Represents an AgentConfig.
         * @implements IAgentConfig
         * @constructor
         * @param {redchannel.IAgentConfig=} [properties] Properties to set
         */
        function AgentConfig(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * AgentConfig c2Domain.
         * @member {string} c2Domain
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2Domain = "";

        /**
         * AgentConfig c2Password.
         * @member {string} c2Password
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2Password = "";

        /**
         * AgentConfig resolver.
         * @member {string} resolver
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.resolver = "";

        /**
         * AgentConfig c2IntervalMs.
         * @member {number} c2IntervalMs
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2IntervalMs = 0;

        /**
         * AgentConfig useWebChannel.
         * @member {boolean} useWebChannel
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.useWebChannel = false;

        /**
         * AgentConfig webUrl.
         * @member {string} webUrl
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.webUrl = "";

        /**
         * AgentConfig webKey.
         * @member {string} webKey
         * @memberof redchannel.AgentConfig
         * @instance
         */
        AgentConfig.prototype.webKey = "";

        /**
         * Creates a new AgentConfig instance using the specified properties.
         * @function create
         * @memberof redchannel.AgentConfig
         * @static
         * @param {redchannel.IAgentConfig=} [properties] Properties to set
         * @returns {redchannel.AgentConfig} AgentConfig instance
         */
        AgentConfig.create = function create(properties) {
            return new AgentConfig(properties);
        };

        /**
         * Encodes the specified AgentConfig message. Does not implicitly {@link redchannel.AgentConfig.verify|verify} messages.
         * @function encode
         * @memberof redchannel.AgentConfig
         * @static
         * @param {redchannel.IAgentConfig} message AgentConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentConfig.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.c2Domain != null && Object.hasOwnProperty.call(message, "c2Domain"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.c2Domain);
            if (message.c2Password != null && Object.hasOwnProperty.call(message, "c2Password"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.c2Password);
            if (message.resolver != null && Object.hasOwnProperty.call(message, "resolver"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.resolver);
            if (message.c2IntervalMs != null && Object.hasOwnProperty.call(message, "c2IntervalMs"))
                writer.uint32(/* id 4, wireType 0 =*/32).uint32(message.c2IntervalMs);
            if (message.useWebChannel != null && Object.hasOwnProperty.call(message, "useWebChannel"))
                writer.uint32(/* id 5, wireType 0 =*/40).bool(message.useWebChannel);
            if (message.webUrl != null && Object.hasOwnProperty.call(message, "webUrl"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.webUrl);
            if (message.webKey != null && Object.hasOwnProperty.call(message, "webKey"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.webKey);
            return writer;
        };

        /**
         * Encodes the specified AgentConfig message, length delimited. Does not implicitly {@link redchannel.AgentConfig.verify|verify} messages.
         * @function encodeDelimited
         * @memberof redchannel.AgentConfig
         * @static
         * @param {redchannel.IAgentConfig} message AgentConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentConfig.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AgentConfig message from the specified reader or buffer.
         * @function decode
         * @memberof redchannel.AgentConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {redchannel.AgentConfig} AgentConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentConfig.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.redchannel.AgentConfig();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.c2Domain = reader.string();
                        break;
                    }
                case 2: {
                        message.c2Password = reader.string();
                        break;
                    }
                case 3: {
                        message.resolver = reader.string();
                        break;
                    }
                case 4: {
                        message.c2IntervalMs = reader.uint32();
                        break;
                    }
                case 5: {
                        message.useWebChannel = reader.bool();
                        break;
                    }
                case 6: {
                        message.webUrl = reader.string();
                        break;
                    }
                case 7: {
                        message.webKey = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an AgentConfig message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof redchannel.AgentConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {redchannel.AgentConfig} AgentConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentConfig.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an AgentConfig message.
         * @function verify
         * @memberof redchannel.AgentConfig
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        AgentConfig.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.c2Domain != null && message.hasOwnProperty("c2Domain"))
                if (!$util.isString(message.c2Domain))
                    return "c2Domain: string expected";
            if (message.c2Password != null && message.hasOwnProperty("c2Password"))
                if (!$util.isString(message.c2Password))
                    return "c2Password: string expected";
            if (message.resolver != null && message.hasOwnProperty("resolver"))
                if (!$util.isString(message.resolver))
                    return "resolver: string expected";
            if (message.c2IntervalMs != null && message.hasOwnProperty("c2IntervalMs"))
                if (!$util.isInteger(message.c2IntervalMs))
                    return "c2IntervalMs: integer expected";
            if (message.useWebChannel != null && message.hasOwnProperty("useWebChannel"))
                if (typeof message.useWebChannel !== "boolean")
                    return "useWebChannel: boolean expected";
            if (message.webUrl != null && message.hasOwnProperty("webUrl"))
                if (!$util.isString(message.webUrl))
                    return "webUrl: string expected";
            if (message.webKey != null && message.hasOwnProperty("webKey"))
                if (!$util.isString(message.webKey))
                    return "webKey: string expected";
            return null;
        };

        /**
         * Creates an AgentConfig message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof redchannel.AgentConfig
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {redchannel.AgentConfig} AgentConfig
         */
        AgentConfig.fromObject = function fromObject(object) {
            if (object instanceof $root.redchannel.AgentConfig)
                return object;
            var message = new $root.redchannel.AgentConfig();
            if (object.c2Domain != null)
                message.c2Domain = String(object.c2Domain);
            if (object.c2Password != null)
                message.c2Password = String(object.c2Password);
            if (object.resolver != null)
                message.resolver = String(object.resolver);
            if (object.c2IntervalMs != null)
                message.c2IntervalMs = object.c2IntervalMs >>> 0;
            if (object.useWebChannel != null)
                message.useWebChannel = Boolean(object.useWebChannel);
            if (object.webUrl != null)
                message.webUrl = String(object.webUrl);
            if (object.webKey != null)
                message.webKey = String(object.webKey);
            return message;
        };

        /**
         * Creates a plain object from an AgentConfig message. Also converts values to other types if specified.
         * @function toObject
         * @memberof redchannel.AgentConfig
         * @static
         * @param {redchannel.AgentConfig} message AgentConfig
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        AgentConfig.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.c2Domain = "";
                object.c2Password = "";
                object.resolver = "";
                object.c2IntervalMs = 0;
                object.useWebChannel = false;
                object.webUrl = "";
                object.webKey = "";
            }
            if (message.c2Domain != null && message.hasOwnProperty("c2Domain"))
                object.c2Domain = message.c2Domain;
            if (message.c2Password != null && message.hasOwnProperty("c2Password"))
                object.c2Password = message.c2Password;
            if (message.resolver != null && message.hasOwnProperty("resolver"))
                object.resolver = message.resolver;
            if (message.c2IntervalMs != null && message.hasOwnProperty("c2IntervalMs"))
                object.c2IntervalMs = message.c2IntervalMs;
            if (message.useWebChannel != null && message.hasOwnProperty("useWebChannel"))
                object.useWebChannel = message.useWebChannel;
            if (message.webUrl != null && message.hasOwnProperty("webUrl"))
                object.webUrl = message.webUrl;
            if (message.webKey != null && message.hasOwnProperty("webKey"))
                object.webKey = message.webKey;
            return object;
        };

        /**
         * Converts this AgentConfig to JSON.
         * @function toJSON
         * @memberof redchannel.AgentConfig
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AgentConfig.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AgentConfig
         * @function getTypeUrl
         * @memberof redchannel.AgentConfig
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AgentConfig.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/redchannel.AgentConfig";
        };

        return AgentConfig;
    })();

    redchannel.Command = (function() {

        /**
         * Properties of a Command.
         * @memberof redchannel
         * @interface ICommand
         */

        /**
         * Constructs a new Command.
         * @memberof redchannel
         * @classdesc Represents a Command.
         * @implements ICommand
         * @constructor
         * @param {redchannel.ICommand=} [properties] Properties to set
         */
        function Command(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Creates a new Command instance using the specified properties.
         * @function create
         * @memberof redchannel.Command
         * @static
         * @param {redchannel.ICommand=} [properties] Properties to set
         * @returns {redchannel.Command} Command instance
         */
        Command.create = function create(properties) {
            return new Command(properties);
        };

        /**
         * Encodes the specified Command message. Does not implicitly {@link redchannel.Command.verify|verify} messages.
         * @function encode
         * @memberof redchannel.Command
         * @static
         * @param {redchannel.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link redchannel.Command.verify|verify} messages.
         * @function encodeDelimited
         * @memberof redchannel.Command
         * @static
         * @param {redchannel.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @function decode
         * @memberof redchannel.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {redchannel.Command} Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Command.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.redchannel.Command();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Command message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof redchannel.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {redchannel.Command} Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Command.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Command message.
         * @function verify
         * @memberof redchannel.Command
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Command.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            return null;
        };

        /**
         * Creates a Command message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof redchannel.Command
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {redchannel.Command} Command
         */
        Command.fromObject = function fromObject(object) {
            if (object instanceof $root.redchannel.Command)
                return object;
            return new $root.redchannel.Command();
        };

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @function toObject
         * @memberof redchannel.Command
         * @static
         * @param {redchannel.Command} message Command
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Command.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this Command to JSON.
         * @function toJSON
         * @memberof redchannel.Command
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Command.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Command
         * @function getTypeUrl
         * @memberof redchannel.Command
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Command.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/redchannel.Command";
        };

        Command.Request = (function() {

            /**
             * Properties of a Request.
             * @memberof redchannel.Command
             * @interface IRequest
             * @property {redchannel.AgentCommand|null} [command] Request command
             * @property {string|null} [input] Request input
             * @property {redchannel.IAgentConfig|null} [config] Request config
             */

            /**
             * Constructs a new Request.
             * @memberof redchannel.Command
             * @classdesc Represents a Request.
             * @implements IRequest
             * @constructor
             * @param {redchannel.Command.IRequest=} [properties] Properties to set
             */
            function Request(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Request command.
             * @member {redchannel.AgentCommand} command
             * @memberof redchannel.Command.Request
             * @instance
             */
            Request.prototype.command = 0;

            /**
             * Request input.
             * @member {string} input
             * @memberof redchannel.Command.Request
             * @instance
             */
            Request.prototype.input = "";

            /**
             * Request config.
             * @member {redchannel.IAgentConfig|null|undefined} config
             * @memberof redchannel.Command.Request
             * @instance
             */
            Request.prototype.config = null;

            /**
             * Creates a new Request instance using the specified properties.
             * @function create
             * @memberof redchannel.Command.Request
             * @static
             * @param {redchannel.Command.IRequest=} [properties] Properties to set
             * @returns {redchannel.Command.Request} Request instance
             */
            Request.create = function create(properties) {
                return new Request(properties);
            };

            /**
             * Encodes the specified Request message. Does not implicitly {@link redchannel.Command.Request.verify|verify} messages.
             * @function encode
             * @memberof redchannel.Command.Request
             * @static
             * @param {redchannel.Command.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.command);
                if (message.input != null && Object.hasOwnProperty.call(message, "input"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.input);
                if (message.config != null && Object.hasOwnProperty.call(message, "config"))
                    $root.redchannel.AgentConfig.encode(message.config, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link redchannel.Command.Request.verify|verify} messages.
             * @function encodeDelimited
             * @memberof redchannel.Command.Request
             * @static
             * @param {redchannel.Command.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @function decode
             * @memberof redchannel.Command.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {redchannel.Command.Request} Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Request.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.redchannel.Command.Request();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.command = reader.int32();
                            break;
                        }
                    case 2: {
                            message.input = reader.string();
                            break;
                        }
                    case 3: {
                            message.config = $root.redchannel.AgentConfig.decode(reader, reader.uint32());
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Request message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof redchannel.Command.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {redchannel.Command.Request} Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Request.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Request message.
             * @function verify
             * @memberof redchannel.Command.Request
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Request.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.command != null && message.hasOwnProperty("command"))
                    switch (message.command) {
                    default:
                        return "command: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                        break;
                    }
                if (message.input != null && message.hasOwnProperty("input"))
                    if (!$util.isString(message.input))
                        return "input: string expected";
                if (message.config != null && message.hasOwnProperty("config")) {
                    var error = $root.redchannel.AgentConfig.verify(message.config);
                    if (error)
                        return "config." + error;
                }
                return null;
            };

            /**
             * Creates a Request message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof redchannel.Command.Request
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {redchannel.Command.Request} Request
             */
            Request.fromObject = function fromObject(object) {
                if (object instanceof $root.redchannel.Command.Request)
                    return object;
                var message = new $root.redchannel.Command.Request();
                switch (object.command) {
                default:
                    if (typeof object.command === "number") {
                        message.command = object.command;
                        break;
                    }
                    break;
                case "AGENT_UNSPECIFIED":
                case 0:
                    message.command = 0;
                    break;
                case "AGENT_CHECKIN":
                case 1:
                    message.command = 1;
                    break;
                case "AGENT_SYSINFO":
                case 2:
                    message.command = 2;
                    break;
                case "AGENT_EXECUTE":
                case 3:
                    message.command = 3;
                    break;
                case "AGENT_EXECUTE_SHELLCODE":
                case 4:
                    message.command = 4;
                    break;
                case "AGENT_MESSAGE":
                case 5:
                    message.command = 5;
                    break;
                case "AGENT_SHUTDOWN":
                case 6:
                    message.command = 6;
                    break;
                case "AGENT_KEYX":
                case 7:
                    message.command = 7;
                    break;
                case "AGENT_SET_CONFIG":
                case 8:
                    message.command = 8;
                    break;
                case "AGENT_IGNORE":
                case 9:
                    message.command = 9;
                    break;
                }
                if (object.input != null)
                    message.input = String(object.input);
                if (object.config != null) {
                    if (typeof object.config !== "object")
                        throw TypeError(".redchannel.Command.Request.config: object expected");
                    message.config = $root.redchannel.AgentConfig.fromObject(object.config);
                }
                return message;
            };

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @function toObject
             * @memberof redchannel.Command.Request
             * @static
             * @param {redchannel.Command.Request} message Request
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Request.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.command = options.enums === String ? "AGENT_UNSPECIFIED" : 0;
                    object.input = "";
                    object.config = null;
                }
                if (message.command != null && message.hasOwnProperty("command"))
                    object.command = options.enums === String ? $root.redchannel.AgentCommand[message.command] === undefined ? message.command : $root.redchannel.AgentCommand[message.command] : message.command;
                if (message.input != null && message.hasOwnProperty("input"))
                    object.input = message.input;
                if (message.config != null && message.hasOwnProperty("config"))
                    object.config = $root.redchannel.AgentConfig.toObject(message.config, options);
                return object;
            };

            /**
             * Converts this Request to JSON.
             * @function toJSON
             * @memberof redchannel.Command.Request
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Request.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Request
             * @function getTypeUrl
             * @memberof redchannel.Command.Request
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Request.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/redchannel.Command.Request";
            };

            return Request;
        })();

        Command.Response = (function() {

            /**
             * Properties of a Response.
             * @memberof redchannel.Command
             * @interface IResponse
             * @property {redchannel.AgentCommand|null} [command] Response command
             * @property {string|null} [output] Response output
             * @property {redchannel.AgentCommandStatus|null} [status] Response status
             */

            /**
             * Constructs a new Response.
             * @memberof redchannel.Command
             * @classdesc Represents a Response.
             * @implements IResponse
             * @constructor
             * @param {redchannel.Command.IResponse=} [properties] Properties to set
             */
            function Response(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Response command.
             * @member {redchannel.AgentCommand} command
             * @memberof redchannel.Command.Response
             * @instance
             */
            Response.prototype.command = 0;

            /**
             * Response output.
             * @member {string} output
             * @memberof redchannel.Command.Response
             * @instance
             */
            Response.prototype.output = "";

            /**
             * Response status.
             * @member {redchannel.AgentCommandStatus} status
             * @memberof redchannel.Command.Response
             * @instance
             */
            Response.prototype.status = 0;

            /**
             * Creates a new Response instance using the specified properties.
             * @function create
             * @memberof redchannel.Command.Response
             * @static
             * @param {redchannel.Command.IResponse=} [properties] Properties to set
             * @returns {redchannel.Command.Response} Response instance
             */
            Response.create = function create(properties) {
                return new Response(properties);
            };

            /**
             * Encodes the specified Response message. Does not implicitly {@link redchannel.Command.Response.verify|verify} messages.
             * @function encode
             * @memberof redchannel.Command.Response
             * @static
             * @param {redchannel.Command.IResponse} message Response message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Response.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.command);
                if (message.output != null && Object.hasOwnProperty.call(message, "output"))
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.output);
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.status);
                return writer;
            };

            /**
             * Encodes the specified Response message, length delimited. Does not implicitly {@link redchannel.Command.Response.verify|verify} messages.
             * @function encodeDelimited
             * @memberof redchannel.Command.Response
             * @static
             * @param {redchannel.Command.IResponse} message Response message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Response.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Response message from the specified reader or buffer.
             * @function decode
             * @memberof redchannel.Command.Response
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {redchannel.Command.Response} Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Response.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.redchannel.Command.Response();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.command = reader.int32();
                            break;
                        }
                    case 2: {
                            message.output = reader.string();
                            break;
                        }
                    case 4: {
                            message.status = reader.int32();
                            break;
                        }
                    default:
                        reader.skipType(tag & 7);
                        break;
                    }
                }
                return message;
            };

            /**
             * Decodes a Response message from the specified reader or buffer, length delimited.
             * @function decodeDelimited
             * @memberof redchannel.Command.Response
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {redchannel.Command.Response} Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Response.decodeDelimited = function decodeDelimited(reader) {
                if (!(reader instanceof $Reader))
                    reader = new $Reader(reader);
                return this.decode(reader, reader.uint32());
            };

            /**
             * Verifies a Response message.
             * @function verify
             * @memberof redchannel.Command.Response
             * @static
             * @param {Object.<string,*>} message Plain object to verify
             * @returns {string|null} `null` if valid, otherwise the reason why it is not
             */
            Response.verify = function verify(message) {
                if (typeof message !== "object" || message === null)
                    return "object expected";
                if (message.command != null && message.hasOwnProperty("command"))
                    switch (message.command) {
                    default:
                        return "command: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                    case 5:
                    case 6:
                    case 7:
                    case 8:
                    case 9:
                        break;
                    }
                if (message.output != null && message.hasOwnProperty("output"))
                    if (!$util.isString(message.output))
                        return "output: string expected";
                if (message.status != null && message.hasOwnProperty("status"))
                    switch (message.status) {
                    default:
                        return "status: enum value expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
                return null;
            };

            /**
             * Creates a Response message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof redchannel.Command.Response
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {redchannel.Command.Response} Response
             */
            Response.fromObject = function fromObject(object) {
                if (object instanceof $root.redchannel.Command.Response)
                    return object;
                var message = new $root.redchannel.Command.Response();
                switch (object.command) {
                default:
                    if (typeof object.command === "number") {
                        message.command = object.command;
                        break;
                    }
                    break;
                case "AGENT_UNSPECIFIED":
                case 0:
                    message.command = 0;
                    break;
                case "AGENT_CHECKIN":
                case 1:
                    message.command = 1;
                    break;
                case "AGENT_SYSINFO":
                case 2:
                    message.command = 2;
                    break;
                case "AGENT_EXECUTE":
                case 3:
                    message.command = 3;
                    break;
                case "AGENT_EXECUTE_SHELLCODE":
                case 4:
                    message.command = 4;
                    break;
                case "AGENT_MESSAGE":
                case 5:
                    message.command = 5;
                    break;
                case "AGENT_SHUTDOWN":
                case 6:
                    message.command = 6;
                    break;
                case "AGENT_KEYX":
                case 7:
                    message.command = 7;
                    break;
                case "AGENT_SET_CONFIG":
                case 8:
                    message.command = 8;
                    break;
                case "AGENT_IGNORE":
                case 9:
                    message.command = 9;
                    break;
                }
                if (object.output != null)
                    message.output = String(object.output);
                switch (object.status) {
                default:
                    if (typeof object.status === "number") {
                        message.status = object.status;
                        break;
                    }
                    break;
                case "STATUS_UNSPECIFIED":
                case 0:
                    message.status = 0;
                    break;
                case "STATUS_SUCCESS":
                case 1:
                    message.status = 1;
                    break;
                case "STATUS_ERROR":
                case 2:
                    message.status = 2;
                    break;
                }
                return message;
            };

            /**
             * Creates a plain object from a Response message. Also converts values to other types if specified.
             * @function toObject
             * @memberof redchannel.Command.Response
             * @static
             * @param {redchannel.Command.Response} message Response
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Response.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.command = options.enums === String ? "AGENT_UNSPECIFIED" : 0;
                    object.output = "";
                    object.status = options.enums === String ? "STATUS_UNSPECIFIED" : 0;
                }
                if (message.command != null && message.hasOwnProperty("command"))
                    object.command = options.enums === String ? $root.redchannel.AgentCommand[message.command] === undefined ? message.command : $root.redchannel.AgentCommand[message.command] : message.command;
                if (message.output != null && message.hasOwnProperty("output"))
                    object.output = message.output;
                if (message.status != null && message.hasOwnProperty("status"))
                    object.status = options.enums === String ? $root.redchannel.AgentCommandStatus[message.status] === undefined ? message.status : $root.redchannel.AgentCommandStatus[message.status] : message.status;
                return object;
            };

            /**
             * Converts this Response to JSON.
             * @function toJSON
             * @memberof redchannel.Command.Response
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Response.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Response
             * @function getTypeUrl
             * @memberof redchannel.Command.Response
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Response.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/redchannel.Command.Response";
            };

            return Response;
        })();

        return Command;
    })();

    return redchannel;
})();

module.exports = $root;
