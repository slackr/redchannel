export interface Module {
    // execute the module (eg: generate payload, start some loop, etc)
    execute: () => void;
}
