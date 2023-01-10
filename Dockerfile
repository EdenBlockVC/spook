FROM node:16

# Nym version
ARG NYM_VERSION=develop

# Install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Setup Nym
WORKDIR /usr/src/
RUN git clone -b ${NYM_VERSION} https://github.com/nymtech/nym.git --depth 1
WORKDIR /usr/src/nym
RUN cargo build --release
ENV PATH="/usr/src/nym/target/release:${PATH}"

# Setup app
WORKDIR /usr/src/app
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile
COPY . .
RUN yarn build

# Copy startup script
WORKDIR /usr/src/app
COPY ./docker/entry.sh .

CMD [ "./entry.sh" ]
