FROM node:22-bookworm

WORKDIR /app

# Enable pnpm via corepack (which is included in node 22)
RUN corepack enable pnpm

# Install Chromium and dependencies for Puppeteer
RUN apt-get update && apt-get install -y chromium && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install

COPY . .

# Build TS
RUN pnpm run build

# Default command
CMD ["pnpm", "start"]
