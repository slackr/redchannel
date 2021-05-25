const ec_key = require("ec-key");
const crypto = require("crypto");

class Crypto {
    constructor() {
        this.key = null;
        this.pubkey = null;

        this.AES_ALGO = "aes-256-cbc";
        this.BLOCK_LENGTH = 16;
        this.HMAC_SHA = "sha256";
        this.CURVE = "prime256v1";

        this.libcrypto = crypto;
        this.libeckey = ec_key;
    }

    generate_keys() {
        try {
            this.key = this.libeckey.createECKey(this.CURVE);
            this.pubkey = this.key.asPublicECKey(); //.toString('pem')
        } catch (ex) {
            throw new Error(`failed to generate keys: ${ex.message}`);
        }
    }

    aes_encrypt(buffer, key) {
        let iv = this.libcrypto.randomBytes(this.BLOCK_LENGTH);
        let ciphertext = null;
        try {
            let cipher = this.libcrypto.createCipheriv(this.AES_ALGO, key, iv);
            ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
        } catch (ex) {
            throw new Error(`failed to AES encrypt: ${ex.message}`);
        }

        //decipher.setAutoPadding(false);
        return { iv: iv, data: ciphertext };
    }

    aes_decrypt(buffer, key, iv) {
        let result = null;
        try {
            let plaintext = this.libcrypto.createDecipheriv(this.AES_ALGO, key, iv);
            //plaintext.setAutoPadding(true);
            result = Buffer.concat([plaintext.update(buffer), plaintext.final()]);
        } catch (ex) {
            throw new Error(`failed to AES decrypt: ${ex.message}`);
        }
        return result;
    }

    derive_secret(other_key, salt) {
        if (!this.key) throw new Error("no master key found, generate keys first");

        let result = null;

        let secret_obj;
        let to_digest;
        try {
            secret_obj = this.key.computeSecret(other_key);
            to_digest = Buffer.concat([secret_obj, Buffer.from(salt)]);
        } catch (ex) {
            throw new Error(`failed to compute secret: ${ex.message}`);
        }
        try {
            result = this.libcrypto.createHmac(this.HMAC_SHA, secret_obj).update(to_digest).digest();
        } catch (ex) {
            throw new Error(`failed to derive secret: ${ex.message}`);
        }

        return result;
    }

    // imports a public key from an uncompressed format (Buffer)
    import_uncompressed_pubkey(uncompressed_pubkey) {
        let imported_pub = null;

        try {
            imported_pub = new this.libeckey({
                curve: this.CURVE,
                publicKey: uncompressed_pubkey,
            });
        } catch (ex) {
            throw new Error(`failed to import uncompressed pubkey: ${ex.message}`);
        }
        return imported_pub;
    }

    // exports our public key to an uncompressed format (hex string) or pem
    export_pubkey(format) {
        let pubkey = "";
        try {
            switch (format) {
                case "pem":
                    pubkey = this.key.asPublicECKey().toString("pem");
                    break;
                case "uncompressed":
                default:
                    pubkey = this.key.publicCodePoint.toString("hex");
                    break;
            }
        } catch (ex) {
            throw new Error(`failed to export pubkey to ${format}: ${ex.message}`);
        }
        return pubkey;
    }
}

module.exports = Crypto;
