#!/bin/bash

# Initialize Nym node client
nym-client init --id node --nym-apis https://validator.nymtech.net/api/ --port 3000

# Start Nym node client
nym-client run --id node &

# Delay
sleep 5

# Start 
yarn start:entry

wait -n

exit $?
