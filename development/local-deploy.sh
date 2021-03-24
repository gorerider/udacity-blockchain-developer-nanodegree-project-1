#!/bin/bash

set -e
DIR=$(dirname "$0")
SCRIPT_DIR="$(cd $DIR && pwd)"
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
PROJECT_NAME=$(basename "$PROJECT_DIR")
NODE_PORT=${2:-8000}
cd $PROJECT_DIR

docker build -t $PROJECT_NAME .

docker run \
    --rm \
    -it \
    -v $PROJECT_DIR:/app \
    -p $NODE_PORT:$NODE_PORT \
    --name $PROJECT_NAME $PROJECT_NAME sh