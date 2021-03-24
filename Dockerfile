FROM node:10-alpine

RUN apk update && apk add python3 make g++

RUN mkdir /app
WORKDIR /app
