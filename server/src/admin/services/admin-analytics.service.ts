import Order from "../../models/order.model.ts";
import User from "../../models/user.model.ts";
import Product from "../../models/product.model.ts";
import Return from "../../models/return.model.ts";

export async function getDashboardStats() {
  const [totalOrders, totalUsers, totalProducts, totalRevenue, recentReturns] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: "user" }),
    Product.countDocuments({ isActive: true }),
    Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Return.countDocuments({ status: { $in: ["requested", "approved"] } }),
  ]);

  const [ordersByStatus, paymentStats] = await Promise.all([
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: { $in: ["paid", "refunded"] } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$total" },
        },
      },
    ]),
  ]);

  return {
    totalOrders,
    totalUsers,
    totalProducts,
    totalRevenue: totalRevenue[0]?.total || 0,
    pendingReturns: recentReturns,
    ordersByStatus: ordersByStatus.reduce(
      (acc, curr) => ({ ...acc, [curr._id]: curr.count }),
      {}
    ),
    paymentStats: paymentStats.reduce(
      (acc, curr) => ({ ...acc, [curr._id]: { count: curr.count, total: curr.total } }),
      {}
    ),
  };
}

export async function getSalesChartData(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay());
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - (days - 1));

  const result = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        status: { $in: ["paid", "refunded"] },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "paid"] }, "$total", 0],
          },
        },
        refunds: {
          $sum: {
            $cond: [{ $eq: ["$status", "refunded"] }, "$total", 0],
          },
        },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return result.map((item) => ({
    date: item._id,
    revenue: item.revenue,
    refunds: item.refunds,
    orders: item.orders,
  }));
}

export async function getRevenueAnalytics(startDate: Date, endDate: Date) {
  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: "paid",
  };

  const [dailyRevenue, totalStats, topProducts] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: "$total" },
        },
      },
    ]),
    Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          title: { $first: "$items.title" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    dailyRevenue,
    totalStats: totalStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
    topProducts,
  };
}

export async function getOrderAnalytics(startDate: Date, endDate: Date) {
  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const [statusBreakdown, dailyOrders, avgProcessingTime] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: { ...matchStage, paidAt: { $exists: true } } },
      {
        $project: {
          processingTime: { $subtract: ["$paidAt", "$createdAt"] },
        },
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: "$processingTime" },
        },
      },
    ]),
  ]);

  return {
    statusBreakdown,
    dailyOrders,
    avgProcessingTime: avgProcessingTime[0]?.avgTime || 0,
  };
}

export async function getUserAnalytics(startDate: Date, endDate: Date) {
  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const [newUsers, totalUsers, usersWithOrders] = await Promise.all([
    User.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    User.countDocuments({ role: "user" }),
    Order.aggregate([
      { $group: { _id: "$userId" } },
      { $count: "count" },
    ]),
  ]);

  return {
    newUsers,
    totalUsers,
    usersWithOrders: usersWithOrders[0]?.count || 0,
  };
}

export async function getProductAnalytics(startDate: Date, endDate: Date) {
  const matchStage = {
    createdAt: { $gte: startDate, $lte: endDate },
    status: "paid",
  };

  const [topSelling, categoryPerformance] = await Promise.all([
    Order.aggregate([
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          title: { $first: "$items.title" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          quantity: { $sum: "$items.quantity" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 10 },
    ]),
    Product.aggregate([
      {
        $lookup: {
          from: "orders",
          let: { productId: "$_id" },
          pipeline: [
            { $unwind: "$items" },
            {
              $match: {
                $expr: { $eq: ["$items.productId", "$$productId"] },
              },
            },
          ],
          as: "orders",
        },
      },
      {
        $project: {
          title: 1,
          category: 1,
          orderCount: { $size: "$orders" },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]),
  ]);

  return {
    topSelling,
    categoryPerformance,
  };
}
