# Set up

## Install dependencies

```bash
yarn
```

## Start Nym client

You need to install the Nym client first. 

- [nym-client](https://github.com/nymtech/nym/releases) for prebuilt binaries
- [source code](https://github.com/nymtech/nym) for [building from source](https://nymtech.net/docs/stable/run-nym-nodes/build-nym)

Once you have access to the `nym-client` binary, you can have to initialize it with the following command:

```bash
nym-client --init --id client --port 3000
```

You'll see a message like this:

```text


      _ __  _   _ _ __ ___
     | '_ \| | | | '_ \ _ \
     | | | | |_| | | | | | |
     |_| |_|\__, |_| |_| |_|
            |___/

             (client - version 1.1.4)

    
Initialising client...
Configuring gateway
 2023-01-02T07:43:14.717Z INFO  gateway_client::client > the gateway is using exactly the same protocol version as we are. We're good to continue!
Saved all generated keys
 2023-01-02T07:43:14.723Z INFO  config                 > Configuration file will be saved to "/Users/cleanunicorn/.nym/clients/client/config/config.toml"
Saved configuration file to "/Users/cleanunicorn/.nym/clients/client/config/config.toml"
Using gateway: 3zd3wrCK8Dz5TXrcvk5dG5s9EEdf4Ck1v9VgBPMMFVkR
Client configuration completed.

Version: 1.1.4
ID: client
Identity key: A4ywWWMK3ZpF5Kq8cVYRxXfpJDGL6SdSgwmebqKsAyGb
Encryption: DV7qPkpveFVyaJhwdKuguuxP84FfMjbTnYTiywdcL67M
Gateway ID: 3zd3wrCK8Dz5TXrcvk5dG5s9EEdf4Ck1v9VgBPMMFVkR
Gateway: ws://116.203.88.95:9000
Client listening port: 3000

The address of this client is: A4ywWWMK3ZpF5Kq8cVYRxXfpJDGL6SdSgwmebqKsAyGb.DV7qPkpveFVyaJhwdKuguuxP84FfMjbTnYTiywdcL67M@3zd3wrCK8Dz5TXrcvk5dG5s9EEdf4Ck1v9VgBPMMFVkR
```

<!-- The address of  -->

<!-- Write down the *address of the client*. You'll need it later. -->

## Run the app

```bash
yarn start
```

