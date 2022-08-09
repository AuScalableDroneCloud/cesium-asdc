FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive 
RUN apt update
RUN apt -y install curl
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt install -y nodejs
WORKDIR /app
COPY package.json /app
RUN npm install

COPY . /app

WORKDIR /app/ept-tools-mod
RUN npm install
RUN npm run build

WORKDIR /app
RUN node ./node_modules/webpack/bin/webpack.js --mode production
EXPOSE 8080
EXPOSE 3000
CMD  node --max_old_space_size=2048 ./ept-tools-mod/lib/app/index.js serve & node --max_old_space_size=2048 server.cjs --production