#!/bin/bash

if [ ! -f ./proto/implant.proto ]; then
    if [ -f ../proto/implant.proto ]; then
        cd ../
    else
        echo "[!] ./proto/*.proto files not found, are you in the root directory?"
        exit 1
    fi
fi

echo "[+] generating js/ts code in ./proto/"
node ./node_modules/protobufjs-cli/bin/pbjs -t static-module -w commonjs -o ./proto/implant.js ./proto/implant.proto
node ./node_modules/protobufjs-cli/bin/pbts -o ./proto/implant.d.ts ./proto/implant.js

echo "[+] generating go code in ./agent/implant/"
protoc --proto_path=./proto/ --go_out=./agent/ implant.proto

echo "[+] done."