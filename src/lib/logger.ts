export default class RedChannelLogger {
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
    msg(msg, level = "info") {
        console.log(msg);
    }
}
