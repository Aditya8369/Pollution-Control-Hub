const mqtt = require('mqtt');
const { PrismaClient } = require('@prisma/client');
const { parseSensorData } = require('./sensorDataParser');

const prisma = new PrismaClient();
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';

/**
 * @module mqttClient
 * @description Initializes and manages the persistent MQTT broker connection and topic subscriptions.
 */
class MQTTClientManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    connect() {
        this.client = mqtt.connect(MQTT_BROKER_URL, {
            clientId: `pollution_hub_server_${Math.random().toString(16).slice(3)}`,
            clean: true,
            connectTimeout: 4000,
            reconnectPeriod: 1000,
        });

        this.client.on('connect', () => {
            console.log('✅ Connected to MQTT Broker');
            this.isConnected = true;
            // Subscribe to all sensor data topics: sensors/{sensorId}/data
            this.client.subscribe('sensors/+/data', (err) => {
                if (err) {
                    console.error('❌ Failed to subscribe to sensor topics:', err);
                } else {
                    console.log('📡 Subscribed to sensors/+/data');
                }
            });
        });

        this.client.on('message', async (topic, message) => {
            try {
                const topicParts = topic.split('/');
                if (topicParts.length === 3 && topicParts[0] === 'sensors' && topicParts[2] === 'data') {
                    const sensorId = topicParts[1];
                    const parsedData = parseSensorData(sensorId, message.toString());

                    if (parsedData) {
                        // Store in database efficiently
                        await prisma.ioTTelemetry.create({
                            data: parsedData,
                        });

                        // Update sensor lastSeen
                        await prisma.ioTSensor.upsert({
                            where: { id: sensorId },
                            update: { lastSeen: new Date(), status: 'ACTIVE' },
                            create: { id: sensorId, name: `Sensor ${sensorId}`, lastSeen: new Date(), status: 'ACTIVE' },
                        });

                        // TODO: Emit to WebSocket for real-time frontend updates
                    }
                }
            } catch (error) {
                console.error('Error processing MQTT message:', error);
            }
        });

        this.client.on('error', (err) => {
            console.error('❌ MQTT Client Error:', err);
            this.isConnected = false;
        });

        this.client.on('close', () => {
            console.log('⚠️ MQTT Client disconnected');
            this.isConnected = false;
        });
    }

    disconnect() {
        if (this.client) {
            this.client.end();
            this.isConnected = false;
        }
    }
}

const mqttManager = new MQTTClientManager();
module.exports = mqttManager;
