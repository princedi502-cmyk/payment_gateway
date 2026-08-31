FROM node:20

WORKDIR /app

COPY payment_front/package*.json ./

RUN npm install

COPY payment_front/ .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]