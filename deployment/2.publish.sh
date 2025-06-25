#!/bin/sh
exit 0

docker push notkamui/miniverso:$APP_VERSION && \
docker push notkamui/miniverso:latest
