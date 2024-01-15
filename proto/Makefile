proto:
	#protoc --plugin=../node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=../src/pb/ -I ./ ./*.proto
	npx protoc --ts_out=../src/pb/ --ts_opt server_grpc1,long_type_string,generate_dependencies --proto_path=./ *.proto
	protoc --proto_path=./ --go_out=../agent/ ./implant.proto

clean: 
	rm -rf ../src/pb/*