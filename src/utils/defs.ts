import Table from "cli-table/lib";
import ECKey from "ec-key";

// custom interfaces for legacy packages

export interface ECKeyWithPublicPoint extends ECKey {
    publicCodePoint: Buffer;
    asPublicECKey(): ECKey;
    computeSecret(otherKey: Buffer): Buffer;
}

export interface CliTableWithPush extends Table {
    push(any): void;
}
