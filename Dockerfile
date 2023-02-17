FROM node:lts-slim AS builder

WORKDIR /birthdaybuddy

COPY package.json ./
COPY prisma ./prisma/
COPY .env ./
COPY tsconfig.json ./
COPY yarn.lock ./
COPY . .

RUN yarn install --frozen-lockfile
RUN npx prisma generate


