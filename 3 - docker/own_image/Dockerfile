# Dockerfile creates an image,  has to be based off pre-existing image
# First layer is node and it's what our image is based on
FROM node:16

# Set working dir for subsequent instruction
WORKDIR /usr/src/app

# Copy files we want to working dir
# COPY package-lock.json /usr/src/app
# COPY package.json /usr/src/app
# COPY index.js /usr/src/app

# Copy all files in root to working dir (some files ignore in .dockerignore)
COPY . /usr/src/app/


# run npm install to install our server's dependencies
RUN npm install

# Set up environment variable
ENV PORT=8000

# Use the value of the PORT env in EXPOSE instruction to indicate that containes based on our image will listen on the specified port
EXPOSE ${PORT}

# Set default command to be run when executing a container from this image
# We want container to run our API server by executing npm start
CMD ["npm", "start"]