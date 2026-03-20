# E-Commerce Microservices System (DevOps Assignment)

## 📌 Overview
This project implements a secure microservice-based e-commerce system using DevOps and cloud practices.

---

## 🧩 Architecture

### Microservices:
1. Auth Service
2. Product Service
3. Order Service
4. Payment Service

### Tech Stack:
- Frontend: Next.js
- Backend: Node.js (Fastify)
- Database: Redis
- Messaging: Kafka
- Containerization: Docker
- CI/CD: GitHub Actions
- Cloud: AWS (ECS, ECR)

---

## 🔗 Service Communication

### REST + Kafka
- Order → Product (REST)
- Order → Payment (Kafka)
- Payment → Order (Kafka)

### Kafka Topics:
- order.created
- payment.success
- payment.failed

---

## 🐳 Docker Setup

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🔁 CI/CD Pipeline

```yaml
name: CI/CD
on:
  push:
    branches: ["main"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm test
      - run: docker build -t image-name .
```

---

## 🔐 Security

- JWT Authentication
- Password hashing (bcrypt)
- IAM roles
- Secrets via environment variables
- SAST (SonarCloud / Snyk)

---

## ☁️ Deployment

- AWS ECS (Fargate)
- AWS ECR (Docker images)
- Redis via Elasticache
- Kafka via MSK or Confluent

---

## 📦 Features

- User authentication
- Product management
- Order processing
- Payment simulation

---

## 🧪 Testing

- Unit tests (Jest)
- API testing (Postman)

---

## 📊 Demo Checklist

- User login
- View products
- Place order
- Payment event via Kafka
- Order status update

---

## 👥 Team Responsibilities

Each member:
- Develop 1 microservice
- Deploy independently
- Integrate with at least 1 other service

---

## 📁 Repository Structure

```
/auth-service
/product-service
/order-service
/payment-service
/frontend
```

---

## 🚀 Conclusion

This project demonstrates:
- Microservices architecture
- DevOps practices
- Cloud deployment
- Secure system design
