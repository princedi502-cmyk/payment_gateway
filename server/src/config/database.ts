import mongoose from "mongoose";

const connectDatabase = async (): Promise<void> => {
  const mongoUri = process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected. Attempting to reconnect...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("MongoDB reconnected successfully");
  });

  await mongoose.connect(mongoUri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  console.log("Database connected successfully");
};

export default connectDatabase;
