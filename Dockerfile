FROM node
WORKDIR /app
COPY package.json /app
RUN npm install --legacy-peer-deps
COPY . /app
EXPOSE 8080
CMD node server.cjs
