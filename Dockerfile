FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Bundle app source
COPY . .
RUN yarn build

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Build Nym binaries
WORKDIR /usr/src/
RUN git clone https://github.com/nymtech/nym.git
WORKDIR /usr/src/nym
RUN cargo build --release
ENV PATH="/usr/src/nym/target/release:${PATH}"

# Initialize Nym config
RUN nym-client init --id node --port 3000

# Run nym-client in background
RUN nohup nym-client run --id node && sleep 3

# Expose ports
EXPOSE 8545 

# CMD [ "yarn" ]