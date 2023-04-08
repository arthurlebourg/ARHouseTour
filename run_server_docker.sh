#!/bin/bash

npm run build

docker build -t arhousetour:latest .

docker stop archat

docker container rm arhousetour

docker run -d -p 443:3000 --restart unless-stopped --name arhousetour arhousetour:latest