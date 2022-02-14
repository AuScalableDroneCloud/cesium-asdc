FROM node
WORKDIR /app
COPY package.json /app
RUN npm install --legacy-peer-deps
RUN npm install ept-tools -g
COPY . /app
RUN node ./node_modules/webpack/bin/webpack.js --mode production
EXPOSE 8080
CMD ept serve & node server.cjs --production
