# ---- build do Angular ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration docker

# ---- serve estático via nginx (com proxy /api -> backend) ----
FROM nginx:alpine
COPY nginx.docker.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ensinado-aprendizado-maquina/browser /usr/share/nginx/html
EXPOSE 80
