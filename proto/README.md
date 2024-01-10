# Generate js and ts

```shell
cd redchannel
node .\node_modules\protobufjs-cli\bin\pbjs -t static-module -w commonjs -o ./proto/implant.js .\proto\implant.proto
node .\node_modules\protobufjs-cli\bin\pbts -o ./proto/implant.d.ts ./proto/implant.js
```

# Generate Go

## Install the go plugin for protoc

```shell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
```

## Generate the go code in ./agent/proto/implant.pb.go

```shell
protoc --proto_path=./proto/ --go_out=./agent/ implant.proto
```
