import ECKey, * as ellipticCurveKey from "ec-key";
import * as crypto from "crypto";
import { emsg } from "../utils";
import { ECKeyWithPublicPoint } from "../utils/defs";

export type CipherModel = {
    iv: Buffer;
    data: Buffer;
};

export enum KeyExportType {
    PEM = "pem",
    UNCOMPRESSED = "uncompressed",
}

class Crypto {
    privateKey: ECKeyWithPublicPoint | null = null;
    publicKey: ECKey | null = null;

    CURVE = "prime256v1";
    HMAC_SHA = "sha256";
    BLOCK_LENGTH = 16;
    AES_ALGO = "aes-256-cbc";

    generateKeys() {
        try {
            this.privateKey = ellipticCurveKey.createECKey(this.CURVE) as ECKeyWithPublicPoint;
            this.publicKey = this.privateKey.asPublicECKey(); //.toString('pem')
        } catch (ex) {
            throw new Error(`failed to generate keys: ${emsg(ex)}`);
        }
    }

    aesEncrypt(buffer: Buffer, key: crypto.CipherKey): CipherModel {
        const iv = crypto.randomBytes(this.BLOCK_LENGTH);
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

    aesDecrypt(buffer: Buffer, key: crypto.CipherKey, iv: Buffer) {
        let result: Buffer;
        try {
            const plaintext = crypto.createDecipheriv(this.AES_ALGO, key, iv);
            //plaintext.setAutoPadding(true);
            result = Buffer.concat([plaintext.update(buffer), plaintext.final()]);
        } catch (ex) {
            throw new Error(`failed to AES decrypt: ${emsg(ex)}`);
        }
        return result;
    }

    deriveSecret(otherKey: ECKey, salt: string) {
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
    importUncompressedPublicKey(uncompressedPublicKey) {
        let importedPublicKey: ECKey;

        try {
            importedPublicKey = new ECKey({
                curve: this.CURVE,
                publicKey: uncompressedPublicKey,
            });
        } catch (ex) {
            throw new Error(`failed to import uncompressed pubkey: ${emsg(ex)}`);
        }
        return importedPublicKey;
    }

    // exports our public key to an uncompressed format (hex string) or pem
    exportPublicKey(format: KeyExportType): Buffer {
        if (!this.privateKey) throw new Error("no private key available, please generate keypair");

        let publicKey: Buffer;
        try {
            switch (format) {
                case KeyExportType.PEM:
                    publicKey = this.privateKey.asPublicECKey().toBuffer(); //.toString("pem");
                    break;
                case KeyExportType.UNCOMPRESSED:
                default: // .toString("hex");
                    publicKey = this.privateKey.publicCodePoint;
                    break;
            }
        } catch (ex) {
            throw new Error(`failed to export pubkey to ${format}: ${emsg(ex)}`);
        }
        return publicKey;
    }
}

export default Crypto;
