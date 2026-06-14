#!/usr/bin/env bash
set -euo pipefail

NYM_CLIENT_ID="${NYM_CLIENT_ID:-node}"
NYM_CLIENT_PORT="${NYM_CLIENT_PORT:-3000}"

# Initialize the Nym client only once; re-running init on an existing config fails.
if [ ! -f "${HOME}/.nym/clients/${NYM_CLIENT_ID}/config/config.toml" ]; then
    echo "Initializing Nym client '${NYM_CLIENT_ID}'..."
    nym-client init --id "${NYM_CLIENT_ID}" --port "${NYM_CLIENT_PORT}"
fi

# Start the Nym client in the background.
echo "Starting Nym client '${NYM_CLIENT_ID}'..."
nym-client run --id "${NYM_CLIENT_ID}" &
nym_pid=$!

# Forward termination signals to the Nym client so the container shuts down cleanly.
trap 'kill -TERM "${nym_pid}" 2>/dev/null || true' TERM INT

# Give the Nym client a moment to connect to the network.
sleep 5

# Start the entry utility. The Nym client keeps the connection to the mixnet.
echo "Starting Spook entry..."
node dist/entry/index.js &
entry_pid=$!

# Exit as soon as either process exits.
wait -n "${nym_pid}" "${entry_pid}"
exit $?
