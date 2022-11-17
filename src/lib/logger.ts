export default class Logger {
    error(msg) {
        console.error(msg);
    }
    warn(msg) {
        console.warn(msg);
    }
    info(msg) {
        this.msg(msg);
    }
    debug(msg) {
        console.debug(msg);
    }
    success(msg) {
        console.log(msg);
    }
    echo(msg) {
        console.log(msg);
    }
    msg(msg) {
        console.log(msg);
    }
    displayTable(columns: string[], rows: Array<string[]>) {
        console.log(columns.join("\t"));
        for (const row of rows) {
            console.log(row.join("\t"));
        }
    }
}
