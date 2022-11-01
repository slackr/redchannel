export const log = {
    error: (...msg) => {
        console.error(new Date().toISOString(), ...msg);
    },
    info: (...msg) => {
        console.info(new Date().toISOString(), ...msg);
    },
    warn: (...msg) => {
        console.warn(new Date().toISOString(), ...msg);
    },
};

export const emsg = (e: any) => {
    let message = e instanceof Error ? e.message : "unknown error";
    if (e.code) message = `${message} - ${e.code}`;
    return message;
};
