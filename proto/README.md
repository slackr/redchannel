# Generate js and ts

```shell
cd redchannel
node .\node_modules\protobufjs-cli\bin\pbjs -t static-module -w commonjs -o ./proto/redchannel.js .\proto\redchannel.proto
node .\node_modules\protobufjs-cli\bin\pbts -o ./proto/redchannel.d.ts ./proto/redchannel.js
```

# Generate Go

## Install the go plugin for protoc

```shell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
```

## Generate the go code in ./agent/proto/redchannel.pb.go

```shell
protoc --proto_path=./proto/ --go_out=./agent/ redchannel.proto
```
