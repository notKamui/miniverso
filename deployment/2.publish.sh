#!/bin/sh
set -e

docker push notkamui/miniverso:$APP_VERSION && \
docker push notkamui/miniverso:latest
