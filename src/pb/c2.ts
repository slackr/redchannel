// @generated by protobuf-ts 2.9.3 with parameter server_grpc1,long_type_string,generate_dependencies
// @generated from protobuf file "c2.proto" (package "c2", syntax proto3)
// tslint:disable
import { ServiceType } from "@protobuf-ts/runtime-rpc";
import type { BinaryWriteOptions } from "@protobuf-ts/runtime";
import type { IBinaryWriter } from "@protobuf-ts/runtime";
import { WireType } from "@protobuf-ts/runtime";
import type { BinaryReadOptions } from "@protobuf-ts/runtime";
import type { IBinaryReader } from "@protobuf-ts/runtime";
import { UnknownFieldHandler } from "@protobuf-ts/runtime";
import type { PartialMessage } from "@protobuf-ts/runtime";
import { reflectionMergePartial } from "@protobuf-ts/runtime";
import { MessageType } from "@protobuf-ts/runtime";
import { UInt32Value } from "./google/protobuf/wrappers";
import { AgentCommandStatus } from "./implant";
import { AgentCommand } from "./implant";
/**
 * @generated from protobuf message c2.AgentCommandRequest
 */
export interface AgentCommandRequest {
    /**
     * @generated from protobuf field: string agent_id = 1;
     */
    agentId: string;
    /**
     * @generated from protobuf field: implant.AgentCommand command = 2;
     */
    command: AgentCommand;
    /**
     * @generated from protobuf field: bytes parameters = 3;
     */
    parameters: Uint8Array;
}
/**
 * @generated from protobuf message c2.AgentCommandResponse
 */
export interface AgentCommandResponse {
    /**
     * @generated from protobuf field: string agent_id = 1;
     */
    agentId: string;
    /**
     * @generated from protobuf field: bytes data = 2;
     */
    data: Uint8Array;
    /**
     * @generated from protobuf field: implant.AgentCommandStatus status = 3;
     */
    status: AgentCommandStatus;
}
/**
 * @generated from protobuf message c2.Agent
 */
export interface Agent {
    /**
     * @generated from protobuf field: string agent_id = 1;
     */
    agentId: string;
    /**
     * @generated from protobuf field: bool has_keyx = 2;
     */
    hasKeyx: boolean;
    /**
     * @generated from protobuf field: google.protobuf.UInt32Value lastseen = 3;
     */
    lastseen?: UInt32Value;
    /**
     * @generated from protobuf field: repeated string ip = 4;
     */
    ip: string[];
    /**
     * @generated from protobuf field: google.protobuf.UInt32Value sendq_size = 5;
     */
    sendqSize?: UInt32Value;
    /**
     * @generated from protobuf field: google.protobuf.UInt32Value recvq_size = 6;
     */
    recvqSize?: UInt32Value;
}
/**
 * @generated from protobuf message c2.GetAgentsRequest
 */
export interface GetAgentsRequest {
}
/**
 * @generated from protobuf message c2.GetAgentsResponse
 */
export interface GetAgentsResponse {
    /**
     * @generated from protobuf field: repeated c2.Agent agents = 1;
     */
    agents: Agent[];
    /**
     * @generated from protobuf field: c2.CommandStatus status = 2;
     */
    status: CommandStatus;
}
/**
 * @generated from protobuf message c2.KeyxRequest
 */
export interface KeyxRequest {
    /**
     * @generated from protobuf field: string agent_id = 1;
     */
    agentId: string;
    /**
     * @generated from protobuf field: bool all_agents = 2;
     */
    allAgents: boolean;
}
/**
 * @generated from protobuf message c2.KeyxResponse
 */
export interface KeyxResponse {
    /**
     * @generated from protobuf field: c2.CommandStatus status = 1;
     */
    status: CommandStatus;
}
/**
 * @generated from protobuf message c2.BuildImplantRequest
 */
export interface BuildImplantRequest {
    /**
     * @generated from protobuf field: string os = 1;
     */
    os: string;
    /**
     * @generated from protobuf field: string arch = 2;
     */
    arch: string;
}
/**
 * @generated from protobuf message c2.BuildImplantResponse
 */
export interface BuildImplantResponse {
    /**
     * @generated from protobuf field: c2.CommandStatus status = 1;
     */
    status: CommandStatus;
}
/**
 * @generated from protobuf enum c2.C2Command
 */
export enum C2Command {
    /**
     * @generated from protobuf enum value: C2_COMMAND_UNKNOWN = 0;
     */
    UNKNOWN = 0,
    /**
     * @generated from protobuf enum value: C2_COMMAND_KEYX = 1;
     */
    KEYX = 1,
    /**
     * @generated from protobuf enum value: C2_COMMAND_GET_AGENTS = 2;
     */
    GET_AGENTS = 2,
    /**
     * @generated from protobuf enum value: C2_COMMAND_SET_CONFIG = 3;
     */
    SET_CONFIG = 3
}
/**
 * @generated from protobuf enum c2.CommandStatus
 */
export enum CommandStatus {
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_UNKNOWN = 0;
     */
    UNKNOWN = 0,
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_SUCCESS = 1;
     */
    SUCCESS = 1,
    /**
     * @generated from protobuf enum value: COMMAND_STATUS_ERROR = 2;
     */
    ERROR = 2
}
/**
 * @generated from protobuf enum c2.C2Module
 */
export enum C2Module {
    /**
     * @generated from protobuf enum value: C2_MODULE_UNKNOWN = 0;
     */
    UNKNOWN = 0,
    /**
     * @generated from protobuf enum value: C2_MODULE_C2 = 1;
     */
    C2 = 1,
    /**
     * @generated from protobuf enum value: C2_MODULE_PROXY = 2;
     */
    PROXY = 2,
    /**
     * @generated from protobuf enum value: C2_MODULE_IMPLANT = 3;
     */
    IMPLANT = 3,
    /**
     * @generated from protobuf enum value: C2_MODULE_SKIMMER = 4;
     */
    SKIMMER = 4,
    /**
     * @generated from protobuf enum value: C2_MODULE_STATIC_DNS = 5;
     */
    STATIC_DNS = 5
}
/**
 * @generated from protobuf enum c2.AgentChannel
 */
export enum AgentChannel {
    /**
     * @generated from protobuf enum value: AGENT_CHANNEL_UNKNOWN = 0;
     */
    UNKNOWN = 0,
    /**
     * @generated from protobuf enum value: AGENT_CHANNEL_DNS = 1;
     */
    DNS = 1,
    /**
     * @generated from protobuf enum value: AGENT_CHANNEL_PROXY = 2;
     */
    PROXY = 2
}
/**
 * @generated from protobuf enum c2.ServerEvent
 */
export enum ServerEvent {
    /**
     * @generated from protobuf enum value: SERVER_EVENT_UNKNOWN = 0;
     */
    UNKNOWN = 0,
    /**
     * @generated from protobuf enum value: SERVER_EVENT_CONNECTION = 1;
     */
    CONNECTION = 1,
    /**
     * @generated from protobuf enum value: SERVER_EVENT_DISCONNECT = 2;
     */
    DISCONNECT = 2,
    /**
     * @generated from protobuf enum value: SERVER_EVENT_AUTH = 3;
     */
    AUTH = 3,
    /**
     * @generated from protobuf enum value: SERVER_EVENT_MESSAGE = 4;
     */
    MESSAGE = 4,
    /**
     * @generated from protobuf enum value: SERVER_EVENT_ERROR = 5;
     */
    ERROR = 5
}
// @generated message type with reflection information, may provide speed optimized methods
class AgentCommandRequest$Type extends MessageType<AgentCommandRequest> {
    constructor() {
        super("c2.AgentCommandRequest", [
            { no: 1, name: "agent_id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "command", kind: "enum", T: () => ["implant.AgentCommand", AgentCommand, "AGENT_COMMAND_"] },
            { no: 3, name: "parameters", kind: "scalar", T: 12 /*ScalarType.BYTES*/ }
        ]);
    }
    create(value?: PartialMessage<AgentCommandRequest>): AgentCommandRequest {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.agentId = "";
        message.command = 0;
        message.parameters = new Uint8Array(0);
        if (value !== undefined)
            reflectionMergePartial<AgentCommandRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: AgentCommandRequest): AgentCommandRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string agent_id */ 1:
                    message.agentId = reader.string();
                    break;
                case /* implant.AgentCommand command */ 2:
                    message.command = reader.int32();
                    break;
                case /* bytes parameters */ 3:
                    message.parameters = reader.bytes();
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
    internalBinaryWrite(message: AgentCommandRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string agent_id = 1; */
        if (message.agentId !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.agentId);
        /* implant.AgentCommand command = 2; */
        if (message.command !== 0)
            writer.tag(2, WireType.Varint).int32(message.command);
        /* bytes parameters = 3; */
        if (message.parameters.length)
            writer.tag(3, WireType.LengthDelimited).bytes(message.parameters);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.AgentCommandRequest
 */
export const AgentCommandRequest = new AgentCommandRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class AgentCommandResponse$Type extends MessageType<AgentCommandResponse> {
    constructor() {
        super("c2.AgentCommandResponse", [
            { no: 1, name: "agent_id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "data", kind: "scalar", T: 12 /*ScalarType.BYTES*/ },
            { no: 3, name: "status", kind: "enum", T: () => ["implant.AgentCommandStatus", AgentCommandStatus] }
        ]);
    }
    create(value?: PartialMessage<AgentCommandResponse>): AgentCommandResponse {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.agentId = "";
        message.data = new Uint8Array(0);
        message.status = 0;
        if (value !== undefined)
            reflectionMergePartial<AgentCommandResponse>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: AgentCommandResponse): AgentCommandResponse {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string agent_id */ 1:
                    message.agentId = reader.string();
                    break;
                case /* bytes data */ 2:
                    message.data = reader.bytes();
                    break;
                case /* implant.AgentCommandStatus status */ 3:
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
    internalBinaryWrite(message: AgentCommandResponse, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string agent_id = 1; */
        if (message.agentId !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.agentId);
        /* bytes data = 2; */
        if (message.data.length)
            writer.tag(2, WireType.LengthDelimited).bytes(message.data);
        /* implant.AgentCommandStatus status = 3; */
        if (message.status !== 0)
            writer.tag(3, WireType.Varint).int32(message.status);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.AgentCommandResponse
 */
export const AgentCommandResponse = new AgentCommandResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class Agent$Type extends MessageType<Agent> {
    constructor() {
        super("c2.Agent", [
            { no: 1, name: "agent_id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "has_keyx", kind: "scalar", T: 8 /*ScalarType.BOOL*/ },
            { no: 3, name: "lastseen", kind: "message", T: () => UInt32Value },
            { no: 4, name: "ip", kind: "scalar", repeat: 2 /*RepeatType.UNPACKED*/, T: 9 /*ScalarType.STRING*/ },
            { no: 5, name: "sendq_size", kind: "message", T: () => UInt32Value },
            { no: 6, name: "recvq_size", kind: "message", T: () => UInt32Value }
        ]);
    }
    create(value?: PartialMessage<Agent>): Agent {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.agentId = "";
        message.hasKeyx = false;
        message.ip = [];
        if (value !== undefined)
            reflectionMergePartial<Agent>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: Agent): Agent {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string agent_id */ 1:
                    message.agentId = reader.string();
                    break;
                case /* bool has_keyx */ 2:
                    message.hasKeyx = reader.bool();
                    break;
                case /* google.protobuf.UInt32Value lastseen */ 3:
                    message.lastseen = UInt32Value.internalBinaryRead(reader, reader.uint32(), options, message.lastseen);
                    break;
                case /* repeated string ip */ 4:
                    message.ip.push(reader.string());
                    break;
                case /* google.protobuf.UInt32Value sendq_size */ 5:
                    message.sendqSize = UInt32Value.internalBinaryRead(reader, reader.uint32(), options, message.sendqSize);
                    break;
                case /* google.protobuf.UInt32Value recvq_size */ 6:
                    message.recvqSize = UInt32Value.internalBinaryRead(reader, reader.uint32(), options, message.recvqSize);
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
    internalBinaryWrite(message: Agent, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string agent_id = 1; */
        if (message.agentId !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.agentId);
        /* bool has_keyx = 2; */
        if (message.hasKeyx !== false)
            writer.tag(2, WireType.Varint).bool(message.hasKeyx);
        /* google.protobuf.UInt32Value lastseen = 3; */
        if (message.lastseen)
            UInt32Value.internalBinaryWrite(message.lastseen, writer.tag(3, WireType.LengthDelimited).fork(), options).join();
        /* repeated string ip = 4; */
        for (let i = 0; i < message.ip.length; i++)
            writer.tag(4, WireType.LengthDelimited).string(message.ip[i]);
        /* google.protobuf.UInt32Value sendq_size = 5; */
        if (message.sendqSize)
            UInt32Value.internalBinaryWrite(message.sendqSize, writer.tag(5, WireType.LengthDelimited).fork(), options).join();
        /* google.protobuf.UInt32Value recvq_size = 6; */
        if (message.recvqSize)
            UInt32Value.internalBinaryWrite(message.recvqSize, writer.tag(6, WireType.LengthDelimited).fork(), options).join();
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.Agent
 */
export const Agent = new Agent$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetAgentsRequest$Type extends MessageType<GetAgentsRequest> {
    constructor() {
        super("c2.GetAgentsRequest", []);
    }
    create(value?: PartialMessage<GetAgentsRequest>): GetAgentsRequest {
        const message = globalThis.Object.create((this.messagePrototype!));
        if (value !== undefined)
            reflectionMergePartial<GetAgentsRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: GetAgentsRequest): GetAgentsRequest {
        return target ?? this.create();
    }
    internalBinaryWrite(message: GetAgentsRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.GetAgentsRequest
 */
export const GetAgentsRequest = new GetAgentsRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class GetAgentsResponse$Type extends MessageType<GetAgentsResponse> {
    constructor() {
        super("c2.GetAgentsResponse", [
            { no: 1, name: "agents", kind: "message", repeat: 1 /*RepeatType.PACKED*/, T: () => Agent },
            { no: 2, name: "status", kind: "enum", T: () => ["c2.CommandStatus", CommandStatus, "COMMAND_STATUS_"] }
        ]);
    }
    create(value?: PartialMessage<GetAgentsResponse>): GetAgentsResponse {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.agents = [];
        message.status = 0;
        if (value !== undefined)
            reflectionMergePartial<GetAgentsResponse>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: GetAgentsResponse): GetAgentsResponse {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* repeated c2.Agent agents */ 1:
                    message.agents.push(Agent.internalBinaryRead(reader, reader.uint32(), options));
                    break;
                case /* c2.CommandStatus status */ 2:
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
    internalBinaryWrite(message: GetAgentsResponse, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* repeated c2.Agent agents = 1; */
        for (let i = 0; i < message.agents.length; i++)
            Agent.internalBinaryWrite(message.agents[i], writer.tag(1, WireType.LengthDelimited).fork(), options).join();
        /* c2.CommandStatus status = 2; */
        if (message.status !== 0)
            writer.tag(2, WireType.Varint).int32(message.status);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.GetAgentsResponse
 */
export const GetAgentsResponse = new GetAgentsResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class KeyxRequest$Type extends MessageType<KeyxRequest> {
    constructor() {
        super("c2.KeyxRequest", [
            { no: 1, name: "agent_id", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "all_agents", kind: "scalar", T: 8 /*ScalarType.BOOL*/ }
        ]);
    }
    create(value?: PartialMessage<KeyxRequest>): KeyxRequest {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.agentId = "";
        message.allAgents = false;
        if (value !== undefined)
            reflectionMergePartial<KeyxRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: KeyxRequest): KeyxRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string agent_id */ 1:
                    message.agentId = reader.string();
                    break;
                case /* bool all_agents */ 2:
                    message.allAgents = reader.bool();
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
    internalBinaryWrite(message: KeyxRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string agent_id = 1; */
        if (message.agentId !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.agentId);
        /* bool all_agents = 2; */
        if (message.allAgents !== false)
            writer.tag(2, WireType.Varint).bool(message.allAgents);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.KeyxRequest
 */
export const KeyxRequest = new KeyxRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class KeyxResponse$Type extends MessageType<KeyxResponse> {
    constructor() {
        super("c2.KeyxResponse", [
            { no: 1, name: "status", kind: "enum", T: () => ["c2.CommandStatus", CommandStatus, "COMMAND_STATUS_"] }
        ]);
    }
    create(value?: PartialMessage<KeyxResponse>): KeyxResponse {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.status = 0;
        if (value !== undefined)
            reflectionMergePartial<KeyxResponse>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: KeyxResponse): KeyxResponse {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* c2.CommandStatus status */ 1:
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
    internalBinaryWrite(message: KeyxResponse, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* c2.CommandStatus status = 1; */
        if (message.status !== 0)
            writer.tag(1, WireType.Varint).int32(message.status);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.KeyxResponse
 */
export const KeyxResponse = new KeyxResponse$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BuildImplantRequest$Type extends MessageType<BuildImplantRequest> {
    constructor() {
        super("c2.BuildImplantRequest", [
            { no: 1, name: "os", kind: "scalar", T: 9 /*ScalarType.STRING*/ },
            { no: 2, name: "arch", kind: "scalar", T: 9 /*ScalarType.STRING*/ }
        ]);
    }
    create(value?: PartialMessage<BuildImplantRequest>): BuildImplantRequest {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.os = "";
        message.arch = "";
        if (value !== undefined)
            reflectionMergePartial<BuildImplantRequest>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: BuildImplantRequest): BuildImplantRequest {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* string os */ 1:
                    message.os = reader.string();
                    break;
                case /* string arch */ 2:
                    message.arch = reader.string();
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
    internalBinaryWrite(message: BuildImplantRequest, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* string os = 1; */
        if (message.os !== "")
            writer.tag(1, WireType.LengthDelimited).string(message.os);
        /* string arch = 2; */
        if (message.arch !== "")
            writer.tag(2, WireType.LengthDelimited).string(message.arch);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.BuildImplantRequest
 */
export const BuildImplantRequest = new BuildImplantRequest$Type();
// @generated message type with reflection information, may provide speed optimized methods
class BuildImplantResponse$Type extends MessageType<BuildImplantResponse> {
    constructor() {
        super("c2.BuildImplantResponse", [
            { no: 1, name: "status", kind: "enum", T: () => ["c2.CommandStatus", CommandStatus, "COMMAND_STATUS_"] }
        ]);
    }
    create(value?: PartialMessage<BuildImplantResponse>): BuildImplantResponse {
        const message = globalThis.Object.create((this.messagePrototype!));
        message.status = 0;
        if (value !== undefined)
            reflectionMergePartial<BuildImplantResponse>(this, message, value);
        return message;
    }
    internalBinaryRead(reader: IBinaryReader, length: number, options: BinaryReadOptions, target?: BuildImplantResponse): BuildImplantResponse {
        let message = target ?? this.create(), end = reader.pos + length;
        while (reader.pos < end) {
            let [fieldNo, wireType] = reader.tag();
            switch (fieldNo) {
                case /* c2.CommandStatus status */ 1:
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
    internalBinaryWrite(message: BuildImplantResponse, writer: IBinaryWriter, options: BinaryWriteOptions): IBinaryWriter {
        /* c2.CommandStatus status = 1; */
        if (message.status !== 0)
            writer.tag(1, WireType.Varint).int32(message.status);
        let u = options.writeUnknownFields;
        if (u !== false)
            (u == true ? UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
        return writer;
    }
}
/**
 * @generated MessageType for protobuf message c2.BuildImplantResponse
 */
export const BuildImplantResponse = new BuildImplantResponse$Type();
/**
 * @generated ServiceType for protobuf service c2.RedChannel
 */
export const RedChannel = new ServiceType("c2.RedChannel", [
    { name: "GetAgents", options: {}, I: GetAgentsRequest, O: GetAgentsResponse },
    { name: "Keyx", options: {}, I: KeyxRequest, O: KeyxResponse },
    { name: "BuildImplant", options: {}, I: BuildImplantRequest, O: BuildImplantResponse }
]);
