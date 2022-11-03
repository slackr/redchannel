import BaseModule from "./base";

const MODULE_DESCRIPTION = "handles redchannel c2 management";

export default class C2Module extends BaseModule {
    constructor(protected configFile) {
        super("c2", configFile);

        this.description = MODULE_DESCRIPTION;

        this.config = this.loadConfig();

        this.defineCommands({});
    }

    run() {}
}
