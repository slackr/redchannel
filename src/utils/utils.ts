export const Constants = {
    VERSION: "1.0",
    VALID_CLASS_ID_REGEX: /^-?[\s_a-zA-Z,]+[\s_a-zA-Z0-9-,]*$/,
    VALID_URL_REGEX: /^http:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*$/,
    VALID_ROUTE_REGEX: /^\/[a-zA-Z0-9_\-.]*$/,
    VALID_IMPLANT_RESOLVER:
        /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]):([0-9]{1,4}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])$/i,
    VALID_PROXY_DATA: /^([:;a-f0-9.]+|ERR .+|OK .+)$/,
    VALID_IP_REGEX: /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/,
    VALID_HOST_REGEX: /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])$/,
    VALID_BUILD_TARGET_OS: /^(windows|linux|darwin|android|netbsd|openbsd|freebsd|dragonfly|solaris)$/i,
    VALID_BUILD_TARGET_ARCH: /^(amd64|arm|arm64|386|ppc64|ppc64le|mipsle|mips|mips64|mips64le)$/i,
};

export const Config = {
    C2_ANSWER_TTL_SECS: 300,
    DEFAULT_CONFIG_FILE: "conf/redchannel.conf",
    DATA_PAD_HEXBYTE: "ff",
    IP_DATA_PREFIX: "2001",
    IP_HEADER_PREFIX: "ff00",
    DATA_BLOCK_STRING_LENGTH: 4,
    MAX_DATA_BLOCKS_PER_IP: 6,
    // we need to make sure the total response fits in 512 bytes (UDP data limit)
    // each IPv6 is 28 bytes
    // first record is ip header, rest is data
    // total IPs sent per response (sendq entry) is MAX_IPS_PER_SENDQ_ENTRY+HEADER
    MAX_DATA_IPS_PER_SENDQ_ENTRY: 10,
    FLOOD_PROTECTION_TIMEOUT_MS: 10,
    EXPECTED_DATA_SEGMENTS: 5,
};

export const Banner = `
██████╗ ███████╗██████╗  ██████╗██╗  ██╗ █████╗ ███╗   ██╗███╗   ██╗███████╗██╗     
██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║██╔══██╗████╗  ██║████╗  ██║██╔════╝██║     
██████╔╝█████╗  ██║  ██║██║     ███████║███████║██╔██╗ ██║██╔██╗ ██║█████╗  ██║     
██╔══██╗██╔══╝  ██║  ██║██║     ██╔══██║██╔══██║██║╚██╗██║██║╚██╗██║██╔══╝  ██║     
██║  ██║███████╗██████╔╝╚██████╗██║  ██║██║  ██║██║ ╚████║██║ ╚████║███████╗███████╗
╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚══════╝
`;

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

export const emsg = (e: unknown) => {
    const message = e instanceof Error ? e.message : "unknown error";
    return message;
};

export const padZero = (proxyData, maxLength) => {
    return "0".repeat(maxLength - proxyData.length) + proxyData;
};
export const padTail = (proxyData, maxLength) => {
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
