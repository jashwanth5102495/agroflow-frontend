import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Users,
  IndianRupee,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Truck,
  ArrowDownToLine,
  Calendar,
  Layers,
  ShoppingBag,
  CreditCard
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import BannerSlideshow from "@/components/BannerSlideshow";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const CASH_CREDIT_COLORS = ["#10B981", "#F59E0B", "#0284C7"];
const CATEGORY_COLORS = ["#0284C7", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#64748B", "#14B8A6", "#E11D48"];

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todaySalesCount: 0,
    todayPurchases: 0,
    todayPurchasesCount: 0,
    todayCollection: 0,
    todayCost: 0,
    todayProfit: 0,
    todayProfitMargin: 0,
    totalFarmers: 0,
    totalProducts: 0,
    outstandingCredit: 0,
    overallSales: 0,
    overallPurchases: 0,
    overallCost: 0,
    overallProfit: 0,
    overallProfitMargin: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    salesByCategory: [],
    salesVsCredit: [],
    categoryType: "INVENTORY_CATALOG",
  });
  const [isLoading, setIsLoading] = useState(true);

  const shopData = localStorage.getItem("shop");
  const shopName = shopData ? JSON.parse(shopData).name : "Your Shop";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [summaryRes, transactionsRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/summary`, { headers }),
          fetch(`${API_BASE_URL}/dashboard/recent-transactions`, { headers }),
          fetch(`${API_BASE_URL}/dashboard/analytics`, { headers }),
        ]);

        const summaryData = await summaryRes.json();
        const transactionsData = await transactionsRes.json();
        const analyticsData = await analyticsRes.json();

        if (summaryRes.ok && summaryData.success) {
          setSummary(summaryData.data);
        }
        if (transactionsRes.ok && transactionsData.success) {
          setRecentSales(transactionsData.data.recentSales || []);
          setRecentPurchases(transactionsData.data.recentPurchases || []);
        }
        if (analyticsRes.ok && analyticsData.success) {
          setAnalytics(analyticsData.data || { salesByCategory: [], salesVsCredit: [], categoryType: "INVENTORY_CATALOG" });
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Real Cash vs Credit breakdown chart data
  const hasCashOrCredit = (summary.todayCollection > 0 || summary.todaySales > 0 || summary.outstandingCredit > 0);
  const cashVsCreditData = hasCashOrCredit
    ? [
        { name: "Cash Collected", value: summary.todayCollection || summary.todaySales },
        { name: "Credit Outstanding", value: summary.outstandingCredit },
      ]
    : [
        { name: "Cash (No sales yet)", value: 1 },
        { name: "Credit (No dues)", value: 0 },
      ];

  // Real Trend Data (monthly sales, incoming purchases, and credit)
  const trendData = analytics.salesVsCredit || [];

  // Real Category Data (sales by category or inventory distribution)
  const categoryData = analytics.salesByCategory || [];
  const isInventoryCategory = analytics.categoryType === "INVENTORY_CATALOG";

  return (
    <div className="space-y-6">
      <BannerSlideshow />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back to {shopName}. Here's what's happening today in real-time.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Today's Sales */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ₹{summary.todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.todaySalesCount} sale(s) today
            </p>
          </CardContent>
        </Card>

        {/* Today's Profit (End of Day Realized Profit) */}
        <Card className="hover:shadow-md transition-shadow border-emerald-500/20 bg-emerald-500/[0.02]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Today's Profit</CardTitle>
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ₹{(summary.todayProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded text-[11px]">
                {summary.todayProfitMargin || 0}% margin
              </span>
              <span>· Cost: ₹{(summary.todayCost || 0).toLocaleString("en-IN")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Today's Incoming Purchases */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Incoming Material</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              ₹{summary.todayPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.todayPurchasesCount} inward batch(es) today
            </p>
          </CardContent>
        </Card>

        {/* Credit Due */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              ₹{summary.outstandingCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total pending credit from farmers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-muted/30 border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Revenue (Overall)</p>
            <p className="text-lg font-bold text-foreground">₹{summary.overallSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <ShoppingBag className="h-5 w-5 text-emerald-600 opacity-80" />
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Realized Profit</p>
            <p className="text-lg font-bold text-emerald-600">
              ₹{(summary.overallProfit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-muted-foreground">{summary.overallProfitMargin || 0}% overall margin</p>
          </div>
          <TrendingUp className="h-5 w-5 text-emerald-600 opacity-80" />
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Incoming Material</p>
            <p className="text-lg font-bold text-foreground">₹{summary.overallPurchases.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
          </div>
          <ArrowDownToLine className="h-5 w-5 text-primary opacity-80" />
        </div>

        <div className="bg-muted/30 border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Catalog Products / Farmers</p>
            <p className="text-lg font-bold text-foreground">{summary.totalProducts} items · {summary.totalFarmers} farmers</p>
          </div>
          <Package className="h-5 w-5 text-indigo-600 opacity-80" />
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash vs Credit Donut Chart */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cash vs Credit Ratio</CardTitle>
              <PieIcon className="h-4 w-4 text-emerald-600" />
            </div>
            <CardDescription>Real-time cash collected vs outstanding credit</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {!hasCashOrCredit ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <PieIcon className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No sales or credit yet</p>
                <p className="text-xs">Transactions will reflect here automatically.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cashVsCreditData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {cashVsCreditData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={CASH_CREDIT_COLORS[index % CASH_CREDIT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Amount"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Real Trend (Sales vs Incoming vs Credit) */}
        <Card className="lg:col-span-2 flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Monthly Activity: Sales, Incoming & Credit</CardTitle>
              <BarChart3 className="h-4 w-4 text-sky-600" />
            </div>
            <CardDescription>Real monthly tracking across sales, incoming purchases, and credit issued</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `₹${Number(value).toLocaleString("en-IN")}`,
                    name === "sales" ? "Total Sales" : name === "incoming" ? "Incoming Material" : "Credit Issued"
                  ]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="sales" name="Total Sales" fill="#0284C7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="incoming" name="Incoming Purchases" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="credit" name="Credit Issued" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown Chart */}
        <Card className="lg:col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {isInventoryCategory ? "Store Inventory by Category" : "Sales Revenue by Category"}
              </CardTitle>
              <Layers className="h-4 w-4 text-indigo-600" />
            </div>
            <CardDescription>
              {isInventoryCategory
                ? "Live product count distribution across categories in your store"
                : "Real sales revenue generated across product categories"}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Package className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-medium">No category data available</p>
                <p className="text-xs">Add products in Inventory to visualize category distribution.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                  <XAxis type="number" stroke="#888888" fontSize={12} tickFormatter={(v) => isInventoryCategory ? `${v} pcs` : `₹${v}`} />
                  <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value: any) => [
                      isInventoryCategory ? `${value} products` : `₹${Number(value).toLocaleString("en-IN")}`,
                      isInventoryCategory ? "Catalog Items" : "Category Revenue"
                    ]}
                    contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="value" name={isInventoryCategory ? "Products" : "Revenue"} radius={[0, 4, 4, 0]}>
                    {categoryData.map((_: any, index: number) => (
                      <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Grid: Recent Sales & Recent Incoming Material */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales List */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-emerald-600" /> Recent Sales
            </CardTitle>
            <CardDescription>
              {recentSales.length > 0 ? `Showing ${recentSales.length} most recent sales` : "No sales recorded yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No sales data available yet.</p>
              ) : (
                recentSales.map((sale: any) => (
                  <div key={sale._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.farmerId?.name || "Walk-in Customer"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="font-bold text-emerald-600">+₹{sale.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Incoming Material List */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Recent Incoming Material
            </CardTitle>
            <CardDescription>
              {recentPurchases.length > 0 ? `Showing ${recentPurchases.length} most recent inward shipments` : "No incoming material logged yet"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No incoming shipments logged yet.</p>
              ) : (
                recentPurchases.map((pur: any) => (
                  <div key={pur._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{pur.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        Inv: {pur.invoiceNumber} | {new Date(pur.purchaseDate || pur.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="font-bold text-primary">₹{pur.total?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
