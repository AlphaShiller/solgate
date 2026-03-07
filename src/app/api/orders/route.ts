import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ORDERS_FILE = path.join(process.cwd(), "data", "orders.json");

function ensureDataDir() {
  const dir = path.dirname(ORDERS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]");
}

function getOrders() {
  ensureDataDir();
  return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf-8"));
}

function saveOrders(orders: unknown[]) {
  ensureDataDir();
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

export async function GET() {
  const orders = getOrders();
  return NextResponse.json({ orders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, shipping, email, paymentMethod } = body;

    if (!items?.length || !shipping?.name || !shipping?.address || !shipping?.city || !shipping?.state || !shipping?.zip || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      items,
      shipping,
      email,
      paymentMethod: paymentMethod || "card",
      total: items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0),
      status: "confirmed",
      labelGenerated: false,
      createdAt: new Date().toISOString(),
    };

    const orders = getOrders();
    orders.push(order);
    saveOrders(orders);

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
