import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LayoutDashboard, ReceiptText, Boxes, Wallet, Users, FileBarChart,
  Plus, Trash2, AlertTriangle, Download, Printer, Search, Menu, X,
  TrendingUp, Package, Banknote, ShoppingCart
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import * as XLSX from "xlsx";
import { storage } from "./storage";

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const todayStr = () => new Date().toISOString().slice(0, 10);
const naira = (n) =>
  "₦" + (Number(n) || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });

const PAYMENT_METHODS = ["Cash", "Transfer", "POS"];
const EXPENSE_CATEGORIES = ["Transport", "Rent", "Packaging", "Utilities", "Salaries", "Supplies", "Other"];

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}
function inRange(dateStr, from, to) {
  return dateStr >= from && dateStr <= to;
}

// ---------- storage ----------
async function loadKey(key, fallback) {
  try {
    const res = await storage.get(key);
    if (res && res.value) return JSON.parse(res.value);
    return fallback;
  } catch {
    return fallback;
  }
}
async function saveKey(key, value) {
  try {
    await storage.set(key, JSON.stringify(value));
  } catch (e) {
    console.error("save failed", key, e);
  }
}

// ---------- seal / logo ----------
function Seal({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke="var(--accent)" strokeWidth="2.5" fill="var(--primary)" />
      <circle cx="32" cy="32" r="24" stroke="var(--accent)" strokeWidth="1" fill="none" strokeDasharray="2 3" />
      <text x="32" y="38" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="20" fill="var(--accent)" fontWeight="600">
        FHI
      </text>
    </svg>
  );
}

// ---------- main app ----------
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);

  const mounted = useRef(false);

  useEffect(() => {
    (async () => {
      const [s, i, e, c] = await Promise.all([
        loadKey("fhi:sales", []),
        loadKey("fhi:inventory", []),
        loadKey("fhi:expenses", []),
        loadKey("fhi:customers", []),
      ]);
      setSales(s);
      setInventory(i);
      setExpenses(e);
      setCustomers(c);
      setLoaded(true);
      mounted.current = true;
    })();
  }, []);

  useEffect(() => { if (mounted.current) saveKey("fhi:sales", sales); }, [sales]);
  useEffect(() => { if (mounted.current) saveKey("fhi:inventory", inventory); }, [inventory]);
  useEffect(() => { if (mounted.current) saveKey("fhi:expenses", expenses); }, [expenses]);
  useEffect(() => { if (mounted.current) saveKey("fhi:customers", customers); }, [customers]);

  const inventoryByName = useMemo(() => {
    const m = new Map();
    inventory.forEach((p) => m.set(p.productName.toLowerCase(), p));
    return m;
  }, [inventory]);

  const lowStockItems = useMemo(
    () => inventory.filter((p) => Number(p.quantity) <= Number(p.lowStockThreshold ?? 5)),
    [inventory]
  );

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "sales", label: "Record Sales", icon: ReceiptText },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "expenses", label: "Expenses", icon: Wallet },
    { id: "customers", label: "Customers", icon: Users },
    { id: "reports", label: "Reports", icon: FileBarChart },
  ];

  if (!loaded) {
    return (
      <div style={{ background: "var(--bg)", minHeight: "100%" }} className="flex items-center justify-center p-10">
        <style>{GLOBAL_CSS}</style>
        <div className="text-sm" style={{ color: "var(--muted)", fontFamily: "'IBM Plex Sans', sans-serif" }}>
          Opening the ledger…
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bg)", minHeight: "100%", fontFamily: "'IBM Plex Sans', sans-serif" }} className="w-full">
      <style>{GLOBAL_CSS}</style>

      {/* Header */}
      <header
        style={{ background: "var(--primary)", borderBottom: "3px dashed var(--accent)" }}
        className="flex items-center justify-between px-4 sm:px-6 py-3 sticky top-0 z-30"
      >
        <div className="flex items-center gap-3">
          <button className="sm:hidden text-white" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Seal size={38} />
          <div>
            <div style={{ fontFamily: "Fraunces, serif", color: "white" }} className="text-lg leading-tight font-semibold tracking-tight">
              Fikr Health International
            </div>
            <div style={{ color: "var(--accent)" }} className="text-[11px] uppercase tracking-[0.15em]">
              Sales &amp; Accounts Ledger
            </div>
          </div>
        </div>
        {lowStockItems.length > 0 && (
          <div
            style={{ background: "var(--danger)", color: "white" }}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
          >
            <AlertTriangle size={14} /> {lowStockItems.length} item{lowStockItems.length > 1 ? "s" : ""} low on stock
          </div>
        )}
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          style={{
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            width: 210,
          }}
          className={`${navOpen ? "block" : "hidden"} sm:block fixed sm:sticky top-[60px] sm:top-[60px] left-0 h-[calc(100vh-60px)] sm:h-[calc(100vh-60px)] z-20 overflow-y-auto`}
        >
          <ul className="py-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => { setTab(item.id); setNavOpen(false); }}
                    style={{
                      color: active ? "var(--primary)" : "var(--ink)",
                      background: active ? "var(--primary-light)" : "transparent",
                      borderRight: active ? "3px solid var(--primary)" : "3px solid transparent",
                    }}
                    className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--primary-light)]"
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main */}
        <main className="flex-1 p-4 sm:p-7 min-w-0">
          {tab === "dashboard" && (
            <Dashboard sales={sales} inventory={inventory} expenses={expenses} lowStockItems={lowStockItems} />
          )}
          {tab === "sales" && (
            <SalesTab
              sales={sales} setSales={setSales}
              inventory={inventory} setInventory={setInventory}
              inventoryByName={inventoryByName}
              customers={customers}
            />
          )}
          {tab === "inventory" && <InventoryTab inventory={inventory} setInventory={setInventory} />}
          {tab === "expenses" && <ExpensesTab expenses={expenses} setExpenses={setExpenses} />}
          {tab === "customers" && <CustomersTab sales={sales} customers={customers} setCustomers={setCustomers} />}
          {tab === "reports" && <ReportsTab sales={sales} inventory={inventory} expenses={expenses} inventoryByName={inventoryByName} />}
        </main>
      </div>
    </div>
  );
}

// ---------- Dashboard ----------
function Dashboard({ sales, inventory, expenses, lowStockItems }) {
  const today = todayStr();
  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const sum = (arr) => arr.reduce((a, s) => a + Number(s.quantity) * Number(s.sellingPrice), 0);
  const todaySales = sales.filter((s) => s.date === today);
  const weekSales = sales.filter((s) => s.date >= weekStart);
  const monthSales = sales.filter((s) => s.date >= monthStart);

  const inventoryByName = new Map(inventory.map((p) => [p.productName.toLowerCase(), p]));
  const cost = (s) => {
    const p = inventoryByName.get((s.productName || "").toLowerCase());
    return p ? Number(p.costPrice) * Number(s.quantity) : 0;
  };
  const monthExpenses = expenses.filter((e) => e.date >= monthStart).reduce((a, e) => a + Number(e.amount), 0);
  const monthRevenue = sum(monthSales);
  const monthCost = monthSales.reduce((a, s) => a + cost(s), 0);
  const monthProfit = monthRevenue - monthCost - monthExpenses;

  const productsSoldToday = todaySales.reduce((a, s) => a + Number(s.quantity), 0);

  const last7 = useMemoDays(sales, 7);

  return (
    <div className="space-y-6">
      <SectionTitle title="Dashboard" subtitle={fmtDate(today)} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Banknote} label="Today's sales" value={naira(sum(todaySales))} />
        <StatCard icon={TrendingUp} label="This week" value={naira(sum(weekSales))} />
        <StatCard icon={FileBarChart} label="This month" value={naira(sum(monthSales))} />
        <StatCard icon={ShoppingCart} label="Products sold today" value={productsSoldToday} plain />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2" style={cardStyle}>
          <div className="px-5 pt-4 pb-1 text-sm font-semibold" style={{ color: "var(--ink)" }}>Last 7 days</div>
          <div style={{ height: 230 }} className="px-2 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={40}
                  tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => naira(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle} className="p-5 space-y-3">
          <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Month at a glance</div>
          <Row label="Revenue" value={naira(monthRevenue)} />
          <Row label="Cost of goods" value={naira(monthCost)} />
          <Row label="Expenses" value={naira(monthExpenses)} />
          <div style={{ borderTop: "1px dashed var(--border)" }} className="pt-2">
            <Row label="Net profit" value={naira(monthProfit)} bold color={monthProfit >= 0 ? "var(--primary)" : "var(--danger)"} />
          </div>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div style={{ ...cardStyle, borderLeft: "4px solid var(--danger)" }} className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "var(--danger)" }}>
            <AlertTriangle size={16} /> Low stock alert
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map((p) => (
              <span key={p.id} style={{ background: "var(--primary-light)", color: "var(--ink)" }} className="text-xs px-2.5 py-1 rounded-full">
                {p.productName} — {p.quantity} left
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function useMemoDays(sales, n) {
  return useMemo(() => {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-NG", { weekday: "short" });
      const total = sales.filter((s) => s.date === key).reduce((a, s) => a + Number(s.quantity) * Number(s.sellingPrice), 0);
      days.push({ key, label, total });
    }
    return days;
  }, [sales, n]);
}

// ---------- Sales ----------
function SalesTab({ sales, setSales, inventory, setInventory, inventoryByName, customers }) {
  const [form, setForm] = useState({
    date: todayStr(), customerName: "", productMode: "inventory", productId: "", productName: "",
    quantity: 1, sellingPrice: "", paymentMethod: "Cash", staff: "",
  });
  const [search, setSearch] = useState("");

  const onProductSelect = (id) => {
    const p = inventory.find((x) => x.id === id);
    setForm((f) => ({ ...f, productId: id, productName: p ? p.productName : "", sellingPrice: p ? p.sellingPrice : "" }));
  };

  const addSale = (e) => {
    e.preventDefault();
    if (!form.productName || !form.quantity || !form.sellingPrice) return;
    const qty = Number(form.quantity);
    const sale = {
      id: uid(),
      date: form.date,
      customerName: form.customerName.trim(),
      productId: form.productMode === "inventory" ? form.productId : null,
      productName: form.productName.trim(),
      quantity: qty,
      sellingPrice: Number(form.sellingPrice),
      paymentMethod: form.paymentMethod,
      staff: form.staff.trim(),
    };
    setSales((s) => [sale, ...s]);
    if (form.productMode === "inventory" && form.productId) {
      setInventory((inv) => inv.map((p) => p.id === form.productId ? { ...p, quantity: Math.max(0, Number(p.quantity) - qty) } : p));
    }
    setForm({ date: todayStr(), customerName: "", productMode: "inventory", productId: "", productName: "", quantity: 1, sellingPrice: "", paymentMethod: "Cash", staff: "" });
  };

  const removeSale = (sale) => {
    setSales((s) => s.filter((x) => x.id !== sale.id));
    if (sale.productId) {
      setInventory((inv) => inv.map((p) => p.id === sale.productId ? { ...p, quantity: Number(p.quantity) + Number(sale.quantity) } : p));
    }
  };

  const filtered = sales.filter((s) =>
    !search || s.productName.toLowerCase().includes(search.toLowerCase()) || (s.customerName || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionTitle title="Record Sales" subtitle="Log every sale as it happens" />

      <form onSubmit={addSale} style={cardStyle} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Field label="Date">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Customer name (optional)">
          <input list="customer-list" placeholder="Walk-in" value={form.customerName}
            onChange={(e) => setForm({ ...form, customerName: e.target.value })} style={inputStyle} />
          <datalist id="customer-list">
            {customers.map((c) => <option key={c.id} value={c.name} />)}
          </datalist>
        </Field>

        <Field label="Product">
          <select
            value={form.productMode === "inventory" ? form.productId : "__custom__"}
            onChange={(e) => {
              if (e.target.value === "__custom__") setForm((f) => ({ ...f, productMode: "custom", productId: "", productName: "", sellingPrice: "" }));
              else { setForm((f) => ({ ...f, productMode: "inventory" })); onProductSelect(e.target.value); }
            }}
            style={inputStyle}
          >
            <option value="">Select product…</option>
            {inventory.map((p) => (
              <option key={p.id} value={p.id}>{p.productName} ({p.quantity} in stock)</option>
            ))}
            <option value="__custom__">Other / custom item…</option>
          </select>
        </Field>

        {form.productMode === "custom" && (
          <Field label="Custom product name">
            <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} style={inputStyle} placeholder="Item name" />
          </Field>
        )}

        <Field label="Quantity sold">
          <input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Selling price (per unit, ₦)">
          <input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Payment method">
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={inputStyle}>
            {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
          </select>
        </Field>
        <Field label="Staff (optional)">
          <input value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })} style={inputStyle} placeholder="Who made the sale" />
        </Field>

        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <button type="submit" style={btnPrimary} className="flex items-center gap-2">
            <Plus size={16} /> Record sale
          </button>
        </div>
      </form>

      <div style={cardStyle}>
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Recent sales ({filtered.length})</div>
          <div className="relative">
            <Search size={14} style={{ position: "absolute", left: 8, top: 9, color: "var(--muted)" }} />
            <input placeholder="Search product / customer" value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 28, width: 220 }} />
          </div>
        </div>
        <div className="overflow-x-auto px-5 pb-4 pt-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                <Th>Date</Th><Th>Customer</Th><Th>Product</Th><Th>Qty</Th><Th>Unit price</Th><Th>Total</Th><Th>Payment</Th><Th>Staff</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((s) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>{fmtDate(s.date)}</Td>
                  <Td>{s.customerName || <span style={{ color: "var(--muted)" }}>Walk-in</span>}</Td>
                  <Td>{s.productName}</Td>
                  <Td className="tabular">{s.quantity}</Td>
                  <Td className="tabular">{naira(s.sellingPrice)}</Td>
                  <Td className="tabular" style={{ fontWeight: 600 }}>{naira(s.quantity * s.sellingPrice)}</Td>
                  <Td>{s.paymentMethod}</Td>
                  <Td>{s.staff || "—"}</Td>
                  <Td><button onClick={() => removeSale(s)} style={{ color: "var(--danger)" }}><Trash2 size={15} /></button></Td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>No sales recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Inventory ----------
function InventoryTab({ inventory, setInventory }) {
  const [form, setForm] = useState({ productName: "", costPrice: "", sellingPrice: "", quantity: "", lowStockThreshold: 5 });

  const add = (e) => {
    e.preventDefault();
    if (!form.productName) return;
    setInventory((inv) => [{ id: uid(), ...form, costPrice: Number(form.costPrice) || 0, sellingPrice: Number(form.sellingPrice) || 0, quantity: Number(form.quantity) || 0, lowStockThreshold: Number(form.lowStockThreshold) || 5 }, ...inv]);
    setForm({ productName: "", costPrice: "", sellingPrice: "", quantity: "", lowStockThreshold: 5 });
  };

  const update = (id, key, value) => {
    setInventory((inv) => inv.map((p) => p.id === id ? { ...p, [key]: value } : p));
  };
  const remove = (id) => setInventory((inv) => inv.filter((p) => p.id !== id));

  return (
    <div className="space-y-6">
      <SectionTitle title="Inventory" subtitle="Keep stock and pricing up to date" />

      <form onSubmit={add} style={cardStyle} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Field label="Product name">
          <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Cost price (₦)">
          <input type="number" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Selling price (₦)">
          <input type="number" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Quantity in stock">
          <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Low-stock alert below">
          <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} style={inputStyle} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <button type="submit" style={btnPrimary} className="flex items-center gap-2"><Plus size={16} /> Add product</button>
        </div>
      </form>

      <div style={cardStyle} className="overflow-x-auto p-5">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ color: "var(--muted)", textAlign: "left" }}>
              <Th>Product</Th><Th>Cost price</Th><Th>Selling price</Th><Th>In stock</Th><Th>Alert below</Th><Th>Margin</Th><Th></Th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((p) => {
              const low = Number(p.quantity) <= Number(p.lowStockThreshold ?? 5);
              const margin = Number(p.sellingPrice) - Number(p.costPrice);
              return (
                <tr key={p.id} style={{ borderTop: "1px solid var(--border)", background: low ? "rgba(166,61,64,0.06)" : "transparent" }}>
                  <Td>{p.productName}{low && <AlertTriangle size={13} style={{ display: "inline", marginLeft: 6, color: "var(--danger)" }} />}</Td>
                  <Td><EditableNum value={p.costPrice} onChange={(v) => update(p.id, "costPrice", v)} /></Td>
                  <Td><EditableNum value={p.sellingPrice} onChange={(v) => update(p.id, "sellingPrice", v)} /></Td>
                  <Td><EditableNum value={p.quantity} onChange={(v) => update(p.id, "quantity", v)} /></Td>
                  <Td><EditableNum value={p.lowStockThreshold ?? 5} onChange={(v) => update(p.id, "lowStockThreshold", v)} /></Td>
                  <Td className="tabular">{naira(margin)}</Td>
                  <Td><button onClick={() => remove(p.id)} style={{ color: "var(--danger)" }}><Trash2 size={15} /></button></Td>
                </tr>
              );
            })}
            {inventory.length === 0 && (
              <tr><td colSpan={7} className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>No products yet — add your first item above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableNum({ value, onChange }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="tabular"
      style={{ ...inputStyle, width: 90, padding: "4px 8px" }}
    />
  );
}

// ---------- Expenses ----------
function ExpensesTab({ expenses, setExpenses }) {
  const [form, setForm] = useState({ date: todayStr(), description: "", amount: "", category: EXPENSE_CATEGORIES[0], customCategory: "" });

  const add = (e) => {
    e.preventDefault();
    if (!form.description || !form.amount) return;
    const category = form.category === "Other" && form.customCategory ? form.customCategory : form.category;
    setExpenses((exp) => [{ id: uid(), date: form.date, description: form.description, amount: Number(form.amount), category }, ...exp]);
    setForm({ date: todayStr(), description: "", amount: "", category: EXPENSE_CATEGORIES[0], customCategory: "" });
  };
  const remove = (id) => setExpenses((exp) => exp.filter((e) => e.id !== id));
  const total = expenses.reduce((a, e) => a + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <SectionTitle title="Expenses" subtitle="Track money going out" />

      <form onSubmit={add} style={cardStyle} className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Field label="Date">
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Description" className="lg:col-span-2">
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} placeholder="e.g. Fuel for delivery bike" />
        </Field>
        <Field label="Amount (₦)">
          <input type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
        </Field>
        <Field label="Category">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        {form.category === "Other" && (
          <Field label="Custom category" className="lg:col-span-2">
            <input value={form.customCategory} onChange={(e) => setForm({ ...form, customCategory: e.target.value })} style={inputStyle} />
          </Field>
        )}
        <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
          <button type="submit" style={btnPrimary} className="flex items-center gap-2"><Plus size={16} /> Add expense</button>
        </div>
      </form>

      <div style={cardStyle}>
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>All expenses</div>
          <div className="text-sm font-semibold tabular" style={{ color: "var(--danger)" }}>Total: {naira(total)}</div>
        </div>
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                <Th>Date</Th><Th>Description</Th><Th>Category</Th><Th>Amount</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <Td>{fmtDate(e.date)}</Td>
                  <Td>{e.description}</Td>
                  <Td><span style={{ background: "var(--primary-light)" }} className="text-xs px-2 py-1 rounded-full">{e.category}</span></Td>
                  <Td className="tabular">{naira(e.amount)}</Td>
                  <Td><button onClick={() => remove(e.id)} style={{ color: "var(--danger)" }}><Trash2 size={15} /></button></Td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>No expenses recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Customers ----------
function CustomersTab({ sales, customers, setCustomers }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [expanded, setExpanded] = useState(null);

  const grouped = useMemo(() => {
    const m = new Map();
    sales.forEach((s) => {
      const name = s.customerName?.trim();
      if (!name) return;
      if (!m.has(name)) m.set(name, []);
      m.get(name).push(s);
    });
    return Array.from(m.entries()).map(([name, list]) => ({
      name,
      total: list.reduce((a, s) => a + s.quantity * s.sellingPrice, 0),
      orders: list.length,
      last: list.reduce((a, s) => (s.date > a ? s.date : a), "0000-00-00"),
      history: list.sort((a, b) => (a.date < b.date ? 1 : -1)),
      phone: customers.find((c) => c.name.toLowerCase() === name.toLowerCase())?.phone,
    })).sort((a, b) => b.total - a.total);
  }, [sales, customers]);

  const addCustomer = (e) => {
    e.preventDefault();
    if (!form.name) return;
    setCustomers((c) => [{ id: uid(), name: form.name.trim(), phone: form.phone.trim() }, ...c.filter((x) => x.name.toLowerCase() !== form.name.trim().toLowerCase())]);
    setForm({ name: "", phone: "" });
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Customers" subtitle="Purchase history, built from your recorded sales" />

      <form onSubmit={addCustomer} style={cardStyle} className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Must match name used at checkout" />
        </Field>
        <Field label="Phone number">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="080…" />
        </Field>
        <div className="flex items-end">
          <button type="submit" style={btnPrimary} className="flex items-center gap-2 w-full sm:w-auto justify-center"><Plus size={16} /> Save contact</button>
        </div>
      </form>

      <div className="space-y-3">
        {grouped.map((c) => (
          <div key={c.name} style={cardStyle}>
            <button onClick={() => setExpanded(expanded === c.name ? null : c.name)} className="w-full flex items-center justify-between px-5 py-4 text-left">
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{c.name}</div>
                <div className="text-xs" style={{ color: "var(--muted)" }}>{c.phone || "No phone saved"} · {c.orders} order{c.orders > 1 ? "s" : ""} · last {fmtDate(c.last)}</div>
              </div>
              <div className="text-sm font-semibold tabular" style={{ color: "var(--primary)" }}>{naira(c.total)}</div>
            </button>
            {expanded === c.name && (
              <div className="px-5 pb-4 overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead><tr style={{ color: "var(--muted)", textAlign: "left" }}><Th>Date</Th><Th>Product</Th><Th>Qty</Th><Th>Total</Th></tr></thead>
                  <tbody>
                    {c.history.map((s) => (
                      <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <Td>{fmtDate(s.date)}</Td><Td>{s.productName}</Td><Td className="tabular">{s.quantity}</Td><Td className="tabular">{naira(s.quantity * s.sellingPrice)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {grouped.length === 0 && (
          <div style={{ ...cardStyle, color: "var(--muted)" }} className="p-6 text-center text-sm">
            No customer purchase history yet. Add a customer name when recording a sale.
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Reports ----------
function ReportsTab({ sales, inventory, expenses, inventoryByName }) {
  const [range, setRange] = useState("month");
  const today = todayStr();
  const weekStart = startOfWeek(new Date()).toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo, setCustomTo] = useState(today);

  const [from, to] = range === "today" ? [today, today]
    : range === "week" ? [weekStart, today]
    : range === "month" ? [monthStart, today]
    : range === "all" ? ["0000-00-00", "9999-99-99"]
    : [customFrom, customTo];

  const rangedSales = sales.filter((s) => inRange(s.date, from, to));
  const rangedExpenses = expenses.filter((e) => inRange(e.date, from, to));

  const revenue = rangedSales.reduce((a, s) => a + s.quantity * s.sellingPrice, 0);
  const cost = rangedSales.reduce((a, s) => {
    const p = inventoryByName.get((s.productName || "").toLowerCase());
    return a + (p ? Number(p.costPrice) * s.quantity : 0);
  }, 0);
  const expenseTotal = rangedExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const grossProfit = revenue - cost;
  const netProfit = grossProfit - expenseTotal;

  const bestSelling = useMemo(() => {
    const m = new Map();
    rangedSales.forEach((s) => m.set(s.productName, (m.get(s.productName) || 0) + Number(s.quantity)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [rangedSales]);

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const salesSheet = XLSX.utils.json_to_sheet(rangedSales.map((s) => ({
      Date: s.date, Customer: s.customerName || "Walk-in", Product: s.productName, Quantity: s.quantity,
      "Unit Price (₦)": s.sellingPrice, "Total (₦)": s.quantity * s.sellingPrice, Payment: s.paymentMethod, Staff: s.staff || "",
    })));
    XLSX.utils.book_append_sheet(wb, salesSheet, "Sales");
    const expSheet = XLSX.utils.json_to_sheet(rangedExpenses.map((e) => ({ Date: e.date, Description: e.description, Category: e.category, "Amount (₦)": e.amount })));
    XLSX.utils.book_append_sheet(wb, expSheet, "Expenses");
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: "Revenue", "Value (₦)": revenue },
      { Metric: "Cost of goods", "Value (₦)": cost },
      { Metric: "Gross profit", "Value (₦)": grossProfit },
      { Metric: "Expenses", "Value (₦)": expenseTotal },
      { Metric: "Net profit", "Value (₦)": netProfit },
    ]);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");
    XLSX.writeFile(wb, `Fikr-Health-Report-${from}_to_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <SectionTitle title="Reports" subtitle="Daily, weekly, monthly and profit reports" />

      <div style={cardStyle} className="p-5 flex flex-wrap items-end gap-4">
        <Field label="Period">
          <select value={range} onChange={(e) => setRange(e.target.value)} style={inputStyle}>
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="all">All time</option>
            <option value="custom">Custom range</option>
          </select>
        </Field>
        {range === "custom" && (
          <>
            <Field label="From"><input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={inputStyle} /></Field>
            <Field label="To"><input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={inputStyle} /></Field>
          </>
        )}
        <div className="flex gap-2 ml-auto no-print">
          <button onClick={exportExcel} style={btnSecondary} className="flex items-center gap-2"><Download size={15} /> Export to Excel</button>
          <button onClick={() => window.print()} style={btnSecondary} className="flex items-center gap-2"><Printer size={15} /> Print / Save as PDF</button>
        </div>
      </div>

      <div id="print-area">
        <div className="hidden print-only mb-4">
          <div style={{ fontFamily: "Fraunces, serif" }} className="text-xl font-semibold">Fikr Health International — Report</div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>{fmtDate(from === "0000-00-00" ? today : from)} to {fmtDate(to === "9999-99-99" ? today : to)}</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <StatCard icon={Banknote} label="Revenue" value={naira(revenue)} />
          <StatCard icon={Package} label="Cost of goods" value={naira(cost)} />
          <StatCard icon={TrendingUp} label="Gross profit" value={naira(grossProfit)} />
          <StatCard icon={Wallet} label="Expenses" value={naira(expenseTotal)} />
          <StatCard icon={FileBarChart} label="Net profit" value={naira(netProfit)} accentColor={netProfit >= 0 ? "var(--primary)" : "var(--danger)"} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div style={cardStyle} className="p-5">
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>Best-selling products</div>
            {bestSelling.map(([name, qty], i) => (
              <div key={name} className="flex items-center justify-between text-sm py-1.5" style={{ borderTop: i ? "1px solid var(--border)" : "none" }}>
                <span>{i + 1}. {name}</span>
                <span className="tabular font-medium">{qty} sold</span>
              </div>
            ))}
            {bestSelling.length === 0 && <div className="text-sm" style={{ color: "var(--muted)" }}>No sales in this period.</div>}
          </div>

          <div style={cardStyle} className="p-5 overflow-x-auto">
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--ink)" }}>Sales in period ({rangedSales.length})</div>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead><tr style={{ color: "var(--muted)", textAlign: "left" }}><Th>Date</Th><Th>Product</Th><Th>Qty</Th><Th>Total</Th></tr></thead>
              <tbody>
                {rangedSales.slice(0, 50).map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <Td>{fmtDate(s.date)}</Td><Td>{s.productName}</Td><Td className="tabular">{s.quantity}</Td><Td className="tabular">{naira(s.quantity * s.sellingPrice)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- small UI primitives ----------
const cardStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 };
const inputStyle = {
  width: "100%", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "8px 10px", fontSize: 13.5, color: "var(--ink)", outline: "none", fontFamily: "'IBM Plex Sans', sans-serif",
};
const btnPrimary = { background: "var(--primary)", color: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13.5, fontWeight: 600 };
const btnSecondary = { background: "var(--primary-light)", color: "var(--primary)", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600 };

function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h1 style={{ fontFamily: "Fraunces, serif", color: "var(--ink)" }} className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{subtitle}</div>
    </div>
  );
}
function StatCard({ icon: Icon, label, value, plain, accentColor }) {
  return (
    <div style={cardStyle} className="p-4">
      <div className="flex items-center gap-2 mb-2">
        <div style={{ background: "var(--primary-light)", color: "var(--primary)" }} className="p-1.5 rounded-md"><Icon size={15} /></div>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{label}</span>
      </div>
      <div className="tabular text-xl font-semibold" style={{ color: accentColor || "var(--ink)", fontFamily: plain ? "'IBM Plex Mono', monospace" : "'IBM Plex Mono', monospace" }}>{value}</div>
    </div>
  );
}
function Field({ label, children, className = "" }) {
  return (
    <label className={`text-xs flex flex-col gap-1.5 ${className}`} style={{ color: "var(--muted)" }}>
      {label}
      {children}
    </label>
  );
}
function Th({ children }) { return <th className="pb-2 pr-4 font-medium text-xs">{children}</th>; }
function Td({ children, className = "", style }) { return <td style={style} className={`py-2 pr-4 ${className}`}>{children}</td>; }
function Row({ label, value, bold, color }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="tabular" style={{ fontWeight: bold ? 700 : 500, color: color || "var(--ink)" }}>{value}</span>
    </div>
  );
}

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --ink: #16231F;
  --bg: #F3F6F3;
  --surface: #FFFFFF;
  --primary: #0F4C43;
  --primary-light: #E4EFEA;
  --accent: #D6A419;
  --danger: #A63D40;
  --muted: #6B7A73;
  --border: #E1E7E2;
}
* { box-sizing: border-box; }
.tabular { font-family: 'IBM Plex Mono', monospace; }
button { cursor: pointer; border: none; font-family: inherit; }
input, select { font-family: inherit; }
input:focus, select:focus { border-color: var(--primary) !important; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

.print-only { display: none; }
@media print {
  header, nav, .no-print { display: none !important; }
  .print-only { display: block !important; }
  body, #print-area { background: white !important; }
}
`;
