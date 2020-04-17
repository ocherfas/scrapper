FROM node:10-slim
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /scrapper
COPY package.json package-lock.json ./
RUN npm install
ARG chrome_path=/scrapper/node_modules/puppeteer/.local-chromium/linux-722234/chrome-linux
RUN mv ${chrome_path}/chrome ${chrome_path}/chrome-real
COPY ./hack/chrome ${chrome_path}
RUN cd /scrapper
COPY bin/ ./bin/
ENTRYPOINT ["node", "./bin/index.js"]