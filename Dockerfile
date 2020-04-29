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

COPY ./hack/chrome /usr/bin/chromium-browser-custom
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser-custom \
    CONFIG_PATH=config.json

WORKDIR /scrapper
COPY package.json package-lock.json ./
RUN npm install
COPY bin/ ./bin/ 
#should be removed once new version of israeli-bank-scrapper has a new version
COPY dependencies/ ./dependencies/
COPY config.json ./
ENTRYPOINT ["node", "./bin/index.js"]