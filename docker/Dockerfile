FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY viewer/ viewer/

ENV DATA_DIR=/app/data
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]
