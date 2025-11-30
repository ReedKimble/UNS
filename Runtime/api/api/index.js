'use strict';

// Vercel serverless entry point: re-use the Express app exported from src/server.js
const { app } = require('../src/server');

module.exports = app;
