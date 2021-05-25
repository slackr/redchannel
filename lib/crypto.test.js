const Crypto = require("./crypto");

describe("Crypto - BAU", () => {
    let alice = new Crypto();
    let bob = new Crypto();

    test("should generate keys", () => {
        alice.generate_keys();
        bob.generate_keys();
        expect(alice.key).not.toBe(null);
        expect(alice.pubkey).not.toBe(null);
        expect(bob.key).not.toBe(null);
        expect(bob.pubkey).not.toBe(null);
    });

    let alice_export = null;
    let bob_export = null;
    test("should export pubkeys uncompressed", () => {
        bob_export = bob.export_pubkey("uncompressed");
        alice_export = alice.export_pubkey("uncompressed");
        expect(alice_export).not.toBe(null);
        expect(bob_export).not.toBe(null);
    });

    let bob_import = null;
    let alice_import = null;
    test("should import exported pubkeys", () => {
        bob_import = alice.import_uncompressed_pubkey(Buffer.from(bob_export, "hex"));
        alice_import = bob.import_uncompressed_pubkey(Buffer.from(alice_export, "hex"));
        expect(alice_import).not.toBe(null);
        expect(bob_import).not.toBe(null);
    });

    let alice_secret = null;
    let bob_secret = null;
    test("should derive secrets", () => {
        alice_secret = alice.derive_secret(bob_import, "");
        bob_secret = bob.derive_secret(alice_import, "");
        expect(alice_secret).not.toBe(null);
        expect(bob_secret).not.toBe(null);
    });

    test("should have equal derived secrets", () => {
        expect(alice_secret).not.toBe(null);
        expect(bob_secret).not.toBe(null);
        expect(alice_secret).toEqual(bob_secret);
    });

    let plaintext = Buffer.from("secret");
    let alice_result;
    test("should encrypt buffer with aes_encrypt()", () => {
        alice_result = alice.aes_encrypt(plaintext, alice_secret);
        expect(alice_result.data).not.toBe(null);
        expect(alice_result.iv.length).toBeGreaterThan(0);
    });

    let bob_result;
    test("should decrypt buffer", () => {
        bob_result = bob.aes_decrypt(alice_result.data, bob_secret, alice_result.iv);
        expect(bob_result.toString()).toBe("secret");
    });
});

describe("Crypto - Unexpected Values", () => {
    let alice = new Crypto();
    let bob = new Crypto();

    // no keys have been generated
    test("should fail to export pubkeys uncompressed", () => {
        expect(() => alice.export_pubkey("uncompressed")).toThrow(Error);
    });

    test("should fail to derive secret with no master key", () => {
        expect(() => alice.derive_secret(null, null)).toThrow(/generate keys first/);
    });

    test("should fail to import invalid pubkeys", () => {
        alice.generate_keys();
        expect(() => alice.import_uncompressed_pubkey(Buffer.from("aaa", "hex"))).toThrow(/uncompressed/);
    });
});
