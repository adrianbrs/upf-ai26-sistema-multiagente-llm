FROM node:22-bookworm

WORKDIR /app

# Enable pnpm via corepack (which is included in node 22)
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

# Build TS
RUN pnpm run build

# Default command
CMD ["pnpm", "start"]
