FROM node:16

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json package-lock.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
