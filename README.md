# FACS Organics & Herbs

A full-stack e-commerce storefront project designed to showcase a complete online retail experience for an organic products brand.

## Project Summary

This project demonstrates a practical full-stack web application with:

- A customer-facing storefront for browsing products and interacting with cart and wishlist features
- A user account experience for authentication and profile-related actions
- A clean storefront experience for browsing products and interacting with cart and wishlist features
- A backend API built with Node.js and Express
- Firebase integration for authentication, database access, and secure backend services

## Key Features

- Responsive storefront experience
- Product browsing and category-based presentation
- Cart and wishlist interactions
- User account and profile experience
- Backend API routes for products, users, orders, and authentication
- Firebase-backed data and authentication flow

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database/Auth: Firebase Firestore, Firebase Authentication
- Project Structure: Modular client/server architecture

## Repository Structure

- `public/` — storefront pages and frontend assets
- `server/` — Express API, routes, middleware, and Firebase integration
- `init-db.js` — database initialization helper
- `firestore.rules.js` — Firestore security rules

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
npm run install-all
```

### Environment Setup

Create local environment files from the examples:

```bash
copy .env.example .env
copy server\.env.example server\.env
```

Then fill in your Firebase credentials and project values.

### Run Locally

```bash
npm run dev
```

This starts the frontend and backend together for local development.

## Project Goals

This repository was built to reflect a real-world web application scenario involving:

- end-to-end frontend and backend integration
- authentication and data management
- a clean portfolio-ready storefront experience
- clean project structure suitable for portfolio presentation

## Notes

This project is intended as a portfolio-ready demonstration of full-stack development skills for employers, clients, and interview presentations.
