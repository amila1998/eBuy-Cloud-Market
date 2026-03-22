# eBuy Cloud Market — Project Report

**Module:** Cloud Technologies and Security Engineering (CTSE)  
**Project:** eBuy — Cloud-Native E-Commerce Platform  
**Architecture:** Microservices on AWS ECS (Fargate)

---

## 1. Shared Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                    │
│                         Next.js Frontend (Port 3000)                             │
└────────────┬────────────┬────────────┬────────────┬─────────────────────────────┘
             │ HTTP REST  │ HTTP REST  │ HTTP REST  │ HTTP REST
             ▼            ▼            ▼            ▼
┌────────────────────────────────────────────────────────────────────┐
│                         AWS ECS Fargate Cluster (ebuy-cluster)     │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ auth-service │  │product-service│  │ order-service│  │payment-service │  │
│  │  Port 3001   │  │  Port 3002   │  │  Port 3003   │  │   Port 3004    │  │
│  │  Fastify     │  │  Fastify     │  │  Fastify     │  │   Fastify      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └───────┬────────┘  │
│         │                 │                  │   HTTP           │           │
│         │                 │◄─────────────────┤ /check-stock     │           │
│         │                 │                  │                  │           │
│         │       ┌─────────▼──────────────────▼──────────────────▼──────┐   │
│         │       │                 Redis Stack                           │   │
│         └───────►  (User store, Product catalog, Orders, Payments)     │   │
│                 └────────────────────────────────────────────────────────┘   │
│                                                                    │
│         ┌──────────────────────────────────────────────────────┐   │
│         │                 Apache Kafka (KRaft)                 │   │
│         │  Topics: order.created → payment.success/failed      │   │
│         │  order-service (producer) ──► payment-service (consumer)  │
│         │  payment-service (producer) ──► order-service (consumer)  │
│         └──────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────────┐
│                      AWS Cloud Infrastructure                      │
│                                                                    │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  Amazon ECR  │   │  Amazon ECS  │   │   AWS CloudWatch     │   │
│  │ (5 Docker    │   │  (Fargate)   │   │  Logs (/ecs/*)       │   │
│  │  images)     │   │  awsvpc mode │   │                      │   │
│  └──────────────┘   └──────────────┘   └──────────────────────┘   │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              GitHub Actions CI/CD Pipeline                   │  │
│  │  push to main → test → build → push to ECR → deploy to ECS  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Communication Flow Summary

| Direction | Protocol | Purpose |
|---|---|---|
| Frontend → Auth Service | HTTP REST | User registration, login, token verification |
| Frontend → Product Service | HTTP REST | Browse, create, update, delete products |
| Frontend → Order Service | HTTP REST | Place and retrieve orders |
| Frontend → Payment Service | HTTP REST | View payment status |
| Order Service → Product Service | HTTP REST (sync) | Stock availability check before order creation |
| Order Service → Kafka | Event (`order.created`) | Triggers payment processing asynchronously |
| Payment Service → Kafka | Event (`payment.success` / `payment.failed`) | Notifies order service of payment outcome |
| All Services → Redis | TCP | Persistent data store (users, products, orders, payments) |

---

## 2. Auth Service — Description and Rationale

### Role in the System

The **Auth Service** is the identity and access management gateway for the entire eBuy platform. Every user interaction that requires authentication is routed through this service. It is the first service a user encounters — handling account creation and login — and its issued JWT tokens are the credentials consumed by all other services to authorise requests.

### What It Does

| Endpoint | Method | Description |
|---|---|---|
| `/api/user/register` | POST | Creates a new user account, stores hashed credentials in Redis, returns a JWT |
| `/api/user/login` | POST | Validates credentials against Redis, returns a JWT on success |
| `/api/user/me` | GET | Returns the currently authenticated user's profile (protected) |
| `/health` | GET | Health check endpoint for ECS task health monitoring |

### Design Rationale

**Fastify** was chosen over Express for its performance and built-in schema validation. The route schema for `/register` enforces `email` format and a minimum password length of 6 characters at the framework level, rejecting malformed requests before they reach application code.

**Redis** is used as the user store rather than a relational database because:
- The data model is simple (one hash key per user: `user:{email}`)
- It provides sub-millisecond lookups by email key
- The same Redis instance is shared across services, avoiding infrastructure duplication in a student-scale deployment

**JWT (JSON Web Tokens)** with a 7-day expiry are issued on both registration and login. The secret is injected at runtime via the `JWT_SECRET` environment variable — never hardcoded — and the same secret is configured on all other services so they can verify tokens independently without calling back to the auth service on every request (stateless verification).

**bcryptjs** with 12 salt rounds is used for password hashing. This cost factor was chosen to balance security (resistance to brute force) with response time on Fargate's 1 vCPU allocation.

---

## 3. Inter-Service Communication

### 3.1 Synchronous — JWT Verification (Auth → All Services)

The auth service does not expose a token verification endpoint. Instead, all services share the same `JWT_SECRET` and verify tokens locally using `@fastify/jwt`. This eliminates a single point of failure and a network hop on every request.

**Example — Product Service verifying a JWT from Auth Service:**

```js
// product-service/src/index.js
app.register(fastifyJwt, {
  secret: process.env.JWT_SECRET,
});

app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();  // validates signature using shared secret
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});
```

A user logs in via the auth service, receives a token, then sends it as `Authorization: Bearer <token>` to the product service — which validates it without any call back to the auth service.

### 3.2 Synchronous HTTP — Order Service → Product Service

When a user places an order, the order service makes a synchronous HTTP call to the product service to verify stock before committing the order.

**Request from Order Service:**
```http
POST http://product-service-service-s4aqsu66:3002/api/products/{productId}/check-stock
Content-Type: application/json

{ "quantity": 2 }
```

**Product Service Response (stock available):**
```json
{ "available": true, "product": { "name": "Laptop", "price": 999.99, "stock": 10 } }
```

**Product Service Response (insufficient stock):**
```json
{ "available": false, "stock": 1 }
```

The order service uses the product details returned (name, price) to compute the `totalAmount` and embed product metadata directly in the order record, avoiding future cross-service lookups.

```js
// order-service/src/controllers/orderController.js
const res = await fetch(`${PRODUCT_SERVICE_URL}/api/products/${productId}/check-stock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ quantity }),
});
const data = await res.json();
if (!res.ok || !data.available) {
  return reply.code(400).send({ error: 'Insufficient stock', details: data });
}
```

### 3.3 Asynchronous Kafka Events — Order Service ↔ Payment Service

The order and payment services communicate asynchronously through Apache Kafka (KRaft mode, no ZooKeeper).

**Flow:**

```
Order Service                  Kafka Broker                 Payment Service
     │                              │                              │
     │── publish(order.created) ───►│                              │
     │                              │── deliver(order.created) ───►│
     │                              │                              │── processPayment()
     │                              │                              │── publish(payment.success)
     │◄── deliver(payment.success) ─│◄─────────────────────────────│
     │── update order.status='paid' │                              │
```

**Order Service publishes `order.created`:**
```js
// order-service/src/plugins/kafka.js
await publishEvent('order.created', {
  orderId: order.id,
  userId: order.userId,
  productId,
  quantity,
  totalAmount: order.totalAmount,
});
```

**Payment Service consumes `order.created`, processes payment (90% simulated success), then publishes result:**
```js
// payment-service/src/plugins/kafka.js
const success = Math.random() < 0.9;
const topic = success ? 'payment.success' : 'payment.failed';
await publishEvent(topic, {
  paymentId, orderId, userId, amount, status: payment.status,
});
```

**Order Service consumes `payment.success` / `payment.failed` and updates order status:**
```js
order.status = topic === 'payment.success' ? 'paid' : 'payment_failed';
await redis.set(`order:${order.id}`, JSON.stringify(order));
```

This event-driven pattern means the payment service can be scaled, restarted, or temporarily unavailable without causing the order service to fail or block.

---

## 4. DevOps and Security Practices

### 4.1 CI/CD Pipeline (GitHub Actions)

The pipeline in `.github/workflows/ci-cd.yml` enforces a linear quality gate:

```
push to main
    │
    ├── test-auth      ──┐
    ├── test-product   ──┤── All must pass
    ├── test-order     ──┤
    └── test-payment   ──┘
              │
              ▼
       build-and-push  (only on main push)
       ├── docker build each service
       ├── tag with git SHA (immutable) + latest
       └── push to Amazon ECR
              │
              ▼
         deploy (only on main push)
         └── aws ecs update-service --force-new-deployment
```

Key practices:
- **Immutable image tags** — each image is tagged with the full git commit SHA (`github.sha`), ensuring every deployment is fully traceable and rollbacks are trivial
- **Test gate** — no image is built unless all four service test suites pass
- **Parallel testing** — all four service test jobs run concurrently, reducing pipeline time
- **npm lock files** — `package-lock.json` is committed for each service, ensuring `npm ci` reproducibility and enabling GitHub Actions npm caching

### 4.2 Containerisation

Each service has a dedicated `Dockerfile` with:
- `node:20-alpine` base image (minimal attack surface)
- `npm install --production` (dev dependencies excluded from the image)
- `EXPOSE` declaration for the correct port
- Non-root process via Node process model

The frontend uses a **multi-stage Dockerfile**:
1. **Builder stage** — installs all deps, runs `next build` with `output: 'standalone'`
2. **Runner stage** — copies only the standalone output (no `node_modules`), producing a significantly smaller final image

### 4.3 Secret Management

All sensitive configuration is handled as environment variables injected at runtime:

| Secret | Where used |
|---|---|
| `JWT_SECRET` | Auth, Product, Order, Payment services (token signing/verification) |
| `REDIS_URL` | All backend services (Redis connection string including password) |
| `REDIS_PASSWORD` | All backend services |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | CI/CD pipeline only |

Secrets are stored in **GitHub Actions Secrets** and never appear in source code or Docker images. The Redis password is embedded in the `REDIS_URL` (`redis://:password@host:6379`) so the application doesn't need to separately manage authentication.

### 4.4 Security Controls

| Control | Implementation |
|---|---|
| Password hashing | `bcryptjs` with 12 salt rounds (OWASP-recommended cost factor) |
| Authentication | Stateless JWT, 7-day expiry, HS256 algorithm |
| Input validation | Fastify JSON Schema on all request bodies (type, format, required fields) |
| Authorisation | `authenticate` decorator applied to all protected routes; order ownership validated on retrieval |
| CORS | Explicitly configured on all services via `@fastify/cors` |
| Injection protection | No raw query construction — all data access via Redis client methods with key scoping |

### 4.5 Logging and Observability

- **Fastify logger** enabled on all services — structured JSON logs including request method, URL, status, and response time
- **AWS CloudWatch Logs** — each service writes to a dedicated log group (`/ecs/{service-name}`) configured via the ECS task definition's `awslogs` log driver with `awslogs-create-group: true` (group auto-created)
- **Health endpoints** — every service exposes `GET /health` returning `{ status: 'ok', service: '<name>' }`, used by ECS health checks to determine task health before routing traffic

---

## 5. Challenges and How They Were Addressed

### 5.1 Redis Connection Refused in ECS (`ECONNREFUSED 127.0.0.1:6379`)

**Challenge:** After deploying to ECS Fargate, all services logged `Redis client error: connect ECONNREFUSED 127.0.0.1:6379`. The docker-compose setup worked locally, but ECS containers failed to connect.

**Root cause:** ECS task definitions did not have the `REDIS_URL` environment variable set. The application therefore used the hardcoded fallback `redis://localhost:6379`, which doesn't exist within a container — Redis runs as a separate ECS task accessible only by its service discovery DNS name.

**Resolution:**
1. Updated the CI/CD deploy step to call `aws ecs register-task-definition` before every deployment, injecting the correct `REDIS_URL` (`redis://:password@redis-service-service-mqa7acta:6379`) from GitHub Secrets into the task definition
2. Ensured `REDIS_URL` and all other service-discovery URLs are passed as ECS task-level environment variables on every deploy, not just at initial setup

### 5.2 Docker Build Failing — Missing `public/` Directory

**Challenge:** The frontend Docker build failed in CI with:
```
ERROR: "/app/public": not found
```
The Dockerfile's runner stage copied `COPY --from=builder /app/public ./public`, but no `public/` directory existed in the repository.

**Resolution:** Created `frontend/public/.gitkeep` to materialise the directory in git. Since `COPY . .` in the builder stage copies everything from the repo (including the now-present empty `public/` directory) into `/app`, the runner stage's `COPY --from=builder /app/public ./public` succeeds.

### 5.3 CI npm Cache Failure — Missing Lock Files

**Challenge:** All four CI test jobs failed with:
```
Error: Some specified paths were not resolved, unable to cache dependencies.
```
`actions/setup-node` was configured with `cache: 'npm'` and `cache-dependency-path: <service>/package-lock.json`, but no `package-lock.json` files were committed.

**Resolution:** Generated `package-lock.json` for all services locally using `npm install --package-lock-only --ignore-scripts` and committed them. This also ensures `npm ci` (which strictly requires a lock file) works correctly in CI.

### 5.4 Asynchronous Payment Integration

**Challenge:** Designing the payment flow without creating tight coupling between order and payment services. A synchronous HTTP call from order service to payment service would mean an order can't be created if payment service is down.

**Resolution:** Adopted an event-driven pattern using Kafka:
- Order service publishes `order.created` and immediately returns the order to the client with status `pending`
- Payment service consumes the event asynchronously, processes payment, and publishes `payment.success` or `payment.failed`
- Order service consumes the payment result and updates the order status

This decouples the two services entirely. A payment service restart or slowdown does not affect order creation, and the system naturally retains messages in Kafka until they are consumed.

### 5.5 Service Discovery in ECS

**Challenge:** In local docker-compose, services reference each other by container name (e.g., `http://product-service:3002`). In ECS, each service gets an AWS Cloud Map DNS entry that differs from the container name.

**Resolution:** Internal service URLs and Kafka broker addresses are injected as environment variables (`PRODUCT_SERVICE_URL`, `KAFKA_BROKERS`) in the ECS task definitions. The application code uses these variables with sensible localhost fallbacks for local development:
```js
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
```
This keeps local and cloud environments compatible without code changes.
