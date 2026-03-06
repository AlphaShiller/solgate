"use client";

import { useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const COLORS = {
  darkBg: "#0F0A1E",
  purple: "#9945FF",
  teal: "#14F195",
  cardBg: "#1A1333",
  lightText: "#B8B8D0",
  midGray: "#6B6B8D",
};

// Creator's wallet address (replace with your actual Solana wallet)
const CREATOR_WALLET = new PublicKey("11111111111111111111111111111111"); // placeholder — update with your wallet
const PLATFORM_FEE_WALLET = new PublicKey("11111111111111111111111111111111"); // platform treasury

const creators = [
  {
    id: 1,
    name: "History Adventures",
    avatar: "HA",
    bio: "Fun animated history videos for kids ages 5-12",
    subscribers: 2847,
    products: [
      { id: "p1", name: "Wright Brothers Video + Worksheet", price: 0, priceSol: 0, type: "free", description: "8-min animated video with printable worksheet" },
      { id: "p2", name: "Complete History Bundle", price: 19.99, priceSol: 0.15, type: "one-time", description: "All 7 videos, worksheets, coloring book, flash cards" },
      { id: "p3", name: "Weekly New Videos", price: 12.42, priceSol: 0.09, type: "monthly", description: "New animated history video every week + all materials" },
    ],
    tiers: [
      { name: "Explorer", price: 4.99, priceSol: 0.04, perks: ["Access to all 7 videos", "Printable worksheets"] },
      { name: "Scholar", price: 9.99, priceSol: 0.07, perks: ["Everything in Explorer", "Coloring book", "Flash cards", "Study guides"] },
      { name: "VIP Learner", price: 12.42, priceSol: 0.09, perks: ["Everything in Scholar", "New videos weekly", "Priority requests", "Community access"] },
    ],
  },
];

interface Product {
  id?: string;
  name: string;
  price: number;
  priceSol?: number;
  type: string;
  description?: string;
}

interface Tier {
  name: string;
  price: number;
  priceSol: number;
  perks: string[];
}

function WalletButton() {
  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-mono"
          style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}
        >
          {shortAddress}
        </div>
        <button
          onClick={disconnect}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border cursor-pointer"
          style={{ borderColor: "#FF4444", color: "#FF4444" }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium border cursor-pointer transition-all hover:bg-purple-900"
      style={{ borderColor: COLORS.purple, color: COLORS.purple }}
    >
      Connect Wallet
    </button>
  );
}

function BlinkButton({ product, onPurchase }: { product: Product; onPurchase: (p: Product, sig?: string) => void }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "signing" | "confirming" | "success" | "error">("idle");
  const [txSignature, setTxSignature] = useState<string>("");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  const handleClick = useCallback(async () => {
    // Free products don't need wallet
    if (product.price === 0) {
      onPurchase(product);
      return;
    }

    // If wallet not connected, open modal
    if (!connected || !publicKey) {
      setVisible(true);
      return;
    }

    try {
      setStatus("signing");

      const solAmount = product.priceSol || 0.01;
      const totalLamports = Math.round(solAmount * LAMPORTS_PER_SOL);
      const platformFee = Math.round(totalLamports * 0.02); // 2% fee
      const creatorAmount = totalLamports - platformFee;

      // Build transaction with two transfers: creator gets 98%, platform gets 2%
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: CREATOR_WALLET,
          lamports: creatorAmount,
        }),
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PLATFORM_FEE_WALLET,
          lamports: platformFee,
        })
      );

      setStatus("confirming");

      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed");

      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      setTxSignature(signature);
      setStatus("success");
      onPurchase(product, signature);

      setTimeout(() => {
        setStatus("idle");
        setTxSignature("");
      }, 5000);
    } catch (err: unknown) {
      console.error("Transaction error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [product, connected, publicKey, sendTransaction, connection, onPurchase, setVisible]);

  const labels = {
    idle: !connected && product.price > 0
      ? "Connect Wallet to Pay"
      : product.price === 0
        ? "Free Download"
        : `Pay ${product.priceSol || "0.01"} SOL`,
    connecting: "Connecting Wallet...",
    signing: "Approve in Wallet...",
    confirming: "Confirming on Solana...",
    success: "Access Granted!",
    error: "Transaction Failed — Try Again",
  };

  const bgColors = {
    idle: product.price === 0 ? COLORS.teal : COLORS.purple,
    connecting: "#6B21A8",
    signing: "#7C3AED",
    confirming: "#0D9488",
    success: COLORS.teal,
    error: "#DC2626",
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={status !== "idle" && status !== "error"}
        className="w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-300 cursor-pointer disabled:cursor-wait"
        style={{
          backgroundColor: bgColors[status],
          color: status === "idle" && product.price === 0 ? "#0F0A1E" : "#FFFFFF",
          opacity: status !== "idle" && status !== "error" ? 0.9 : 1,
        }}
      >
        {status === "confirming" && <span className="inline-block animate-spin-slow mr-2">&#10227;</span>}
        {status === "success" && <span className="mr-2">&#10003;</span>}
        {labels[status]}
      </button>
      {txSignature && (
        <a
          href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs mt-2 text-center underline"
          style={{ color: COLORS.teal }}
        >
          View on Solana Explorer
        </a>
      )}
    </div>
  );
}

function ProductCard({ product, onPurchase }: { product: Product; onPurchase: (p: Product, sig?: string) => void }) {
  return (
    <div
      className="rounded-xl p-5 border transition-all hover:border-purple-500"
      style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-bold text-base">{product.name}</h3>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2"
          style={{
            backgroundColor: product.type === "free" ? "#0D3B2E" : "#2D1B69",
            color: product.type === "free" ? COLORS.teal : "#C4B5FD",
          }}
        >
          {product.type === "free" ? "FREE" : product.type === "one-time" ? "ONE-TIME" : "MONTHLY"}
        </span>
      </div>
      <p className="text-sm mb-1" style={{ color: COLORS.lightText }}>{product.description}</p>
      {product.priceSol && product.priceSol > 0 ? (
        <p className="text-xs mb-3" style={{ color: COLORS.midGray }}>
          ~${product.price} USD ({product.priceSol} SOL)
        </p>
      ) : (
        <div className="mb-3" />
      )}
      <BlinkButton product={product} onPurchase={onPurchase} />
    </div>
  );
}

function TierCard({ tier, featured }: { tier: Tier; featured: boolean }) {
  return (
    <div
      className="rounded-xl p-5 border relative"
      style={{
        backgroundColor: featured ? "#1E1245" : COLORS.cardBg,
        borderColor: featured ? COLORS.purple : "#2D2550",
      }}
    >
      {featured && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
          style={{ backgroundColor: COLORS.purple, color: "white" }}
        >
          MOST POPULAR
        </div>
      )}
      <h3 className="text-white font-bold text-lg mb-1">{tier.name}</h3>
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-black" style={{ color: COLORS.teal }}>${tier.price}</span>
        <span className="text-sm" style={{ color: COLORS.midGray }}>/month</span>
      </div>
      <p className="text-xs mb-4" style={{ color: COLORS.midGray }}>{tier.priceSol} SOL/month</p>
      <ul className="space-y-2 mb-5">
        {tier.perks.map((perk, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: COLORS.lightText }}>
            <span style={{ color: COLORS.teal }}>&#10003;</span>
            {perk}
          </li>
        ))}
      </ul>
      <BlinkButton
        product={{ name: tier.name, price: tier.price, priceSol: tier.priceSol, type: "monthly" }}
        onPurchase={() => {}}
      />
    </div>
  );
}

function CreatorDashboard() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [revenue] = useState({ today: 847.23, month: 12483.91, subscribers: 2847 });
  const [blinkUrl, setBlinkUrl] = useState("");
  const [airdropStatus, setAirdropStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const generateBlink = () => {
    setBlinkUrl("solgate.io/pay/history-adventures/complete-bundle");
  };

  // Fetch balance when wallet is connected
  const fetchBalance = useCallback(async () => {
    if (publicKey) {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    }
  }, [publicKey, connection]);

  // Request devnet airdrop for testing
  const requestAirdrop = useCallback(async () => {
    if (!publicKey) return;
    setAirdropStatus("loading");
    try {
      const sig = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      setAirdropStatus("success");
      fetchBalance();
      setTimeout(() => setAirdropStatus("idle"), 3000);
    } catch {
      setAirdropStatus("error");
      setTimeout(() => setAirdropStatus("idle"), 3000);
    }
  }, [publicKey, connection, fetchBalance]);

  // Fetch balance on mount
  useState(() => {
    if (connected) fetchBalance();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-white">Creator Dashboard</h2>

      {/* Wallet info */}
      {connected && publicKey && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "#0D3B2E", borderColor: COLORS.teal }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Connected Wallet</p>
              <p className="text-sm font-mono" style={{ color: COLORS.teal }}>{publicKey.toBase58()}</p>
              {balance !== null && (
                <p className="text-xs mt-1" style={{ color: COLORS.lightText }}>Balance: {balance.toFixed(4)} SOL</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchBalance}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                style={{ backgroundColor: "#1A1333", color: COLORS.teal, border: "1px solid #2D2550" }}
              >
                Refresh Balance
              </button>
              <button
                onClick={requestAirdrop}
                disabled={airdropStatus === "loading"}
                className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: COLORS.purple, color: "white" }}
              >
                {airdropStatus === "loading" ? "Airdropping..." : airdropStatus === "success" ? "2 SOL Added!" : "Airdrop 2 SOL (Devnet)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!connected && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "#2D1B3D", borderColor: COLORS.purple }}>
          <p className="text-sm" style={{ color: COLORS.lightText }}>
            Connect your wallet to see your real balance and manage your creator account.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Revenue", value: `$${revenue.today}`, color: COLORS.teal },
          { label: "Monthly Revenue", value: `$${revenue.month.toLocaleString()}`, color: COLORS.purple },
          { label: "Active Subscribers", value: revenue.subscribers.toLocaleString(), color: COLORS.teal },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: COLORS.cardBg }}>
            <div className="text-3xl font-black mb-1" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-xs" style={{ color: COLORS.midGray }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-5" style={{ backgroundColor: COLORS.cardBg }}>
        <h3 className="text-white font-bold mb-3">Blink Generator</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            className="flex-1 rounded-lg px-3 py-2 text-sm"
            style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
          >
            <option>Complete History Bundle — 0.15 SOL</option>
            <option>Weekly New Videos — 0.09 SOL/mo</option>
            <option>Scholar Tier — 0.07 SOL/mo</option>
          </select>
          <button
            onClick={generateBlink}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-white cursor-pointer"
            style={{ backgroundColor: COLORS.purple }}
          >
            Generate Blink
          </button>
        </div>
        {blinkUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "#150F28", border: "1px solid #2D2550" }}>
            <span className="text-sm flex-1 font-mono" style={{ color: COLORS.teal }}>{blinkUrl}</span>
            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}>Copied!</span>
          </div>
        )}
      </div>

      <div className="rounded-xl p-5" style={{ backgroundColor: COLORS.cardBg }}>
        <h3 className="text-white font-bold mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {[
            { wallet: "7xKp...3mNv", product: "Complete Bundle", amount: "+0.15 SOL", time: "2 min ago" },
            { wallet: "9aRf...8yLp", product: "VIP Learner Tier", amount: "+0.09 SOL", time: "18 min ago" },
            { wallet: "3bNw...5kQz", product: "Scholar Tier", amount: "+0.07 SOL", time: "1 hr ago" },
            { wallet: "5dTx...2jMr", product: "Complete Bundle", amount: "+0.15 SOL", time: "3 hrs ago" },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: "#2D2550" }}>
              <div>
                <span className="text-sm font-mono text-white">{tx.wallet}</span>
                <span className="text-xs ml-2" style={{ color: COLORS.midGray }}>{tx.product}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold" style={{ color: COLORS.teal }}>{tx.amount}</span>
                <span className="text-xs ml-2" style={{ color: COLORS.midGray }}>{tx.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SolGateApp() {
  const [view, setView] = useState<"storefront" | "dashboard">("storefront");
  const [purchases, setPurchases] = useState<{ id: string; signature?: string }[]>([]);
  const creator = creators[0];

  const handlePurchase = (product: Product, signature?: string) => {
    if (product.id) {
      setPurchases((prev) => [...prev, { id: product.id!, signature }]);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.darkBg }}>
      {/* Nav */}
      <nav className="border-b px-4 sm:px-6 py-3 flex items-center justify-between" style={{ borderColor: "#2D2550" }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ backgroundColor: COLORS.purple, color: "white" }}>SG</div>
          <span className="text-white font-bold text-lg">SolGate</span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-1 hidden sm:inline" style={{ backgroundColor: "#2D1B69", color: "#C4B5FD" }}>DEVNET</span>
        </div>
        <div className="flex gap-1">
          {(["storefront", "dashboard"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{
                backgroundColor: view === v ? COLORS.purple : "transparent",
                color: view === v ? "white" : COLORS.lightText,
              }}
            >
              {v === "storefront" ? "Storefront" : "Dashboard"}
            </button>
          ))}
        </div>
        <WalletButton />
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {view === "storefront" ? (
          <div className="space-y-8">
            {/* Devnet banner */}
            <div className="rounded-lg p-3 text-center text-xs" style={{ backgroundColor: "#2D1B69", color: "#C4B5FD" }}>
              You are on <strong>Solana Devnet</strong> — all transactions use test SOL. Use the Dashboard to airdrop free test SOL.
            </div>

            {/* Creator header */}
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black shrink-0"
                style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.teal})`, color: "white" }}
              >
                {creator.avatar}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{creator.name}</h1>
                <p className="text-sm" style={{ color: COLORS.lightText }}>{creator.bio}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.midGray }}>{creator.subscribers.toLocaleString()} subscribers</p>
              </div>
            </div>

            {/* Products */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Products & Downloads</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creator.products.map((product) => (
                  <ProductCard key={product.id} product={product} onPurchase={handlePurchase} />
                ))}
              </div>
            </div>

            {/* Membership tiers */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Membership Tiers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creator.tiers.map((tier, i) => (
                  <TierCard key={i} tier={tier} featured={i === 1} />
                ))}
              </div>
            </div>

            {/* Purchase confirmations */}
            {purchases.length > 0 && (
              <div className="rounded-xl p-4 border space-y-2" style={{ backgroundColor: "#0D3B2E", borderColor: COLORS.teal }}>
                <p className="text-sm font-medium" style={{ color: COLORS.teal }}>
                  &#10003; {purchases.length} item(s) unlocked! Content is now accessible in your wallet.
                </p>
                {purchases.filter(p => p.signature).map((p, i) => (
                  <a
                    key={i}
                    href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs underline"
                    style={{ color: COLORS.teal }}
                  >
                    Transaction: {p.signature?.slice(0, 20)}...
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <CreatorDashboard />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t px-6 py-4 text-center" style={{ borderColor: "#2D2550" }}>
        <p className="text-xs" style={{ color: COLORS.midGray }}>
          SolGate — Creator Paywall & Membership Platform on Solana | Near-zero fees. Instant payouts. | Devnet
        </p>
      </footer>
    </div>
  );
}
