export default class Logger {
    error(...msg) {
        console.error(new Date().toISOString(), ...msg);
    }
    warn(msg) {
        console.warn(new Date().toISOString(), ...msg);
    }
    info(...msg) {
        this.msg(new Date().toISOString(), ...msg);
    }
    debug(...msg) {
        console.debug(new Date().toISOString(), ...msg);
    }
    success(...msg) {
        this.msg(new Date().toISOString(), ...msg);
    }
    echo(...msg) {
        this.msg(new Date().toISOString(), ...msg);
    }
    msg(...msg) {
        console.log(new Date().toISOString(), ...msg);
    }

    displayTable(columns: string[], rows: Array<string[]>) {
        this.info(columns.join("\t"));
        for (const row of rows) {
            this.info(row.join("\t"));
        }
    }
}
