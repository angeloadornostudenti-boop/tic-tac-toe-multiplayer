FROM node:20-alpine

WORKDIR /app

# Il wildcard evita l'errore se package-lock.json non esiste ancora
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]