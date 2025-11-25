#!/bin/bash
echo "Starting PharmaChain Tracker Backend..."
npm install
node init-sample-data.js
node server.js