FROM node
WORKDIR /app
COPY package.json /app
RUN npm install --legacy-peer-deps
RUN npm install ept-tools -g
COPY . /app
EXPOSE 8080
CMD ept serve & node server.cjs
