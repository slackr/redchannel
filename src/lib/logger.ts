export enum LogLevel {
    DEBUG,
    INFO,
    WARN,
    ERROR,
}

export default class Logger {
    level: LogLevel = LogLevel.INFO;

    error(...msg) {
        console.error(new Date().toISOString(), ...msg);
    }
    warn(msg) {
        if (this.level >= LogLevel.WARN) console.warn(new Date().toISOString(), ...msg);
    }
    info(...msg) {
        if (this.level >= LogLevel.INFO) this.msg(...msg);
    }
    debug(...msg) {
        console.debug(new Date().toISOString(), ...msg);
    }
    success(...msg) {
        if (this.level >= LogLevel.INFO) this.msg(...msg);
    }
    echo(...msg) {
        this.msg(...msg);
    }
    msg(...msg) {
        if (this.level >= LogLevel.INFO) console.log(new Date().toISOString(), ...msg);
    }

    displayTable(columns: string[], rows: Array<string[]>) {
        this.info(columns.join("\t"));
        for (const row of rows) {
            this.info(row.join("\t"));
        }
    }
}
