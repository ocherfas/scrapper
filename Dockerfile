FROM alpine:edge
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      freetype-dev \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      nodejs \
      npm

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CONFIG_PATH=config.json

WORKDIR /scrapper
COPY package.json package-lock.json ./
RUN npm install
COPY bin/ ./bin/ 
COPY config.json ./
ENTRYPOINT ["node", "./bin/index.js"]