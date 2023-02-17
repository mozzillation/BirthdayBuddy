FROM node:lts-slim AS builder

WORKDIR /birthdaybuddy

COPY package.json ./

# generated prisma files
COPY prisma ./prisma/

# COPY ENV variable
COPY .env ./

# COPY tsconfig.json file
COPY tsconfig.json ./

# with Yarn
COPY yarn.lock ./

COPY . .

RUN yarn install --frozen-lockfile

RUN npx prisma generate


