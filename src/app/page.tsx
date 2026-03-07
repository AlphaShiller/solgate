"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useSearchParams } from "next/navigation";
import { WalletModal, WalletModalButton, useWalletModal } from "@/components/WalletModal";
import PostFeed from "@/components/PostFeed";
import CreatePostForm from "@/components/CreatePostForm";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { COLORS } from "@/utils/colors";
import { Post, TierName } from "@/types";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// Creator's wallet address (your Phantom devnet wallet)
const CREATOR_WALLET = new PublicKey("5rnPZyuzwWYaHz3RgH8ZfTdSX4sjaCHPBWbXxpA4wkMX");
const PLATFORM_FEE_WALLET = new PublicKey("5rnPZyuzwWYaHz3RgH8ZfTdSX4sjaCHPBWbXxpA4wkMX");

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

// --- Sample Posts ---
const INITIAL_POSTS: Post[] = [
  {
    id: "post1",
    creatorId: 1,
    title: "Welcome! Here's a Free Preview of Our Wright Brothers Episode",
    body: "Hey everyone! I'm so excited to launch History Adventures on SolGate. To celebrate, here's a sneak peek at our Wright Brothers episode. Watch the full 8-minute animated video and let me know what you think in the community. More episodes coming every week!",
    tier: "free",
    videoUrl: "https://www.youtube.com/watch?v=Oy2XJjKkjWE",
    createdAt: "2026-03-06T10:00:00Z",
    likes: 312,
  },
  {
    id: "post2",
    creatorId: 1,
    title: "New Episode: Ancient Egypt — Building the Pyramids",
    body: "This week's episode takes kids on a journey to Ancient Egypt! We break down how the pyramids were built using simple explanations and fun animations. Perfect for ages 5-12. Includes a downloadable coloring page of the Great Sphinx.",
    tier: "free",
    videoUrl: "https://www.youtube.com/watch?v=lotbZQ55SgI",
    createdAt: "2026-03-05T14:30:00Z",
    likes: 189,
  },
  {
    id: "post3",
    creatorId: 1,
    title: "Explorer Exclusive: Behind the Scenes — How We Animate History",
    body: "Ever wonder how we turn real historical events into kid-friendly animations? In this exclusive post, I walk you through our entire process — from research to storyboarding to final animation. Plus a time-lapse of the Roman Empire episode being drawn!",
    tier: "Explorer",
    videoUrl: "https://www.youtube.com/watch?v=NMo3nZHVrZ4",
    createdAt: "2026-03-04T09:15:00Z",
    likes: 87,
  },
  {
    id: "post4",
    creatorId: 1,
    title: "Scholar Deep Dive: The Real Story Behind the Boston Tea Party",
    body: "Most textbooks get this wrong. The Boston Tea Party wasn't just about tea taxes — it was about corporate monopolies, smuggling networks, and political theater. In this Scholar-exclusive video, we go deep into the real motivations and the characters involved. Includes a printable timeline worksheet and discussion questions for homeschool families.",
    tier: "Scholar",
    videoUrl: "https://www.youtube.com/watch?v=rETaldaGBOA",
    createdAt: "2026-03-03T16:45:00Z",
    likes: 64,
  },
  {
    id: "post5",
    creatorId: 1,
    title: "Scholar Resource Pack: February History Flash Cards",
    body: "Your monthly flash card pack is here! This set covers: the Wright Brothers, Ancient Egypt, the Roman Empire, and the American Revolution. 48 cards total with questions on front, answers + fun facts on back. Print double-sided on cardstock for best results.",
    tier: "Scholar",
    createdAt: "2026-03-02T11:00:00Z",
    likes: 45,
  },
  {
    id: "post6",
    creatorId: 1,
    title: "VIP First Look: Next Month's Episodes + Vote on Topics!",
    body: "VIP Learners, you get first access! Here are the 4 episodes we're planning for April. But here's the fun part — YOU get to vote on which one we release first. Options: 1) Samurai Warriors of Japan, 2) The Vikings, 3) Cleopatra's Egypt, 4) The Silk Road. Drop your vote and I'll announce the winner next week. Also includes an early draft of the Samurai storyboard!",
    tier: "VIP Learner",
    videoUrl: "https://www.youtube.com/watch?v=TnGl01FkMMo",
    createdAt: "2026-03-01T08:00:00Z",
    likes: 38,
  },
];

const creators = [
  {
    id: 1,
    name: "History Adventures",
    avatar: "HA",
    bio: "Fun animated history videos for kids ages 5-12",
    subscribers: 2847,
    products: [
      { id: "p1", name: "Wright Brothers Video + Worksheet", price: 0, priceSol: 0, type: "free" as const, description: "8-min animated video with printable worksheet" },
      { id: "p2", name: "Complete History Bundle", price: 19.99, priceSol: 0.15, type: "one-time" as const, description: "All 7 videos, worksheets, coloring book, flash cards" },
      { id: "p3", name: "Weekly New Videos", price: 12.42, priceSol: 0.09, type: "monthly" as const, description: "New animated history video every week + all materials" },
    ],
    tiers: [
      { name: "Explorer", price: 4.99, priceSol: 0.04, perks: ["Access to all 7 videos", "Printable worksheets"] },
      { name: "Scholar", price: 9.99, priceSol: 0.07, perks: ["Everything in Explorer", "Coloring book", "Flash cards", "Study guides"] },
      { name: "VIP Learner", price: 12.42, priceSol: 0.09, perks: ["Everything in Scholar", "New videos weekly", "Priority requests", "Community access"] },
    ],
  },
];

// --- Videos ---
interface Video {
  id: string;
  title: string;
  youtubeId: string;
  featured?: boolean;
}

const VIDEOS: Video[] = [
  { id: "v1", title: "Thomas Edison: The Boy Who Never Gave Up", youtubeId: "VneG4el6u-0", featured: true },
  { id: "v2", title: "William Shakespeare for Kids: The Boy Who Created 1,700 Words", youtubeId: "IPRtomB2XjM" },
  { id: "v3", title: "Steamboats on the Mississippi River!", youtubeId: "1zxoOKK3a8k" },
  { id: "v4", title: "Industrial Revolution Kids Version", youtubeId: "mVKfxz8iwQ4" },
  { id: "v5", title: "Albert Einstein for Kids: The Power of Curiosity", youtubeId: "HsDdHMPIC5s" },
  { id: "v6", title: "The Titanic Story for Kids: Safety and Respect", youtubeId: "KrEHiIblWuo" },
];

// --- Merchandise ---
interface MerchItem {
  id: string;
  name: string;
  price: number;
  priceSol: number;
  category: "apparel" | "educational";
  description: string;
  emoji: string;
  sizes?: string[];
}

const MERCH: MerchItem[] = [
  { id: "m1", name: "History Adventures T-Shirt", price: 24.99, priceSol: 0.18, category: "apparel", description: "Soft cotton tee with History Adventures logo", emoji: "👕", sizes: ["Youth S", "Youth M", "Youth L", "Adult S", "Adult M", "Adult L", "Adult XL"] },
  { id: "m2", name: "Explorer Hoodie", price: 39.99, priceSol: 0.29, category: "apparel", description: "Cozy pullover hoodie — perfect for young explorers", emoji: "🧥", sizes: ["Youth S", "Youth M", "Youth L", "Adult S", "Adult M", "Adult L"] },
  { id: "m3", name: "Time Traveler Cap", price: 18.99, priceSol: 0.14, category: "apparel", description: "Adjustable cap with embroidered compass logo", emoji: "🧢" },
  { id: "m4", name: "History Flash Card Super Pack", price: 14.99, priceSol: 0.11, category: "educational", description: "200 flash cards covering 10 history topics with fun facts", emoji: "🃏" },
  { id: "m5", name: "World History Poster Set", price: 19.99, priceSol: 0.15, category: "educational", description: "5 large posters: Pyramids, Rome, Renaissance, Revolution, Space", emoji: "🗺️" },
  { id: "m6", name: "History Adventures Workbook", price: 12.99, priceSol: 0.10, category: "educational", description: "48-page activity workbook with puzzles, timelines & coloring", emoji: "📓" },
  { id: "m7", name: "Ancient Civilizations Coloring Book", price: 9.99, priceSol: 0.07, category: "educational", description: "30 detailed illustrations from Egypt, Greece, Rome & more", emoji: "🎨" },
  { id: "m8", name: "History Adventures Tote Bag", price: 15.99, priceSol: 0.12, category: "apparel", description: "Canvas tote with timeline print — carry your books in style", emoji: "👜" },
];

// --- Components ---

function BlinkButton({ product, onPurchase, openWalletModal }: { product: Product; onPurchase: (p: Product, sig?: string) => void; openWalletModal: () => void }) {
  const [status, setStatus] = useState<"idle" | "connecting" | "signing" | "confirming" | "success" | "error">("idle");
  const [txSignature, setTxSignature] = useState<string>("");
  const { publicKey, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();

  const handleClick = useCallback(async () => {
    if (product.price === 0) {
      onPurchase(product);
      return;
    }
    if (!connected || !publicKey) {
      openWalletModal();
      return;
    }
    try {
      setStatus("signing");
      const solAmount = product.priceSol || 0.01;
      const totalLamports = Math.round(solAmount * LAMPORTS_PER_SOL);
      const platformFee = Math.round(totalLamports * 0.02);
      const creatorAmount = totalLamports - platformFee;

      const transaction = new Transaction().add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: CREATOR_WALLET, lamports: creatorAmount }),
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: PLATFORM_FEE_WALLET, lamports: platformFee })
      );

      setStatus("confirming");
      const signature = await sendTransaction(transaction, connection);
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) throw new Error("Transaction failed");

      setTxSignature(signature);
      setStatus("success");
      onPurchase(product, signature);
      setTimeout(() => { setStatus("idle"); setTxSignature(""); }, 5000);
    } catch (err: unknown) {
      console.error("Transaction error:", err);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [product, connected, publicKey, sendTransaction, connection, onPurchase, openWalletModal]);

  const labels = {
    idle: !connected && product.price > 0 ? "Connect Wallet to Pay" : product.price === 0 ? "Free Download" : `Pay ${product.priceSol || "0.01"} SOL`,
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
        style={{ backgroundColor: bgColors[status], color: status === "idle" && product.price === 0 ? "#0F0A1E" : "#FFFFFF", opacity: status !== "idle" && status !== "error" ? 0.9 : 1 }}
      >
        {status === "confirming" && <span className="inline-block animate-spin-slow mr-2">&#10227;</span>}
        {status === "success" && <span className="mr-2">&#10003;</span>}
        {labels[status]}
      </button>
      {txSignature && (
        <a href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="block text-xs mt-2 text-center underline" style={{ color: COLORS.teal }}>
          View on Solana Explorer
        </a>
      )}
    </div>
  );
}

function StripeCheckoutButton({ tierName, price }: { tierName: string; price: number }) {
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStripeCheckout = async () => {
    if (!email.includes("@")) { setError("Enter a valid email"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierName, email }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Checkout failed";
      setError(msg);
      setLoading(false);
    }
  };

  if (!showEmail) {
    return (
      <button
        onClick={() => setShowEmail(true)}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:opacity-90"
        style={{ backgroundColor: "#635BFF", color: "#FFFFFF" }}
      >
        Pay with Card — ${price.toFixed(2)}/mo
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
      />
      <button
        onClick={handleStripeCheckout}
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-white cursor-pointer disabled:opacity-50"
        style={{ backgroundColor: "#635BFF" }}
      >
        {loading ? "Redirecting to Stripe..." : `Checkout — $${price.toFixed(2)}/mo`}
      </button>
      <button
        onClick={() => setShowEmail(false)}
        className="w-full text-xs cursor-pointer"
        style={{ color: COLORS.midGray }}
      >
        Cancel
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function ProductCard({ product, onPurchase, openWalletModal }: { product: Product; onPurchase: (p: Product, sig?: string) => void; openWalletModal: () => void }) {
  return (
    <div className="rounded-xl p-5 border transition-all hover:border-purple-500" style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-white font-bold text-base">{product.name}</h3>
        <span className="text-xs px-2 py-1 rounded-full font-medium shrink-0 ml-2" style={{ backgroundColor: product.type === "free" ? "#0D3B2E" : "#2D1B69", color: product.type === "free" ? COLORS.teal : "#C4B5FD" }}>
          {product.type === "free" ? "FREE" : product.type === "one-time" ? "ONE-TIME" : "MONTHLY"}
        </span>
      </div>
      <p className="text-sm mb-1" style={{ color: COLORS.lightText }}>{product.description}</p>
      {product.priceSol && product.priceSol > 0 ? (
        <p className="text-xs mb-3" style={{ color: COLORS.midGray }}>~${product.price} USD ({product.priceSol} SOL)</p>
      ) : (
        <div className="mb-3" />
      )}
      {product.price > 0 ? (
        <div className="space-y-2">
          <StripeCheckoutButton tierName={product.name} price={product.price} />
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: "#2D2550" }} />
            <span className="text-xs" style={{ color: COLORS.midGray }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#2D2550" }} />
          </div>
          <BlinkButton product={product} onPurchase={onPurchase} openWalletModal={openWalletModal} />
        </div>
      ) : (
        <BlinkButton product={product} onPurchase={onPurchase} openWalletModal={openWalletModal} />
      )}
    </div>
  );
}

function TierCard({ tier, featured, openWalletModal, onSubscribed, isSubscribed }: { tier: Tier; featured: boolean; openWalletModal: () => void; onSubscribed: (tierName: TierName, sig: string) => void; isSubscribed: boolean }) {
  return (
    <div className="rounded-xl p-5 border relative" style={{ backgroundColor: featured ? "#1E1245" : COLORS.cardBg, borderColor: featured ? COLORS.purple : "#2D2550" }}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: COLORS.purple, color: "white" }}>MOST POPULAR</div>
      )}
      {isSubscribed && (
        <div className="absolute -top-3 right-4 text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}>SUBSCRIBED</div>
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
      {isSubscribed ? (
        <div className="w-full py-3 px-4 rounded-lg font-semibold text-sm text-center" style={{ backgroundColor: "#0D3B2E", color: COLORS.teal }}>
          &#10003; Subscribed
        </div>
      ) : (
        <div className="space-y-2">
          <StripeCheckoutButton tierName={tier.name} price={tier.price} />
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px" style={{ backgroundColor: "#2D2550" }} />
            <span className="text-xs" style={{ color: COLORS.midGray }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: "#2D2550" }} />
          </div>
          <BlinkButton
            product={{ name: tier.name, price: tier.price, priceSol: tier.priceSol, type: "monthly" }}
            onPurchase={(_, sig) => { if (sig) onSubscribed(tier.name as TierName, sig); }}
            openWalletModal={openWalletModal}
          />
        </div>
      )}
    </div>
  );
}

function CreatorDashboard({ onPostCreated }: { onPostCreated: (post: Post) => void }) {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [revenue] = useState({ today: 847.23, month: 12483.91, subscribers: 2847 });
  const [blinkUrl, setBlinkUrl] = useState("");
  const [airdropStatus, setAirdropStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const generateBlink = () => { setBlinkUrl("solgate.io/pay/history-adventures/complete-bundle"); };

  const fetchBalance = useCallback(async () => {
    if (publicKey) {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    }
  }, [publicKey, connection]);

  const requestAirdrop = useCallback(async () => {
    if (!publicKey) return;
    setAirdropStatus("loading");
    try {
      const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig, "confirmed");
      setAirdropStatus("success");
      fetchBalance();
      setTimeout(() => setAirdropStatus("idle"), 5000);
    } catch (err) {
      console.error("Airdrop failed:", err);
      setAirdropStatus("error");
      setTimeout(() => setAirdropStatus("idle"), 5000);
    }
  }, [publicKey, connection, fetchBalance]);

  useEffect(() => {
    if (connected && publicKey) fetchBalance();
  }, [connected, publicKey, fetchBalance]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-white">Creator Dashboard</h2>

      {connected && publicKey && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "#0D3B2E", borderColor: COLORS.teal }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs" style={{ color: COLORS.midGray }}>Connected Wallet</p>
              <p className="text-sm font-mono" style={{ color: COLORS.teal }}>{publicKey.toBase58()}</p>
              {balance !== null && <p className="text-xs mt-1" style={{ color: COLORS.lightText }}>Balance: {balance.toFixed(4)} SOL</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={fetchBalance} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer" style={{ backgroundColor: "#1A1333", color: COLORS.teal, border: "1px solid #2D2550" }}>Refresh Balance</button>
              <button onClick={requestAirdrop} disabled={airdropStatus === "loading"} className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50" style={{ backgroundColor: COLORS.purple, color: "white" }}>
                {airdropStatus === "loading" ? "Airdropping..." : airdropStatus === "success" ? "1 SOL Added!" : airdropStatus === "error" ? "Rate Limited" : "Airdrop 1 SOL"}
              </button>
              <a href={`https://faucet.solana.com/?address=${publicKey.toBase58()}&cluster=devnet`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer inline-flex items-center" style={{ backgroundColor: "#1A1333", color: COLORS.lightText, border: "1px solid #2D2550" }}>Web Faucet ↗</a>
            </div>
          </div>
        </div>
      )}

      {!connected && (
        <div className="rounded-xl p-4 border" style={{ backgroundColor: "#2D1B3D", borderColor: COLORS.purple }}>
          <p className="text-sm" style={{ color: COLORS.lightText }}>Connect your wallet to see your real balance and manage your creator account.</p>
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

      {/* Create Post Form */}
      <CreatePostForm creatorId={1} onPostCreated={onPostCreated} />

      <div className="rounded-xl p-5" style={{ backgroundColor: COLORS.cardBg }}>
        <h3 className="text-white font-bold mb-3">Blink Generator</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}>
            <option>Complete History Bundle — 0.15 SOL</option>
            <option>Weekly New Videos — 0.09 SOL/mo</option>
            <option>Scholar Tier — 0.07 SOL/mo</option>
          </select>
          <button onClick={generateBlink} className="px-5 py-2 rounded-lg font-semibold text-sm text-white cursor-pointer" style={{ backgroundColor: COLORS.purple }}>Generate Blink</button>
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

// --- Merch Card ---
function MerchCard({ item, onAddToCart }: { item: MerchItem; onAddToCart: (item: MerchItem, size?: string) => void }) {
  const [selectedSize, setSelectedSize] = useState(item.sizes?.[2] || "");

  return (
    <div className="rounded-xl p-4 border transition-all hover:border-purple-500" style={{ backgroundColor: COLORS.cardBg, borderColor: "#2D2550" }}>
      <div className="text-4xl mb-3 text-center py-4 rounded-lg" style={{ backgroundColor: "#150F28" }}>{item.emoji}</div>
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-white font-bold text-sm leading-tight">{item.name}</h3>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-2" style={{ backgroundColor: item.category === "apparel" ? "#2D1B69" : "#0D3B2E", color: item.category === "apparel" ? "#C4B5FD" : COLORS.teal }}>
          {item.category === "apparel" ? "APPAREL" : "EDUCATIONAL"}
        </span>
      </div>
      <p className="text-xs mb-2" style={{ color: COLORS.lightText }}>{item.description}</p>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-black" style={{ color: COLORS.teal }}>${item.price}</span>
        <span className="text-xs" style={{ color: COLORS.midGray }}>{item.priceSol} SOL</span>
      </div>
      {item.sizes && (
        <select
          value={selectedSize}
          onChange={(e) => setSelectedSize(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm mb-3 outline-none"
          style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
        >
          {item.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      )}
      <button
        onClick={() => onAddToCart(item, selectedSize || undefined)}
        className="w-full py-2.5 rounded-lg font-semibold text-sm cursor-pointer transition-all hover:opacity-90"
        style={{ backgroundColor: COLORS.purple, color: "white" }}
      >
        Add to Cart
      </button>
    </div>
  );
}

// --- Order / Cart Modal ---
interface CartItem {
  merch: MerchItem;
  size?: string;
  quantity: number;
}

function OrderModal({ cart, onClose, onRemove, onUpdateQty, onOrderComplete }: {
  cart: CartItem[];
  onClose: () => void;
  onRemove: (idx: number) => void;
  onUpdateQty: (idx: number, qty: number) => void;
  onOrderComplete: () => void;
}) {
  const [step, setStep] = useState<"cart" | "shipping" | "confirm">("cart");
  const [shipping, setShipping] = useState({ name: "", address: "", city: "", state: "", zip: "", email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ id: string } | null>(null);
  const [error, setError] = useState("");

  const total = cart.reduce((sum, item) => sum + item.merch.price * item.quantity, 0);
  const shippingCost = total >= 50 ? 0 : 5.99;

  const handleSubmit = async () => {
    if (!shipping.name || !shipping.address || !shipping.city || !shipping.state || !shipping.zip || !shipping.email) {
      setError("Please fill in all fields");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ name: c.merch.name, price: c.merch.price, quantity: c.quantity, size: c.size, merchId: c.merch.id })),
          shipping: { name: shipping.name, address: shipping.address, city: shipping.city, state: shipping.state, zip: shipping.zip },
          email: shipping.email,
          paymentMethod: "card",
        }),
      });
      const data = await res.json();
      if (data.order) {
        setOrderResult(data.order);
        setStep("confirm");
        onOrderComplete();
      } else {
        throw new Error(data.error || "Order failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: COLORS.cardBg, border: "1px solid #2D2550" }} onClick={(e) => e.stopPropagation()}>
        {step === "cart" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-white">Your Cart ({cart.length})</h2>
              <button onClick={onClose} className="text-2xl cursor-pointer" style={{ color: COLORS.midGray }}>&times;</button>
            </div>
            {cart.length === 0 ? (
              <p className="text-center py-8" style={{ color: COLORS.midGray }}>Your cart is empty</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#150F28" }}>
                      <span className="text-2xl">{item.merch.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white">{item.merch.name}</p>
                        {item.size && <p className="text-xs" style={{ color: COLORS.midGray }}>Size: {item.size}</p>}
                        <p className="text-sm font-bold" style={{ color: COLORS.teal }}>${(item.merch.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onUpdateQty(idx, Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded flex items-center justify-center cursor-pointer text-white text-sm" style={{ backgroundColor: "#2D2550" }}>-</button>
                        <span className="text-white text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => onUpdateQty(idx, item.quantity + 1)} className="w-7 h-7 rounded flex items-center justify-center cursor-pointer text-white text-sm" style={{ backgroundColor: "#2D2550" }}>+</button>
                      </div>
                      <button onClick={() => onRemove(idx)} className="text-red-400 text-xs cursor-pointer hover:text-red-300">Remove</button>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-3 space-y-1" style={{ borderColor: "#2D2550" }}>
                  <div className="flex justify-between text-sm" style={{ color: COLORS.lightText }}><span>Subtotal</span><span>${total.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm" style={{ color: COLORS.lightText }}><span>Shipping</span><span>{shippingCost === 0 ? <span style={{ color: COLORS.teal }}>FREE</span> : `$${shippingCost.toFixed(2)}`}</span></div>
                  {total < 50 && <p className="text-xs" style={{ color: COLORS.midGray }}>Free shipping on orders over $50!</p>}
                  <div className="flex justify-between text-lg font-black pt-2" style={{ color: "white" }}><span>Total</span><span style={{ color: COLORS.teal }}>${(total + shippingCost).toFixed(2)}</span></div>
                </div>
                <button onClick={() => setStep("shipping")} className="w-full mt-4 py-3 rounded-lg font-bold text-white cursor-pointer" style={{ backgroundColor: COLORS.purple }}>Proceed to Shipping</button>
              </>
            )}
          </>
        )}
        {step === "shipping" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-black text-white">Shipping Details</h2>
              <button onClick={() => setStep("cart")} className="text-sm cursor-pointer" style={{ color: COLORS.teal }}>← Back</button>
            </div>
            <div className="space-y-3">
              {[
                { key: "name", label: "Full Name", placeholder: "John Doe" },
                { key: "email", label: "Email", placeholder: "john@example.com" },
                { key: "address", label: "Street Address", placeholder: "123 Main St" },
                { key: "city", label: "City", placeholder: "Austin" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.lightText }}>{field.label}</label>
                  <input
                    type={field.key === "email" ? "email" : "text"}
                    placeholder={field.placeholder}
                    value={shipping[field.key as keyof typeof shipping]}
                    onChange={(e) => setShipping({ ...shipping, [field.key]: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.lightText }}>State</label>
                  <input placeholder="TX" value={shipping.state} onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: COLORS.lightText }}>ZIP Code</label>
                  <input placeholder="78701" value={shipping.zip} onChange={(e) => setShipping({ ...shipping, zip: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }} />
                </div>
              </div>
            </div>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: "#150F28" }}>
              <div className="flex justify-between text-sm font-bold text-white"><span>Order Total</span><span style={{ color: COLORS.teal }}>${(total + shippingCost).toFixed(2)}</span></div>
            </div>
            <button onClick={handleSubmit} disabled={submitting} className="w-full mt-4 py-3 rounded-lg font-bold text-white cursor-pointer disabled:opacity-50" style={{ backgroundColor: "#635BFF" }}>
              {submitting ? "Placing Order..." : `Pay $${(total + shippingCost).toFixed(2)} with Card`}
            </button>
          </>
        )}
        {step === "confirm" && orderResult && (
          <div className="text-center py-6">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-black text-white mb-2">Order Confirmed!</h2>
            <p className="text-sm mb-1" style={{ color: COLORS.lightText }}>Order ID: <span className="font-mono" style={{ color: COLORS.teal }}>{orderResult.id}</span></p>
            <p className="text-sm mb-4" style={{ color: COLORS.midGray }}>A confirmation email will be sent to your address. Your shipping label is being generated.</p>
            <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-bold text-white cursor-pointer" style={{ backgroundColor: COLORS.purple }}>Continue Shopping</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Newsletter Section ---
function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");

  const handleSubscribe = async () => {
    if (!email.includes("@")) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.alreadySubscribed) {
        setStatus("already");
      } else {
        setStatus("success");
        setEmail("");
        setName("");
      }
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="rounded-xl p-6 text-center" style={{ background: "linear-gradient(135deg, #1E1245, #0D3B2E)", border: "1px solid #2D2550" }}>
      <div className="text-3xl mb-2">📬</div>
      <h3 className="text-white font-bold text-lg mb-1">Stay in the Loop!</h3>
      <p className="text-sm mb-4" style={{ color: COLORS.lightText }}>Get new episode alerts, free resources, and exclusive history fun delivered to your inbox.</p>
      <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="text"
          placeholder="First name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2.5 rounded-lg text-sm outline-none sm:w-32"
          style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
        />
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          className="flex-1 px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ backgroundColor: "#150F28", color: COLORS.lightText, border: "1px solid #2D2550" }}
        />
        <button
          onClick={handleSubscribe}
          disabled={status === "loading"}
          className="px-5 py-2.5 rounded-lg font-bold text-sm text-white cursor-pointer disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: status === "success" ? COLORS.teal : status === "error" ? "#DC2626" : COLORS.purple, color: status === "success" ? "#0F0A1E" : "white" }}
        >
          {status === "loading" ? "Subscribing..." : status === "success" ? "Subscribed!" : status === "already" ? "Already Subscribed" : status === "error" ? "Try Again" : "Subscribe"}
        </button>
      </div>
      <p className="text-xs mt-3" style={{ color: COLORS.midGray }}>No spam, ever. Unsubscribe anytime.</p>
    </div>
  );
}

// --- Main App ---

function SolGateAppInner() {
  const [view, setView] = useState<"storefront" | "videos" | "feed" | "dashboard">("storefront");
  const [purchases, setPurchases] = useState<{ id: string; signature?: string }[]>([]);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [canceledNotice, setCanceledNotice] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video>(VIDEOS[0]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const walletModal = useWalletModal();
  const { publicKey } = useWallet();
  const searchParams = useSearchParams();
  const creator = creators[0];

  const walletAddress = publicKey ? publicKey.toBase58() : null;
  const { subscribedTier, subscribe, canViewTier, refreshStripeSubscription } = useSubscriptions(walletAddress);

  // Refresh Stripe subscription on mount (in case returning from /success)
  useEffect(() => {
    refreshStripeSubscription();
  }, [refreshStripeSubscription]);

  // Handle ?canceled=true from Stripe
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setCanceledNotice(true);
      setTimeout(() => setCanceledNotice(false), 5000);
    }
  }, [searchParams]);

  const handlePurchase = (product: Product, signature?: string) => {
    if (product.id) {
      setPurchases((prev) => [...prev, { id: product.id!, signature }]);
    }
  };

  const handleTierSubscribed = (tierName: TierName, _sig: string) => {
    subscribe(tierName);
  };

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
  };

  const handleAddToCart = (item: MerchItem, size?: string) => {
    setCart((prev) => {
      const existing = prev.findIndex((c) => c.merch.id === item.id && c.size === size);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing].quantity++;
        return updated;
      }
      return [...prev, { merch: item, size, quantity: 1 }];
    });
    setShowCart(true);
  };

  const views = [
    { key: "storefront" as const, label: "Storefront" },
    { key: "videos" as const, label: "Videos" },
    { key: "feed" as const, label: "Feed" },
    { key: "dashboard" as const, label: "Dashboard" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.darkBg }}>
      {/* Nav — sticky */}
      <nav className="border-b px-4 sm:px-6 py-2 flex items-center justify-between sticky top-0 z-40" style={{ borderColor: "#2D2550", backgroundColor: COLORS.darkBg }}>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="AI Alpha Daily" className="h-10 w-auto rounded-lg" />
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-white font-bold text-lg">SolGate</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#2D1B69", color: "#C4B5FD" }}>DEVNET</span>
          </div>
        </div>
        <div className="flex gap-1">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className="px-3 sm:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              style={{ backgroundColor: view === v.key ? COLORS.purple : "transparent", color: view === v.key ? "white" : COLORS.lightText }}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={() => setShowCart(true)} className="relative px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer" style={{ backgroundColor: COLORS.purple, color: "white" }}>
              🛒 {cart.reduce((sum, c) => sum + c.quantity, 0)}
            </button>
          )}
          <WalletModalButton walletModal={walletModal} />
        </div>
      </nav>

      <WalletModal walletModal={walletModal} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {view === "storefront" && (
          <div className="space-y-8">
            <div className="rounded-lg p-3 text-center text-xs" style={{ backgroundColor: "#2D1B69", color: "#C4B5FD" }}>
              You are on <strong>Solana Devnet</strong> — all transactions use test SOL. Use the Dashboard to airdrop free test SOL.
            </div>

            {canceledNotice && (
              <div className="rounded-lg p-3 text-center text-sm" style={{ backgroundColor: "#3B1B1B", border: "1px solid #DC2626", color: "#FCA5A5" }}>
                Payment was canceled. You can try again anytime.
              </div>
            )}

            {/* Creator header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.teal})`, color: "white" }}>
                {creator.avatar}
              </div>
              <div>
                <h1 className="text-2xl font-black text-white">{creator.name}</h1>
                <p className="text-sm" style={{ color: COLORS.lightText }}>{creator.bio}</p>
                <p className="text-xs mt-1" style={{ color: COLORS.midGray }}>{creator.subscribers.toLocaleString()} subscribers</p>
              </div>
            </div>

            {/* Subscription status */}
            {subscribedTier && (
              <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: "#0D3B2E", border: "1px solid #14F195" }}>
                <span style={{ color: COLORS.teal }}>&#10003;</span>
                <span className="text-sm font-medium" style={{ color: COLORS.teal }}>
                  You're subscribed to {subscribedTier}! Check the Feed for exclusive content.
                </span>
              </div>
            )}

            {/* Featured Video */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Featured Video</h2>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#2D2550" }}>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${VIDEOS.find(v => v.featured)?.youtubeId || VIDEOS[0].youtubeId}`}
                    title={VIDEOS.find(v => v.featured)?.title || VIDEOS[0].title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="px-4 py-3" style={{ backgroundColor: COLORS.cardBg }}>
                  <p className="text-white font-semibold text-sm">{VIDEOS.find(v => v.featured)?.title || VIDEOS[0].title}</p>
                  <button
                    onClick={() => setView("videos")}
                    className="text-xs mt-1 cursor-pointer hover:underline"
                    style={{ color: COLORS.teal }}
                  >
                    Browse all {VIDEOS.length} videos →
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Products & Downloads</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creator.products.map((product) => (
                  <ProductCard key={product.id} product={product} onPurchase={handlePurchase} openWalletModal={() => walletModal.setVisible(true)} />
                ))}
              </div>
            </div>

            {/* Membership tiers */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Membership Tiers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {creator.tiers.map((tier, i) => (
                  <TierCard
                    key={i}
                    tier={tier}
                    featured={i === 1}
                    openWalletModal={() => walletModal.setVisible(true)}
                    onSubscribed={handleTierSubscribed}
                    isSubscribed={canViewTier(tier.name as TierName)}
                  />
                ))}
              </div>
            </div>

            {/* Purchase confirmations */}
            {purchases.length > 0 && (
              <div className="rounded-xl p-4 border space-y-2" style={{ backgroundColor: "#0D3B2E", borderColor: COLORS.teal }}>
                <p className="text-sm font-medium" style={{ color: COLORS.teal }}>&#10003; {purchases.length} item(s) unlocked!</p>
                {purchases.filter(p => p.signature).map((p, i) => (
                  <a key={i} href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="block text-xs underline" style={{ color: COLORS.teal }}>
                    Transaction: {p.signature?.slice(0, 20)}...
                  </a>
                ))}
              </div>
            )}

            {/* Merchandise */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">Merchandise</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {MERCH.map((item) => (
                  <MerchCard key={item.id} item={item} onAddToCart={handleAddToCart} />
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <NewsletterSection />
          </div>
        )}

        {/* Cart / Order Modal */}
        {showCart && (
          <OrderModal
            cart={cart}
            onClose={() => setShowCart(false)}
            onRemove={(idx) => setCart((prev) => prev.filter((_, i) => i !== idx))}
            onUpdateQty={(idx, qty) => setCart((prev) => { const u = [...prev]; u[idx].quantity = qty; return u; })}
            onOrderComplete={() => setCart([])}
          />
        )}

        {view === "videos" && (
          <div className="space-y-6">
            {/* Now Playing */}
            <div>
              <h2 className="text-xl font-black text-white mb-1">Now Playing</h2>
              <p className="text-sm mb-4" style={{ color: COLORS.lightText }}>{selectedVideo.title}</p>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#2D2550" }}>
                <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                    title={selectedVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>

            {/* Video Grid */}
            <div>
              <h2 className="text-lg font-bold text-white mb-4">All Videos ({VIDEOS.length})</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VIDEOS.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="rounded-xl overflow-hidden border text-left transition-all cursor-pointer hover:border-purple-500"
                    style={{
                      backgroundColor: selectedVideo.id === video.id ? "#1E1245" : COLORS.cardBg,
                      borderColor: selectedVideo.id === video.id ? COLORS.purple : "#2D2550",
                    }}
                  >
                    <div className="relative">
                      <img
                        src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full aspect-video object-cover"
                      />
                      {selectedVideo.id === video.id && (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(124, 58, 237, 0.3)" }}>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {selectedVideo.id !== video.id && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(124, 58, 237, 0.9)" }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-sm font-semibold text-white leading-tight">{video.title}</p>
                      {video.featured && (
                        <span className="inline-block text-xs mt-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: "#2D1B69", color: "#C4B5FD" }}>Featured</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "feed" && (
          <div className="space-y-6">
            {/* Creator header (compact) */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shrink-0" style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.teal})`, color: "white" }}>
                {creator.avatar}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">{creator.name} — Feed</h2>
                <p className="text-xs" style={{ color: COLORS.midGray }}>
                  {subscribedTier ? `Subscribed: ${subscribedTier}` : "Free access — subscribe to unlock more"}
                </p>
              </div>
            </div>

            <PostFeed
              posts={posts}
              canViewTier={canViewTier}
              onSubscribeClick={() => setView("storefront")}
            />
          </div>
        )}

        {view === "dashboard" && (
          <CreatorDashboard onPostCreated={handlePostCreated} />
        )}
      </div>

      <footer className="border-t px-6 py-4 text-center" style={{ borderColor: "#2D2550" }}>
        <p className="text-xs" style={{ color: COLORS.midGray }}>
          SolGate — Creator Paywall & Membership Platform on Solana | Near-zero fees. Instant payouts. | Devnet
        </p>
      </footer>
    </div>
  );
}

export default function SolGateApp() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: COLORS.darkBg }} />}>
      <SolGateAppInner />
    </Suspense>
  );
}
