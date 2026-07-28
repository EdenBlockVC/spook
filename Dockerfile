# syntax=docker/dockerfile:1

# ---- Build stage: compile the TypeScript sources ----
FROM node:22-bookworm-slim AS builder

WORKDIR /usr/src/app

# Install dependencies first to leverage Docker layer caching.
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Build the project.
COPY tsconfig.json ./
COPY src ./src
RUN yarn build

# ---- Runtime stage ----
FROM node:22-bookworm-slim

# Pinned Nym release. The prebuilt nym-client binary is downloaded directly
# from the release assets, so there is no need to compile Nym from source.
ARG NYM_VERSION=nym-binaries-v2026.11-xynomizithra

# Download the prebuilt nym-client binary.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl \
    && curl -fsSL -o /usr/local/bin/nym-client \
        "https://github.com/nymtech/nym/releases/download/${NYM_VERSION}/nym-client" \
    && chmod +x /usr/local/bin/nym-client \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Install only production dependencies.
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Copy the compiled output and the startup script.
COPY --from=builder /usr/src/app/dist ./dist
COPY docker/entry.sh ./entry.sh

EXPOSE 8545

CMD ["./entry.sh"]
