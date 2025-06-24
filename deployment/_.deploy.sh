#!/bin/sh

export APP_VERSION=$(awk -F'"' '/"version": ".+"/{ print $4; exit; }' package.json)
if [ -z "$APP_VERSION" ]; then
  echo "Failed to get app version"
  exit 1
fi

./deployment/0.build.sh && \
./deployment/1.publish.sh
