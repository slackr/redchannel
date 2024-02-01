import { Config, Constants, RedChannelBanner } from "./constants";

export const emsg = (e: unknown) => {
    const message = e instanceof Error ? e.message : "unknown error";
    return message;
};

export const padZero = (proxyData: string, maxLength: number) => {
    return "0".repeat(maxLength - proxyData.length) + proxyData;
};
export const padTail = (proxyData: string, maxLength: number) => {
    return proxyData + Config.DATA_PAD_HEXBYTE.repeat(maxLength - proxyData.length);
};

export const chunkString = (dataString: string, chunkSize: number): string[] => {
    const totalChunks = Math.ceil(dataString.length / chunkSize);
    const chunks: string[] = new Array(totalChunks);

    for (let chunkIndex = 0, chunkStep = 0; chunkIndex < totalChunks; ++chunkIndex, chunkStep += chunkSize) {
        chunks[chunkIndex] = dataString.substring(chunkStep, chunkStep + chunkSize);
    }

    return chunks;
};

export { Config, Constants, RedChannelBanner };
