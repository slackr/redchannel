#!/bin/bash

# which protos to build
PROTO_DIR=./proto

PROTO_FILES=$PROTO_DIR/*.proto

JS_OUT_DIR=./src/pb
JS_OUT_FILE_NAME=$JS_OUT_DIR/protos
echo "[+] generating js/ts code to $JS_OUT_FILE_NAME{.d.ts,.js} in '$JS_OUT_DIR'"
node ./node_modules/protobufjs-cli/bin/pbjs -t static-module -w commonjs -o $JS_OUT_FILE_NAME.js $PROTO_FILES
node ./node_modules/protobufjs-cli/bin/pbts -o $JS_OUT_FILE_NAME.d.ts $JS_OUT_FILE_NAME.js

GO_OUT_DIR=./agent
PROTO_GO_FILE_NAME="implant"
echo "[+] generating go code in $GO_OUT_DIR/implant/$PROTO_GO_FILE_NAME.pb.go"
protoc --proto_path=$PROTO_DIR/ --go_out=$GO_OUT_DIR/ $PROTO_GO_FILE_NAME.proto

echo "[+] done."