proto:
	# creating redchannel ts code
	npx protoc --ts_out=../src/pb/ --ts_opt client_grpc1,server_grpc1,long_type_string,generate_dependencies --proto_path=./ config.proto c2.proto implant.proto
	
	# creating redchannel ts code for client, should be a submodule in the redchannel/client directory
	#npx protoc --ts_out=../client/src/pb --ts_opt client_grpc1,server_grpc1,long_type_string,generate_dependencies --proto_path=./ config.proto c2.proto implant.proto

	# create pb for connectrpc
	#npx buf generate --template ./buf.gen-server.yaml
	# create pb for connectrpc for client
	#npx buf generate --template ./buf.gen-client.yaml

	# creating go proto 
	# requires: go install github.com/golang/protobuf/protoc-gen-go@latest
	npx protoc --proto_path=./ --go_out=../agent/ ./implant.proto

clean: 
	rm -rf ../src/pb/*
	rm -rf ../client/src/pb*