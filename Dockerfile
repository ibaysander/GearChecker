FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Create volume for logs
VOLUME /app/logs

# Expose port for healthcheck
EXPOSE 2000

# Start the application
CMD ["node", "app.js"]