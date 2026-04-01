# dscr_calc

Production-ready DSCR loan calculator and lead capture application for VeeCasa.

## Overview

This repository contains a Dockerized web application that helps real-estate investors:

- Calculate DSCR (Debt Service Coverage Ratio)
- View qualification strength (weak, borderline, strong)
- Submit lead information for follow-up
- Run locally or deploy to cloud/VPS with containers

## Project Layout

- dscr-app/: Main application
- dscr-app/frontend/: HTML, CSS, and JavaScript client
- dscr-app/backend/: Express server and API routes
- dscr-app/tests/: Automated test coverage

## Features

- Mobile-first DSCR calculator UI
- Investor-focused qualification messaging
- Lead capture with server-side validation
- Anti-spam controls:
  - Honeypot field detection
  - Submission-speed check
  - Per-IP rate limiting
- Redis-backed persistent rate limiting with in-memory fallback
- Static frontend served by Express
- Docker and Docker Compose support

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js + Express
- Optional infra service: Redis
- Containers: Docker + Docker Compose
- Tests: Node test runner + Supertest

## Local Development

From dscr-app:

1. Install dependencies
   npm install

2. Run tests
   npm test

3. Start app
   npm start

App URL:
http://localhost:3000

## Docker Run

From dscr-app:

1. Build and start services
   docker-compose up --build

2. Open app
   http://localhost:3000

Services started by Compose:

- dscr-app (web/API)
- redis (rate-limit storage)

## API

Lead endpoint:

- POST /api/leads

Required fields:

- firstName
- lastName
- email
- phone
- loanPurpose
- propertyType
- creditScoreRange
- entityType

## Deployment Notes

- Port 3000 is exposed by the app container.
- Set REDIS_URL to use external Redis in cloud deployments.
- If Redis is unavailable, app continues with in-memory limiter.

## Current Status

- App implemented and tested
- Automated tests passing
- Ready for deployment
