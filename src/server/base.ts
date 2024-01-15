import Logger from "../lib/logger";

export type OnSuccessCallback = () => void;

export interface ServerBase {
    log: Logger;
    start(onSuccess: OnSuccessCallback): void;
}
