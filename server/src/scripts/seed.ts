import Product from "../models/product.model.ts";

export const seedProducts = async (): Promise<void> => {
  try {
    const count = await Product.countDocuments();

    if (count === 0) {
      const products = [
        {
          title: "Wireless Headphones",
          description: "Premium noise-cancelling wireless headphones with 30-hour battery life.",
          price: 149.99,
          image: "https://example.com/images/headphones.jpg",
          category: "Electronics",
          rating: 4.5,
          reviews: 120,
        },
        {
          title: "Smart Watch",
          description: "Fitness tracker with heart rate monitor and GPS.",
          price: 299.99,
          image: "https://example.com/images/smartwatch.jpg",
          category: "Electronics",
          rating: 4.2,
          reviews: 85,
        },
        {
          title: "Laptop Stand",
          description: "Ergonomic aluminum laptop stand with adjustable height.",
          price: 49.99,
          image: "https://example.com/images/laptop-stand.jpg",
          category: "Accessories",
          rating: 4.7,
          reviews: 210,
        },
        {
          title: "Mechanical Keyboard",
          description: "RGB mechanical keyboard with blue switches for gaming and typing.",
          price: 89.99,
          image: "https://example.com/images/keyboard.jpg",
          category: "Electronics",
          rating: 4.4,
          reviews: 156,
        },
        {
          title: "USB-C Hub",
          description: "7-in-1 USB-C hub with HDMI, SD card, and USB 3.0 ports.",
          price: 39.99,
          image: "https://example.com/images/usb-hub.jpg",
          category: "Accessories",
          rating: 4.0,
          reviews: 67,
        },
        {
          title: "Noise Cancelling Earbuds",
          description: "Compact earbuds with active noise cancellation and touch controls.",
          price: 129.99,
          image: "https://example.com/images/earbuds.jpg",
          category: "Electronics",
          rating: 4.3,
          reviews: 94,
        },
      ];

      await Product.insertMany(products);
      console.log("Dummy products inserted successfully");
    } else {
      console.log("Products already exist, skipping seeding");
    }
  } catch (error) {
    console.error("Seeding failed:", error);
  }
}


