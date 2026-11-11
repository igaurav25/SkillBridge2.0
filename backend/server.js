require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const { validateSecurityConfig } = require('./src/utils/jwt');
const User = require('./src/models/User');
const { seedAll } = require('./src/utils/seedRunner');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 0. Validate critical security config (fail-fast in production)
    validateSecurityConfig();

    // 1. Connect Database
    await connectDB();

    // 2. Demo seeding only in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      const userCount = await User.countDocuments();
      if (userCount === 0) {
        console.log(' Database is empty. Seeding SkillBridge non-production demo data...');
        await seedAll();
      } else {
        console.log(` Database already contains ${userCount} users. Ready!`);
      }
    }

    // 3. Start Express server
    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  SkillBridge Backend API running on port ${PORT}`);
      console.log(`  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    process.on('unhandledRejection', (err) => {
      console.error(`Unhandled Rejection Error: ${err.message}`);
    });

    process.on('uncaughtException', (err) => {
      console.error(`Uncaught Exception Error: ${err.message}`);
    });
  } catch (err) {
    console.error(`Server initialization failed: ${err.message}`);
    process.exit(1);
  }
};

startServer();
