FROM node:16

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json package-lock.json ./

RUN npm install

COPY . .

COPY google-credentials.json /usr/src/app/google-credentials.json
ENV GOOGLE_APPLICATION_CREDENTIALS=/usr/src/app/google-credentials.json

CMD ["npm", "start"]
