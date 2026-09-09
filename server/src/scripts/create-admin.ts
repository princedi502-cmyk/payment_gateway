import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const createAdminUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/payment");

    const email = process.env.ADMIN_EMAIL || "admin@example.com";
    const password = process.env.ADMIN_PASSWORD || "Admin@123456";
    const name = process.env.ADMIN_NAME || "Admin";

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const existingAdmin = await db.collection("users").findOne({ email });

    if (existingAdmin) {
      console.log("Admin user already exists:", email);
      await mongoose.disconnect();
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      name,
      provider: "local",
      isVerified: true,
      role: "admin",
      verificationToken: "",
      verificationTokenExpires: new Date(),
      addresses: [],
      failedLoginAttempts: 0,
      lockUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Admin user created successfully:", email);
    await mongoose.disconnect();
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
};

createAdminUser();
