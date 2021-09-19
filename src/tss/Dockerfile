FROM ubuntu:19.10


RUN sed -i -re 's/([a-z]{2}.)?archive.ubuntu.com|security.ubuntu.com/old-releases.ubuntu.com/g' /etc/apt/sources.list

RUN apt-get update && \
    apt-get install -y curl build-essential git openssl pkg-config libssl-dev libgmp3-dev libgmp-dev libtool

RUN curl https://sh.rustup.rs -sSf | sh -s -- --default-toolchain nightly-2019-08-28 -y
ENV PATH=/root/.cargo/bin:$PATH
RUN cargo --version

WORKDIR /tss

COPY ./multi-party-ecdsa/Cargo.lock ./multi-party-ecdsa/Cargo.toml /tss/
COPY ./multi-party-ecdsa/src/lib.rs /tss/src/lib.rs

# Download all dependencies
# RUN cargo fetch

# Build dependencies
# RUN cargo build --release || true

COPY ./multi-party-ecdsa /tss/

# Build final executables
# RUN cargo build --release

CMD echo Done
