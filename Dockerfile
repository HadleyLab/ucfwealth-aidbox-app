FROM node:16

ENV IPFS_PATH=/ipfs
RUN mkdir /ipfs
RUN chown node /ipfs

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json package-lock.json ./

RUN npm install

COPY . .

CMD ["npm", "start"]
