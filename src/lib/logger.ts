import EventEmitter from "node:events";
import { LogLevel } from "../pb/c2";

export type OnLogEntryEventHandler = (...msg) => void;

export default class Logger {
    level: LogLevel = LogLevel.INFO;
    eventEmitter: EventEmitter;

    constructor() {
        this.eventEmitter = new EventEmitter({});
    }

    emit(level: LogLevel, ...msg) {
        if (level === LogLevel.DEBUG) console.debug(...msg);
        if (level === LogLevel.INFO) console.log(...msg);
        if (level === LogLevel.WARN) console.warn(...msg);
        if (level === LogLevel.ERROR) console.error(...msg);
        this.eventEmitter.emit("log", level, ...msg);
    }

    debug(...msg) {
        this.emit(LogLevel.DEBUG, new Date().toISOString(), LogLevel[LogLevel.DEBUG], "\t", ...msg);
    }
    info(...msg) {
        if (this.level >= LogLevel.INFO) {
            this.emit(LogLevel.INFO, new Date().toISOString(), LogLevel[LogLevel.INFO], "\t", ...msg);
        }
    }
    warn(...msg) {
        if (this.level >= LogLevel.WARN) {
            this.emit(LogLevel.WARN, new Date().toISOString(), LogLevel[LogLevel.WARN], "\t", ...msg);
        }
    }
    error(...msg) {
        this.emit(LogLevel.ERROR, new Date().toISOString(), LogLevel[LogLevel.ERROR], "\t", ...msg);
    }

    msg(...msg) {
        this.emit(LogLevel.INFO, ...msg);
    }
}
