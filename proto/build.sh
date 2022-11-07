#!/bin/bash

PROTO_NAME=implant
PROTO_DIR=./proto
PROTO_FILE=$PROTO_DIR/$PROTO_NAME.proto
# no extension, we will add .d.ts and .js
PROTO_OUT_FILE=./src/pb/$PROTO_NAME
GO_OUT_DIR=./agent

if [ ! -f $PROTO_FILE ]; then
    if [ -f ../$PROTO_FILE ]; then
        cd ../
    else
        echo "[!] ./proto/*.proto files not found, are you in the root directory?"
        exit 1
    fi
fi

echo "[+] generating js/ts code to $PROTO_OUT_FILE{.d.ts,.js}"
node ./node_modules/protobufjs-cli/bin/pbjs -t static-module -w commonjs -o $PROTO_OUT_FILE.js $PROTO_FILE
node ./node_modules/protobufjs-cli/bin/pbts -o $PROTO_OUT_FILE.d.ts $PROTO_OUT_FILE.js

echo "[+] generating go code in $GO_OUT_DIR/$PROTO_NAME/$PROTO_NAME.pb.go"
protoc --proto_path=$PROTO_DIR/ --go_out=$GO_OUT_DIR/ $PROTO_NAME.proto

echo "[+] done."