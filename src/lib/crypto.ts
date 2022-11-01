import ECKey, * as ecKey from "ec-key";
import * as crypto from "crypto";
import { emsg } from "../utils/utils";
import { ECKeyWithPublicPoint } from "../utils/defs";

export interface CipherModel {
    iv: Buffer;
    data: Buffer;
}

class RedChannelCrypto {
    privateKey: ECKeyWithPublicPoint | null = null;
    publicKey: ECKey | null = null;

    CURVE = "prime256v1";
    HMAC_SHA = "sha256";
    BLOCK_LENGTH = 16;
    AES_ALGO = "aes-256-cbc";

    constructor() {}

    generate_keys() {
        try {
            this.privateKey = ecKey.createECKey(this.CURVE) as ECKeyWithPublicPoint;
            this.publicKey = this.privateKey.asPublicECKey(); //.toString('pem')
        } catch (ex) {
            throw new Error(`failed to generate keys: ${emsg(ex)}`);
        }
    }

    aes_encrypt(buffer, key): CipherModel {
        let iv = crypto.randomBytes(this.BLOCK_LENGTH);
        let ciphertext: Buffer;
        try {
            const cipher = crypto.createCipheriv(this.AES_ALGO, key, iv);
            ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        } catch (ex) {
            throw new Error(`failed to AES encrypt: ${emsg(ex)}`);
        }

        //decipher.setAutoPadding(false);
        return { iv: iv, data: ciphertext };
    }

    aes_decrypt(buffer, key, iv) {
        let result: Buffer;
        try {
            let plaintext = crypto.createDecipheriv(this.AES_ALGO, key, iv);
            //plaintext.setAutoPadding(true);
            result = Buffer.concat([plaintext.update(buffer), plaintext.final()]);
        } catch (ex) {
            throw new Error(`failed to AES decrypt: ${emsg(ex)}`);
        }
        return result;
    }

    derive_secret(otherKey, salt) {
        if (!this.privateKey) throw new Error("no master key found, generate keys first");

        let secret;
        let digest;
        try {
            secret = this.privateKey.computeSecret(otherKey);
            digest = Buffer.concat([secret, Buffer.from(salt)]);
        } catch (ex) {
            throw new Error(`failed to compute secret: ${emsg(ex)}`);
        }

        let result: Buffer;
        try {
            result = crypto.createHmac(this.HMAC_SHA, secret).update(digest).digest();
        } catch (ex) {
            throw new Error(`failed to derive secret: ${emsg(ex)}`);
        }

        return result;
    }

    // imports a public key from an uncompressed format (Buffer)
    import_uncompressed_pubkey(uncompressedPublicKey) {
        let importedPublicKey: ECKey;

        try {
            importedPublicKey = new ecKey({
                curve: this.CURVE,
                publicKey: uncompressedPublicKey,
            });
        } catch (ex) {
            throw new Error(`failed to import uncompressed pubkey: ${emsg(ex)}`);
        }
        return importedPublicKey;
    }

    // exports our public key to an uncompressed format (hex string) or pem
    export_pubkey(format) {
        if (!this.privateKey) return "";

        let pubkey = "";
        try {
            switch (format) {
                case "pem":
                    pubkey = this.privateKey.asPublicECKey().toString("pem");
                    break;
                case "uncompressed":
                default:
                    pubkey = this.privateKey.publicCodePoint.toString("hex");
                    break;
            }
        } catch (ex) {
            throw new Error(`failed to export pubkey to ${format}: ${emsg(ex)}`);
        }
        return pubkey;
    }
}

export default RedChannelCrypto;
