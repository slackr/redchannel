class RedChannelObject {
    constructor(component) {
        this.component = component;
    }
    log(msg) {
        console.log(new Date().toISOString() + " - " + this.component + " - " + msg);
    }
}

module.exports = RedChannelObject;
