#!/bin/bash
set -euo pipefail

docker push notkamui/miniverso:$APP_VERSION && \
docker push notkamui/miniverso:latest
