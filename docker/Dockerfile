FROM oven/bun:1

WORKDIR /var/www/lighterpack

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8080

CMD ["bun", "run", "dev"]
