FROM node:16-bullseye

VOLUME /app
WORKDIR /app

RUN echo 'registry=https://mirrors.sjtug.sjtu.edu.cn/npm-registry' > /root/.npmrc

ENTRYPOINT npm run serve
