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
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /scrapper
COPY package.json package-lock.json ./
RUN npm install
COPY bin/ ./bin/
ENTRYPOINT ["node", "./bin/index.js"]