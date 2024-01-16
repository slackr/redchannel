echo "[+] generating ca and server certs"
openssl genrsa -passout pass:redchannel -des3 -out ca.key 4096
openssl req -passin pass:redchannel -new -x509 -days 365 -key ca.key -out ca.crt -subj "/C=CL/ST=RM/L=Toronto/O=Red/OU=Channel/CN=ca"
openssl genrsa -passout pass:redchannel -des3 -out server.key 4096
openssl req -passin pass:redchannel -new -key server.key -out server.csr -subj "/C=CL/ST=RM/L=Toronto/O=Red/OU=Channel/CN=teamserver"
openssl x509 -req -passin pass:redchannel -days 365 -in server.csr -CA ca.crt -CAkey ca.key -set_serial 01 -out server.crt
openssl rsa -passin pass:redchannel -in server.key -out server.key

rm *.csr
chmod 600 *.key