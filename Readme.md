# Spook

This Ethereum RPC request mixer is a proof of concept that uses the Nym network to anonymize RPC requests.

It can be used as:

- RPC URL for Metamask or other wallets to anonymize your requests (prevent real IP logging)
- local RPC for CLI utilities like [`cast`](https://book.getfoundry.sh/cast/)

## Quick start

It's recommended to go through the rest of the README to understand how it works, but if you want to get started quickly, you can run the `entry` and `exit` utilities on the same machine.

### Set up the exit node

Start the Nym WebSocket client:

```text
nym-client init --id exit-node --port 3001
nym-client run --id exit-node
```

Write down the address of the exit node. You'll need it when you start the `entry` utility.

Start the `exit` utility, which connects to the Nym WebSocket client:

```text
cd exit
yarn
export ETH_RPC_URL=https://eth.llamarpc.com
export NYM_HOST_URL=ws://localhost:3001
yarn start
```

### Set up the entry node

Start the Nym WebSocket client:

```text
nym-client init --id entry-node --port 3000
nym-client run --id entry-node
```

Start the `entry` utility, which connects to the Nym WebSocket client:

```text
cd entry
yarn
export NYM_HOST_URL=ws://localhost:3000
export EXIT_NODE_ADDRESS={The address you saved above}
yarn start
```

You'll have 4 terminals running:

- 2 Nym WebSocket clients
- `exit` utility
- `entry` utility

You can check everything works with `cast`:

```text
export ETH_RPC_URL=http://localhost:8545
cast block-number
```

Or by changing Metamask to use `http://localhost:8545` as the RPC URL.

## How it works

This leverages the Nym network to mix RPC requests through their network of mix nodes.

This project consists of 2 utilities:

- [`entry`](entry/) - receives the usual RPC requests and forwards them to the Nym network
- [`exit`](exit/) - receives the requests from the Nym network and forwards them to the Ethereum node

Each of the utilities can (and should) run on different machines. Between these utilities sits the Nym network, which mixes the sent packets to anonymize the requests.

The Ethereum node will see the IP of the machine running the `exit` utility. The user can remain anonymous and hidden behind the Nym network. Even multiple clients can use the same `exit` utility.

The user can use a public `entry` utility, but running your own is the only way to be sure that your requests are not logged.

![Diagram](static/Nym%20Ethereum%20RPC%20Mixer.drawio.png)

The orange boxes were already created by Nym; this repository provides the blue boxes: the `entry` and the `exit`.

The `entry` receives requests from the user and relays the requests through the Nym network to the `exit`, which then forwards the requests to the Ethereum node.

## Running the app

For the full system to work, you will run 4 programs:

- 2 Nym clients (one for the `entry` and one for the `exit`)
- the `entry` which receives requests from the user
- the `exit` which relays the requests to the Ethereum node (or RPC provider)

Additionally, you need an RPC provider or an Ethereum node to forward the requests to.

### Install the Nym WebSocket client

You can install the [Nym WebSocket client](https://nymtech.net/docs/stable/integrations/websocket-client) by downloading the binary from the [releases page](https://github.com/nymtech/nym/releases) or by [building it from source](https://nymtech.net/docs/stable/run-nym-nodes/build-nym).

Once that's done, you should be able to see the help when you run:

```text
nym-client help
```

```text
      _ __  _   _ _ __ ___
     | '_ \| | | | '_ \ _ \
     | | | | |_| | | | | | |
     |_| |_|\__, |_| |_| |_|
            |___/

             (client - version 1.1.4)


nym-client 1.1.4
Nymtech
Implementation of the Nym Client

USAGE:
    nym-client [OPTIONS] <SUBCOMMAND>

OPTIONS:
    -c, --config-env-file <CONFIG_ENV_FILE>
            Path pointing to an env file that configures the client

    -h, --help
            Print help information

    -V, --version
            Print version information

SUBCOMMANDS:
    completions          Generate shell completions
    generate-fig-spec    Generate Fig specification
    help                 Print this message or the help of the given subcommand(s)
    init                 Initialise a Nym client. Do this first!
    run                  Run the Nym client with provided configuration client optionally
                             overriding set parameters
    upgrade              Try to upgrade the client
```

### Set up the provider

This is the exit node of the pipeline. This is the machine that will receive the requests from the Nym network and forward them to the Ethereum node.

The `exit` utility needs to be run on a machine that can forward requests to an Ethereum node. To receive the requests from the Nym network, it needs to run the [Nym WebSocket client](https://nymtech.net/docs/stable/integrations/websocket-client).

Once the Nym WebSocket client is installed, you can initialize it with the following command:

```text
nym-client init --id provider --port 3001
```

This will create a new configuration that makes the WebSocket client listen on port `3001` and use the `exit` identity.

The last lines of the output will be the `exit`'s address. You'll need this when you start the `entry` to know to who to send the messages.

You can go ahead and start the Nym client after you create the config:

```
nym-client start --id provider
```

Now we need to start the `exit` utility.

The `exit` is located in the [`exit`](exit/) directory. You can build it with the following:

```text
cd provider
yarn
```

Once that's done, you need to set the `ETH_RPC_URL` environment variable to the URL of the Ethereum node you want to forward the requests.

For example, if you want to forward the requests to a local node running on `localhost:8545,` you can run the:

```text
ETH_RPC_URL=http://localhost8545 yarn start
```

If the Nym WebSocket client is on a different machine, you can set the `NYM_HOST_URL` environment variable to the host of the Nym WebSocket client.

By default, the `exit` will start with these values:

```text
ETH_RPC_URL=http://localhost:8545 \
NYM_HOST_URL=ws://localhost:3001 \
yarn start
```

It has sensible default values, but you need to either run a local Ethereum node or set the `ETH_RPC_URL` environment variable to the URL of the Ethereum node you want to forward the requests.

Once it starts, it displays the address to which the `entry` should send the requests.

```text
The exit node's address is:
CYR3uUj9vDkRvCVqZotFZwCqdhef4KP8Dk74LBVeXG7A.CZuVqwNKqjjj6yzFFmhkMm5joh1REzs6eiEfqkjT2Vtw@7Zh1Sz5dXpA6s53CbtcdqhQhLqwf4cLynL7KqHKcjrG4
You should specify this address as the target address when running the entry utility.
```

Your provider is ready to forward requests.

### Set up the `entry` utility

This is the entry node of the pipeline. This is the machine that will receive the requests from the user and forward them to the Nym network.

The `entry` utility needs to send the requests to the Nym network. Thus it needs to run the [Nym WebSocket client](https://nymtech.net/docs/stable/integrations/websocket-client).

Once the Nym WebSocket client is installed, you can initialize it with the following command:

```text
nym-client init --id client --port 3000
```

This will create a new configuration that makes the WebSocket client listen on port `3000` and use the `entry` identity.

You can go ahead and start the Nym client after you create the config:

```text
nym-client start --id client
```

Now we need to start the `entry` utility.

The `entry` is located in the [`entry`](entry/) directory. You can build it with the following:

```text
cd entry
yarn
```

The `entry` utility will listen on port `8545` for Ethereum RPC requests and will relay them to the Nym network, where the `exit` will receive them. You need to specify the exit node address to know where to relay these requests. This is the address that the `exit` displayed when it started.

```text
EXIT_NODE_ADDRESS={YOUR_EXIT_NODE_ADDRESS} \
yarn start
```

Similarly to the `exit`, you can set the `NYM_HOST_URL` environment variable to the host of the Nym WebSocket client.

By default, the `entry` will start with these values:

```text
EXIT_NODE_ADDRESS={YOUR_EXIT_NODE_ADDRESS} \
NYM_HOST_URL=ws://localhost:3000 \
ETH_RPC_PORT=8545 \
yarn start
```

It has sensible default values for everything except the `EXIT_NODE_ADDRESS`, which you need to specify. Otherwise, it won't know where to relay requests to.

## Usage

### Cast

Once everything is set up, you can try running a simple request to see if everything works.

For this, I am using [`cast`](https://book.getfoundry.sh/cast/), which is a simple CLI utility to send Ethereum RPC requests.

On the machine running the `entry` utility, you can:

```text
ETH_RPC_URL=http://localhost:8545 cast block-number
```

This request will be relayed to the Nym network and forwarded to the Ethereum node running on the `exit` machine. Once the response is received, it will be relayed back to the `entry` and displayed.

### Metamask

Also works seamlessly with Metamask.

Once you set everything up and the entry utility is running on your local machine, just change Metamask to use the local RPC.

![Metamask settings](static/metamask.png)

You can use Metamask as you normally would, but the requests will be relayed through the Nym network.
