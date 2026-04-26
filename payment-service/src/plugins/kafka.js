const { Kafka } = require('kafkajs');
const { getRedis } = require('./redis');
const { v4: uuidv4 } = require('uuid');

const REQUIRED_TOPICS = ['order.created', 'payment.success', 'payment.failed'];

const parseBrokers = (brokers) =>
  (brokers || 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: parseBrokers(process.env.KAFKA_BROKERS),
});

let producer;
let consumer;

const ensureTopics = async () => {
  const admin = kafka.admin();
  await admin.connect();

  try {
    const existingTopics = await admin.listTopics();
    const missingTopics = REQUIRED_TOPICS.filter((topic) => !existingTopics.includes(topic));

    if (!missingTopics.length) return;

    await admin.createTopics({
      waitForLeaders: true,
      topics: missingTopics.map((topic) => ({
        topic,
        numPartitions: 1,
        replicationFactor: 1,
      })),
    });

    console.log(`Created missing Kafka topics: ${missingTopics.join(', ')}`);
  } finally {
    await admin.disconnect();
  }
};

const connectKafka = async () => {
  await ensureTopics();
  producer = kafka.producer();
  await producer.connect();
  console.log('Kafka producer connected');
};

const publishEvent = async (topic, message) => {
  await producer.send({
    topic,
    messages: [{ value: JSON.stringify(message) }],
  });
};

/**
 * Simulate payment processing:
 * - 90% success rate for demo purposes
 */
const processPayment = async (orderData) => {
  const redis = getRedis();
  const paymentId = uuidv4();

  // Simulate 90% success rate
  const success = Math.random() < 0.9;

  const payment = {
    id: paymentId,
    orderId: orderData.orderId,
    userId: orderData.userId,
    amount: orderData.totalAmount,
    status: success ? 'success' : 'failed',
    processedAt: new Date().toISOString(),
  };

  await redis.set(`payment:${paymentId}`, JSON.stringify(payment));

  const topic = success ? 'payment.success' : 'payment.failed';
  await publishEvent(topic, {
    paymentId,
    orderId: orderData.orderId,
    userId: orderData.userId,
    amount: orderData.totalAmount,
    status: payment.status,
  });

  console.log(`Payment ${payment.status} for order ${orderData.orderId}`);
  return payment;
};

const startConsumer = async () => {
  consumer = kafka.consumer({ groupId: 'payment-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['order.created'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const orderData = JSON.parse(message.value.toString());
      console.log('Processing payment for order:', orderData.orderId);
      await processPayment(orderData);
    },
  });

  console.log('Payment service Kafka consumer started');
};

module.exports = { connectKafka, publishEvent, startConsumer };
