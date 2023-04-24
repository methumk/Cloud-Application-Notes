# For Server
# Taken from own_image dir
FROM node:16
WORKDIR /usr/src/app

# COPY . /usr/src/app/
# Specifying manually
COPY server.js /usr/src/app/
COPY package.json /usr/src/app/
COPY package-lock.json /usr/src/app/


RUN npm install
ENV PORT=8000
EXPOSE ${PORT}
CMD ["npm", "start"]