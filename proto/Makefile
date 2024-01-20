proto:
	npx protoc --ts_out=../src/pb/ --ts_opt server_grpc1,long_type_string,generate_dependencies --proto_path=./ config.proto c2.proto implant.proto
	protoc --proto_path=./ --go_out=../agent/ ./implant.proto

clean: 
	rm -rf ../src/pb/*