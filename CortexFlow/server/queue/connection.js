const IORedis = require("ioredis");

/*
|--------------------------------------------------------------------------
| Redis Connection
|--------------------------------------------------------------------------
|
| Supports:
|
| Local Redis:
| redis://127.0.0.1:6379
|
| Upstash / TLS Redis:
| rediss://default:PASSWORD@HOST:6379
|
| We parse REDIS_URL ourselves instead of passing the entire URL directly
| to ioredis. This avoids hosting environments incorrectly treating the
| Redis URL as a socket/path.
|
*/

let connection = null;

const getConnection = () => {
  if (connection) {
    return connection;
  }

  const redisUrl =
    process.env.REDIS_URL ||
    "redis://127.0.0.1:6379";

  let parsedUrl;

  try {
    parsedUrl = new URL(redisUrl);
  } catch (error) {
    throw new Error(
      "REDIS_URL is invalid. Expected redis://... or rediss://..."
    );
  }

  const isTLS =
    parsedUrl.protocol === "rediss:";

  if (
    parsedUrl.protocol !== "redis:" &&
    parsedUrl.protocol !== "rediss:"
  ) {
    throw new Error(
      `Unsupported Redis protocol: ${parsedUrl.protocol}`
    );
  }

  const redisOptions = {
    host: parsedUrl.hostname,

    port:
      Number(parsedUrl.port) || 6379,

    username:
      parsedUrl.username
        ? decodeURIComponent(parsedUrl.username)
        : undefined,

    password:
      parsedUrl.password
        ? decodeURIComponent(parsedUrl.password)
        : undefined,

    maxRetriesPerRequest: null,

    enableReadyCheck: true,

    connectTimeout: 10000,

    retryStrategy(times) {
      return Math.min(
        times * 1000,
        5000
      );
    },
  };

  /*
  |--------------------------------------------------------------------------
  | TLS FOR UPSTASH
  |--------------------------------------------------------------------------
  |
  | rediss:// means Redis over TLS.
  |
  */

  if (isTLS) {
    redisOptions.tls = {
      servername: parsedUrl.hostname,
    };
  }

  connection =
    new IORedis(redisOptions);

  connection.on(
    "connect",
    () => {
      console.log(
        `[redis] Connected to ${parsedUrl.hostname}:${redisOptions.port}`
      );
    }
  );

  connection.on(
    "ready",
    () => {
      console.log(
        "[redis] Connection ready"
      );
    }
  );

  connection.on(
    "error",
    (error) => {
      console.error(
        "Redis connection error:",
        error.message
      );
    }
  );

  connection.on(
    "close",
    () => {
      console.warn(
        "[redis] Connection closed"
      );
    }
  );

  return connection;
};

module.exports = {
  getConnection,
};