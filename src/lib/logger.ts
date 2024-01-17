export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export default class Logger {
    level: LogLevel = LogLevel.INFO;

    error(...msg) {
        console.error(new Date().toISOString(), LogLevel[LogLevel.ERROR], "\t", ...msg);
    }
    warn(msg) {
        if (this.level >= LogLevel.WARN) console.warn(new Date().toISOString(), LogLevel[LogLevel.WARN], "\t", ...msg);
    }
    debug(...msg) {
        console.debug(new Date().toISOString(), LogLevel[LogLevel.DEBUG], "\t", ...msg);
    }
    info(...msg) {
        if (this.level >= LogLevel.INFO) console.log(new Date().toISOString(), LogLevel[LogLevel.INFO], "\t", ...msg);
    }
    msg(...msg) {
        console.log(...msg);
    }
}
