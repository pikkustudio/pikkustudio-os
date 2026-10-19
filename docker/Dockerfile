# Studio as a server: the standalone build (`pikku deploy apply -p standalone`, see scripts/release-build.sh) in a
# slim image with the libraries its headless browser needs. The same file serves the open build and the cloud one;
# which addons are in it was decided when the standalone build was made. Build from the repo root:
#
#   docker build -f docker/Dockerfile --build-arg UNIT=root -t pikku-studio .
#
# UNIT is the standalone unit's name: the build writes .deploy/standalone/<UNIT>-dist/<UNIT>.
FROM debian:stable-slim

RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libglib2.0-0t64 libnss3 libnspr4 libatk1.0-0t64 libatspi2.0-0t64 libdbus-1-3 \
    libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxcb1 libxkbcommon0 \
    libgbm1 libexpat1 libasound2t64 \
 && rm -rf /var/lib/apt/lists/*

ARG UNIT=root
COPY .deploy/standalone/${UNIT}-dist /opt/studio
ENV STUDIO_UNIT=${UNIT}

ENV PORT=4740
EXPOSE 4740

ENTRYPOINT ["/bin/sh", "-c", "/opt/studio/$STUDIO_UNIT db migrate && exec /opt/studio/$STUDIO_UNIT"]
