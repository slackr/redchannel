// @generated by protobuf-ts 2.9.3 with parameter server_grpc1,long_type_string,generate_dependencies
// @generated from protobuf file "implant.proto" (package "implant", syntax proto3)
// tslint:disable
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
import { BoolValue } from "./google/protobuf/wrappers";
import { UInt32Value } from "./google/protobuf/wrappers";
import { StringValue } from "./google/protobuf/wrappers";
/**
 * @generated from protobuf message implant.AgentConfig
 */
export interface AgentConfig {
    /**
     * @generated from protobuf field: string c2_domain = 1;
     */
    c2Domain: string;
    /**
     * @generated from protobuf field: string c2_password = 2;
     */
    c2Password: string;
    /**
     * google's proto wrappers allow us to check if the field exists, so we don't
     * accidentally use the default proto3 values for optional fields
     *
     * @generated from protobuf field: google.protobuf.StringValue resolver = 3;
     */
    resolver?: StringValue;
    /**
     * @generated from protobuf field: google.protobuf.UInt32Value c2_interval_ms = 4;
     */
    c2IntervalMs?: UInt32Value;
    /**
     * @generated from protobuf field: google.protobuf.BoolValue use_web_channel = 5;
     */
    useWebChannel?: BoolValue;
    /**
     * @generated from protobuf field: google.protobuf.StringValue web_url = 6;
     */
    webUrl?: StringValue;
    /**
     * @generated from protobuf field: google.protobuf.StringValue web_key = 7;
     */
    webKey?: StringValue;
    /**
     * @generated from protobuf field: google.protobuf.BoolValue throttle_sendq = 8;
     */
    throttleSendq?: BoolValue;
}
/**
 * @generated from protobuf message implant.SysInfoData
 */
export interface SysInfoData {
    /**
     * @generated from protobuf field: string hostname = 1;
     */
    hostname: string;
    /**
     * @generated from protobuf field: repeated string ip = 2;
     */
    ip: string[];
    /**
     * @generated from protobuf field: string user = 3;
     */
    user: string;
    /**
     * @generated from protobuf field: string uid = 4;
     */
    uid: string;
    /**
     * @generated from protobuf field: string gid = 5;
     */
    gid: string;
}
/**
 * c2 and agent communicate via Command messages
 * Request message comes from the c2 and instructs the agent on what to do
 * (command) with the input, along with any additional data, such as config in
 * the event of a SET_CONFIG command
 *
 * @generated from protobuf message implant.Command
 */
export interface Command {
}
/**
 * @generated from protobuf message implant.Command.Request
 */
export interface Command_Request {
    /**
     * @generated from protobuf field: implant.AgentCommand command = 1;
     */
    command: AgentCommand;
    /**
     * @generated from protobuf field: bytes data = 2;
     */
    data: Uint8Array;
}
/**
 * @generated from protobuf message implant.Command.Response
 */
export interface Command_Response {
    /**
     * @generated from protobuf field: implant.AgentCommand command = 1;
     */
    command: AgentCommand;
    /**
     * @generated from protobuf field: bytes data = 2;
     */
    data: Uint8Array;
    /**
     * @generated from protobuf field: implant.AgentCommandStatus status = 4;
     */
    status: AgentCommandStatus;
}
/**
 * @generated from protobuf enum implant.AgentCommand
 */
export enum AgentCommand {
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_UNSPECIFIED = 0;
     */
    UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_CHECKIN = 1;
     */
    CHECKIN = 1,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_SYSINFO = 2;
     */
    SYSINFO = 2,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_EXECUTE = 3;
     */
    EXECUTE = 3,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_EXECUTE_SHELLCODE = 4;
     */
    EXECUTE_SHELLCODE = 4,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_MESSAGE = 5;
     */
    MESSAGE = 5,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_SHUTDOWN = 6;
     */
    SHUTDOWN = 6,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_KEYX = 7;
     */
    KEYX = 7,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_SET_CONFIG = 8;
     */
    SET_CONFIG = 8,
    /**
     * @generated from protobuf enum value: AGENT_COMMAND_IGNORE = 9;
     */
    IGNORE = 9
}
/**
 * @generated from protobuf enum implant.C2ResponseStatus
 */
export enum C2ResponseStatus {
    /**
     * @generated from protobuf enum value: C2_STATUS_UNSPECIFIED = 0;
     */
    C2_STATUS_UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: NEED_MORE_DATA = 1;
     */
    NEED_MORE_DATA = 1,
    /**
     * @generated from protobuf enum value: DATA_RECEIVED = 2;
     */
    DATA_RECEIVED = 2,
    /**
     * @generated from protobuf enum value: NO_DATA = 3;
     */
    NO_DATA = 3,
    /**
     * @generated from protobuf enum value: ERROR_IMPORTING_KEY = 4;
     */
    ERROR_IMPORTING_KEY = 4,
    /**
     * @generated from protobuf enum value: ERROR_DERIVING_SECRET = 5;
     */
    ERROR_DERIVING_SECRET = 5,
    /**
     * @generated from protobuf enum value: ERROR_DECRYPTING_MESSAGE = 6;
     */
    ERROR_DECRYPTING_MESSAGE = 6,
    /**
     * @generated from protobuf enum value: ERROR_GENERATING_KEYS = 7;
     */
    ERROR_GENERATING_KEYS = 7,
    /**
     * @generated from protobuf enum value: ERROR_INVALID_MESSAGE = 8;
     */
    ERROR_INVALID_MESSAGE = 8,
    /**
     * @generated from protobuf enum value: ERROR_AGENT_UNKNOWN = 9;
     */
    ERROR_AGENT_UNKNOWN = 9,
    /**
     * @generated from protobuf enum value: ERROR_CHECKING_IN = 10;
     */
    ERROR_CHECKING_IN = 10,
    /**
     * @generated from protobuf enum value: ERROR_KEYX_NOT_ALLOWED = 11;
     */
    ERROR_KEYX_NOT_ALLOWED = 11,
    /**
     * @generated from protobuf enum value: ERROR_INVALID_SYSINFO = 12;
     */
    ERROR_INVALID_SYSINFO = 12,
    /**
     * @generated from protobuf enum value: ERROR_FAILED = 13;
     */
    ERROR_FAILED = 13
}
/**
 * @generated from protobuf enum implant.AgentCommandStatus
 */
export enum AgentCommandStatus {
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_UNSPECIFIED = 0;
     */
    COMMAND_STATUS_UNSPECIFIED = 0,
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_SUCCESS = 1;
     */
    COMMAND_STATUS_SUCCESS = 1,
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_ERROR = 2;
     */
    COMMAND_STATUS_ERROR = 2
}
// @generated message type with reflection information, may provide speed optimized methods
class AgentConfig$Type extends MessageType<AgentConfig> {
    constructor() {
        super("implant.AgentConfig", [
            { no: 1, name: "c2_domain", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "c2_password", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "resolver", kind: "message", T: () => StringValue },
            { no: 4, name: "c2_interval_ms", kind: "message", T: () => UInt32Value },
            { no: 5, name: "use_web_channel", kind: "message", T: () => BoolValue },
            { no: 6, name: "web_url", kind: "message", T: () => StringValue },
            { no: 7, name: "web_key", kind: "message", T: () => StringValue },
            { no: 8, name: "throttle_sendq", kind: "message", T: () => BoolValue }
        ]);
    }
    create(value?: PartialMessage<AgentConfig>): AgentConfig {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.c2Domain = "";
        message.c2Password = "";
        if (value !== undefined)
            reflectionMergePartial<AgentConfig>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: AgentConfig): AgentConfig {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string c2_domain */ 1:
                    message.c2Domain = reader.string();
                    break;
                case /* string c2_password */ 2:
                    message.c2Password = reader.string();
                    break;
                case /* google.protobuf.StringValue resolver */ 3:
                    message.resolver = StringValue.internalBinaryRead(reader, reader.uint32(), options, message.resolver);
                    break;
                case /* google.protobuf.UInt32Value c2_interval_ms */ 4:
                    message.c2IntervalMs = UInt32Value.internalBinaryRead(reader, reader.uint32(), options, message.c2IntervalMs);
                    break;
                case /* google.protobuf.BoolValue use_web_channel */ 5:
                    message.useWebChannel = BoolValue.internalBinaryRead(reader, reader.uint32(), options, message.useWebChannel);
                    break;
                case /* google.protobuf.StringValue web_url */ 6:
                    message.webUrl = StringValue.internalBinaryRead(reader, reader.uint32(), options, message.webUrl);
                    break;
                case /* google.protobuf.StringValue web_key */ 7:
                    message.webKey = StringValue.internalBinaryRead(reader, reader.uint32(), options, message.webKey);
                    break;
                case /* google.protobuf.BoolValue throttle_sendq */ 8:
                    message.throttleSendq = BoolValue.internalBinaryRead(reader, reader.uint32(), options, message.throttleSendq);
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: AgentConfig, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string c2_domain = 1; */
        if (message.c2Domain !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.c2Domain);
        /* string c2_password = 2; */
        if (message.c2Password !== "")
            writer.tag(2, WireType.LengthDelimited).string(message.c2Password);
        /* google.protobuf.StringValue resolver = 3; */
        if (message.resolver)
            StringValue.internalBinaryWrite(message.resolver, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.UInt32Value c2_interval_ms = 4; */
        if (message.c2IntervalMs)
            UInt32Value.internalBinaryWrite(message.c2IntervalMs, writer.tag(4, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.BoolValue use_web_channel = 5; */
        if (message.useWebChannel)
            BoolValue.internalBinaryWrite(message.useWebChannel, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.StringValue web_url = 6; */
        if (message.webUrl)
            StringValue.internalBinaryWrite(message.webUrl, writer.tag(6, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.StringValue web_key = 7; */
        if (message.webKey)
            StringValue.internalBinaryWrite(message.webKey, writer.tag(7, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.BoolValue throttle_sendq = 8; */
        if (message.throttleSendq)
            BoolValue.internalBinaryWrite(message.throttleSendq, writer.tag(8, WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message implant.AgentConfig
 */
export const AgentConfig = new AgentConfig$Type();
// @generated message type with reflection information, may provide speed optimized methods
class SysInfoData$Type extends MessageType<SysInfoData> {
    constructor() {
        super("implant.SysInfoData", [
            { no: 1, name: "hostname", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "ip", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 3, name: "user", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 4, name: "uid", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "gid", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value?: PartialMessage<SysInfoData>): SysInfoData {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.hostname = "";
        message.ip = [];
        message.user = "";
        message.uid = "";
        message.gid = "";
        if (value !== undefined)
            reflectionMergePartial<SysInfoData>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: SysInfoData): SysInfoData {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string hostname */ 1:
                    message.hostname = reader.string();
                    break;
                case /* repeated string ip */ 2:
                    message.ip.push(reader.string());
                    break;
                case /* string user */ 3:
                    message.user = reader.string();
                    break;
                case /* string uid */ 4:
                    message.uid = reader.string();
                    break;
                case /* string gid */ 5:
                    message.gid = reader.string();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: SysInfoData, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string hostname = 1; */
        if (message.hostname !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.hostname);
        /* repeated string ip = 2; */
        for (let i = 0; i < message.ip.length; i++)
            writer.tag(2, WireType.LengthDelimited).string(message.ip[i]);
        /* string user = 3; */
        if (message.user !== "")
            writer.tag(3, WireType.LengthDelimited).string(message.user);
        /* string uid = 4; */
        if (message.uid !== "")
            writer.tag(4, WireType.LengthDelimited).string(message.uid);
        /* string gid = 5; */
        if (message.gid !== "")
            writer.tag(5, WireType.LengthDelimited).string(message.gid);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message implant.SysInfoData
 */
export const SysInfoData = new SysInfoData$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Command$Type extends MessageType<Command> {
    constructor() {
        super("implant.Command", []);
    }
    create(value?: PartialMessage<Command>): Command {
        const message = globalThis.Object.create((this.messagePrototype!));
        if (value !== undefined)
            reflectionMergePartial<Command>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: Command): Command {
        return target ?? this.create();
    }
    internalBinaryWrite(message: Command, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message implant.Command
 */
export const Command = new Command$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Command_Request$Type extends MessageType<Command_Request> {
    constructor() {
        super("implant.Command.Request", [
            { no: 1, name: "command", kind: "enum", T: () => ["implant.AgentCommand", AgentCommand, "AGENT_COMMAND_"] },
            { no: 2, name: "data", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<Command_Request>): Command_Request {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.command = 0;
        message.data = new Uint8Array(0);
        if (value !== undefined)
            reflectionMergePartial<Command_Request>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: Command_Request): Command_Request {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* implant.AgentCommand command */ 1:
                    message.command = reader.int32();
                    break;
                case /* bytes data */ 2:
                    message.data = reader.bytes();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: Command_Request, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* implant.AgentCommand command = 1; */
        if (message.command !== 0)
            writer.tag(1, WireType.Varint).int32(message.command);
        /* bytes data = 2; */
        if (message.data.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.data);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message implant.Command.Request
 */
export const Command_Request = new Command_Request$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Command_Response$Type extends MessageType<Command_Response> {
    constructor() {
        super("implant.Command.Response", [
            { no: 1, name: "command", kind: "enum", T: () => ["implant.AgentCommand", AgentCommand, "AGENT_COMMAND_"] },
            { no: 2, name: "data", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 4, name: "status", kind: "enum", T: () => ["implant.AgentCommandStatus", AgentCommandStatus] }
        ]);
    }
    create(value?: PartialMessage<Command_Response>): Command_Response {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.command = 0;
        message.data = new Uint8Array(0);
        message.status = 0;
        if (value !== undefined)
            reflectionMergePartial<Command_Response>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: Command_Response): Command_Response {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* implant.AgentCommand command */ 1:
                    message.command = reader.int32();
                    break;
                case /* bytes data */ 2:
                    message.data = reader.bytes();
                    break;
                case /* implant.AgentCommandStatus status */ 4:
                    message.status = reader.int32();
                    break;
                default:
                    let u = options.readUnknownField;
                    if (u === "throw")
                        throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
                    let d = reader.skip(wireType);
                    if (u !== false)
                        (u === true ? UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
            }
        }
        return message;
    }
    internalBinaryWrite(message: Command_Response, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* implant.AgentCommand command = 1; */
        if (message.command !== 0)
            writer.tag(1, WireType.Varint).int32(message.command);
        /* bytes data = 2; */
        if (message.data.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.data);
        /* implant.AgentCommandStatus status = 4; */
        if (message.status !== 0)
            writer.tag(4, WireType.Varint).int32(message.status);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message implant.Command.Response
 */
export const Command_Response = new Command_Response$Type();
