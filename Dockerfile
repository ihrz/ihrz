# Params for this image:

# BOT_TOKEN=<bot_token> 
# OWNER_ONE=<owner_id> 
# CLIENT_ID=<client_id> 
# HOST=<ip> PORT=<port>

# Use NodeJS 20
# https://nodejs.org
FROM node:20

# Create a workspace repo
WORKDIR /app

# Clone the Github repo
RUN git clone https://github.com/ihrz/ihrz ./

# Install ffmpeg for Music Module
RUN apt update && apt install -y ffmpeg

# COPY . .
COPY ./src/files/config.example.ts ./src/files/config.ts

# Install the dependecies with npm
RUN npm install

# Compile the code with npx
RUN npx tsc

# Running command
CMD ["npm", "t"]