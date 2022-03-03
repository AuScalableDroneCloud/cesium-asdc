FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive 
RUN apt update
RUN apt -y install curl
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt install -y nodejs
WORKDIR /app
COPY package.json /app
RUN npm install
RUN npm install ept-tools -g
COPY . /app
# RUN node ./node_modules/webpack/bin/webpack.js --mode production
EXPOSE 8080
# CMD ept serve & node server.cjs --production
CMD ept serve & node server.cjs
