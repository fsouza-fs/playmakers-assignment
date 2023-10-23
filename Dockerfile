FROM node:18

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .
EXPOSE 3000
ENTRYPOINT [ "node", "server.js" ]
