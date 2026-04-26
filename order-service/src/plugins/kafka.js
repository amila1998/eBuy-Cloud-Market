const { Kafka } = require('kafkajs');
const { getRedis } = require('./redis');

const REQUIRED_TOPICS = ['order.created', 'payment.success', 'payment.failed'];

const parseBrokers = (brokers) =>
  (brokers || 'localhost:9092')
    .split(',')
    .map((broker) => broker.trim())
    .filter(Boolean);

const kafka = new Kafka({
  clientId: 'order-service',
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

const startConsumer = async () => {
  consumer = kafka.consumer({ groupId: 'order-service-group' });
  await consumer.connect();
  await consumer.subscribe({ topics: ['payment.success', 'payment.failed'], fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const payload = JSON.parse(message.value.toString());
      console.log(`Received ${topic}:`, payload);

      const redis = getRedis();
      const key = `order:${payload.orderId}`;
      const raw = await redis.get(key);
      if (!raw) return;

      const order = JSON.parse(raw);
      order.status = topic === 'payment.success' ? 'paid' : 'payment_failed';
      order.updatedAt = new Date().toISOString();
      await redis.set(key, JSON.stringify(order));
    },
  });

  console.log('Order service Kafka consumer started');
};

module.exports = { connectKafka, publishEvent, startConsumer };
