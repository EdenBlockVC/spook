# Ethereum RPC request mixer

This proof of concept uses the Nym network to anonymize Ethereum RPC requests.

It can be used as:

- RPC URL for Metamask or other wallets to anonymize your requests (prevent real IP logging)
- local RPC for CLI utilities like [`cast`](https://book.getfoundry.sh/cast/)

## How it works

This leverages the Nym network to mix RPC requests through their network of mixnodes.

This project consists of 2 utilities:

- [`client`](client/) - receives the usual RPC requests and forwards them to the Nym network
- [`provider`](provider/) - receives the requests from the Nym network and forwards them to the Ethereum node

Each of the utilities can (and should) be run on different machines.

The Ethereum node will see the IP of the machine running the `provider` utility. The client can remain anonymous and hidden behind the Nym network. Even multiple clients can use the same `provider` utility.

The user can use a public `client` utility, but running your own is the only way to be sure that your requests are not logged.

![Diagram](static/diagram.png)

The orange were alredy created by Nym, this repository provides the blue boxes: the `client` and the `provider`.

The `client` receives requests from the user and relays the requests through the Nym network to the `provider`, which then forwards the requests to the Ethereum node.

## Running the app

### Set up the provider

The `provider` utility needs to be run on a machine that can forward requests to an Ethereum node. To receive the requests from the Nym network it needs to run the [Nym websocket client](https://nymtech.net/docs/stable/integrations/websocket-client).

You can install the [Nym websocket client](https://nymtech.net/docs/stable/integrations/websocket-client) by downloading the binary from the [releases page](https://github.com/nymtech/nym/releases) or by [building it from source](https://nymtech.net/docs/stable/run-nym-nodes/build-nym).

Once the Nym websocket client is installed, you can initialize it with the following command:

```bash
nym-client init --id provider --port 3001
```

This will create a new configuration that makes the client listen on port `3001` and use the `provider` identity.

The last lines of the output will be the `provider`'s address. You'll need this when you start the `client` to know who to send the messages to.

You can go ahead and start the nym client after you created the config:

```
nym-client start --id provider
```

Now we need to start the `provider` utility.

TODO: add instructions to build and start the provider

### Set up the client

TOOD: ...