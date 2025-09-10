const { Sequelize } = require('sequelize');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Group = require('../models/Group');
const Budget = require('../models/Budget');
const Notification = require('../models/Notification');

// Database configuration with SSL handling for managed databases
const getDatabaseConfig = () => {
  // If DB_URL is provided, parse it and handle SSL
  if (process.env.DB_URL) {
    return {
      url: process.env.DB_URL,
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' ? {
          require: true,
          rejectUnauthorized: false, // Allow self-signed certificates for managed databases
          // Note: For DigitalOcean managed databases, SSL is handled by the connection string
          // If using certificates, uncomment the lines below:
          // ca: process.env.DB_CA_CERT,
          // cert: process.env.DB_CLIENT_CERT,
          // key: process.env.DB_CLIENT_KEY,
        } : false
      }
    };
  }
  
  // Fallback to individual environment variables
  return {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'zappay_production',
    username: process.env.DB_USER || 'zappay_user',
    password: process.env.DB_PASSWORD || 'password',
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false, // Allow self-signed certificates for managed databases
        // Note: For DigitalOcean managed databases, SSL is handled by the connection string
        // If using certificates, uncomment the lines below:
        // ca: process.env.DB_CA_CERT,
        // cert: process.env.DB_CLIENT_CERT,
        // key: process.env.DB_CLIENT_KEY,
      } : false
    }
  };
};

const sequelize = new Sequelize(getDatabaseConfig());

// Initialize models
const models = {
  User: User(sequelize),
  Transaction: Transaction(sequelize),
  Group: Group(sequelize),
  Budget: Budget(sequelize),
  Notification: Notification(sequelize)
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Database connection function with aggressive SSL bypass
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Sync database in production (create tables if they don't exist)
    if (process.env.NODE_ENV === 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database synchronized');
    }
    
    return sequelize;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    
    // Log SSL/TLS connection issues for debugging
    if (error.message.includes('self-signed certificate') || 
        error.message.includes('certificate') || 
        error.message.includes('SSL') ||
        error.message.includes('TLS')) {
      
      console.error('🚨 SSL/TLS connection failed. Check your database certificates and configuration.');
      console.error('📝 Required environment variables: DB_CA_CERT, DB_CLIENT_CERT, DB_CLIENT_KEY');
      console.error('📝 Ensure your database supports SSL and certificates are valid.');
      console.error('📝 For DigitalOcean managed databases, use the provided connection string with SSL.');
    }
    
    throw error;
  }
};

// Close database connection
const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  models,
  connectDB,
  closeDB
};
