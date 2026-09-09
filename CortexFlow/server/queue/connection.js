const IORedis = require("ioredis");

/*
|--------------------------------------------------------------------------
| Redis Connection
|--------------------------------------------------------------------------
|
| BullMQ needs a Redis connection with maxRetriesPerRequest set to
| null (its own recommendation) so blocking commands used
| internally by the Worker don't get prematurely cut off.
|
| Set REDIS_URL in .env, e.g.:
|   REDIS_URL=redis://localhost:6379
|
*/

let connection;

const getConnection = () => {
  if (!connection) {
    connection = new IORedis(
      process.env.REDIS_URL || "redis://127.0.0.1:6379",
      {
        maxRetriesPerRequest: null,
      }
    );

    connection.on("error", (error) => {
      console.error("Redis connection error:", error.message);
    });
  }

  return connection;
};

module.exports = { getConnection };
