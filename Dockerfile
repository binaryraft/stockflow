FROM node:18-bullseye

# Install dependencies for Electron + GTK 3 + X11
RUN apt-get update && apt-get install -y \
  libgtk-3-0 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxtst6 libnss3 libxrandr2 libasound2 \
  libgbm1 libpango1.0-0 libpangocairo-1.0-0 libatk1.0-0 libcups2 libdrm2 libxshmfence1

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 9003

CMD ["bash", "-c", "npm run dev & sleep 10 && npx electron ."]
