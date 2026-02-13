# Base image
FROM node:16-bullseye

# Set working directory
WORKDIR /usr/src/app

# Install dependencies (including poppler-utils for pdftoppm)
RUN apt-get update && apt-get install -y \
    poppler-utils \
    fontconfig \
    libfontconfig \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Copy package files first (better for caching)
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Optional: install global tools (phantomjs/html-pdf)
RUN npm install -g phantomjs-prebuilt html-pdf

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 5000

# Start the app
CMD ["node", "app.js"]
