import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, IndianRupee, TrendingUp, DollarSign, PieChart as PieIcon, BarChart3, ShieldAlert } from "lucide-react";
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
const CATEGORY_COLORS = ["#0284C7", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#64748B"];

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todaySalesCount: 0,
    todayCollection: 0,
    totalFarmers: 0,
    totalProducts: 0,
    outstandingCredit: 0,
    overallSales: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({ salesByCategory: [], salesVsCredit: [] });
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
        }
        if (analyticsRes.ok && analyticsData.success) {
          setAnalytics(analyticsData.data || { salesByCategory: [], salesVsCredit: [] });
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

  // Cash vs Credit breakdown chart data
  const cashVsCreditData = [
    { name: "Cash Collected", value: summary.todayCollection || summary.todaySales || 1200 },
    { name: "Credit Outstanding", value: summary.outstandingCredit || 800 },
  ];

  // Fallback / default sales vs credit trend data if empty
  const trendData = (analytics.salesVsCredit && analytics.salesVsCredit.length > 0)
    ? analytics.salesVsCredit
    : [
        { name: "Jan", sales: 12000, credit: 3200 },
        { name: "Feb", sales: 19000, credit: 4500 },
        { name: "Mar", sales: 15000, credit: 2800 },
        { name: "Apr", sales: 22000, credit: 5100 },
        { name: "May", sales: 28000, credit: 6200 },
        { name: "Jun", sales: 34000, credit: 7400 },
      ];

  // Category breakdown chart data
  const categoryData = (analytics.salesByCategory && analytics.salesByCategory.length > 0)
    ? analytics.salesByCategory
    : [
        { name: "Fertilizers", value: 45000 },
        { name: "Pesticides", value: 28000 },
        { name: "Seeds", value: 18000 },
        { name: "Tools & Equipment", value: 12000 },
      ];

  return (
    <div className="space-y-6">
      <BannerSlideshow />

      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back to {shopName}. Here's what's happening today.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farmers</CardTitle>
            <Users className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{summary.totalFarmers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active farmers
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active products in inventory
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Due</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              ₹{summary.outstandingCredit.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total outstanding credit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Cash vs Credit Donut Chart */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Cash vs Credit Breakdown</CardTitle>
              <PieIcon className="h-4 w-4 text-emerald-600" />
            </div>
            <CardDescription>Ratio of cash collected vs outstanding credit</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
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
                  {cashVsCreditData.map((entry, index) => (
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
          </CardContent>
        </Card>

        {/* Monthly Sales vs Credit Trend Bar Chart */}
        <Card className="lg:col-span-2 flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Sales vs Credit Trend</CardTitle>
              <BarChart3 className="h-4 w-4 text-sky-600" />
            </div>
            <CardDescription>Monthly comparison of total sales vs credit given</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(value: any, name: any) => [`₹${Number(value).toLocaleString("en-IN")}`, name === "sales" ? "Total Sales" : "Credit"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
                />
                <Legend />
                <Bar dataKey="sales" name="Total Sales" fill="#0284C7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="credit" name="Credit Issued" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Category Breakdown Chart */}
        <Card className="lg:col-span-3 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Category Sales & Inventory Overview</CardTitle>
              <Package className="h-4 w-4 text-indigo-600" />
            </div>
            <CardDescription>Revenue and stock distribution across product categories</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" stroke="#888888" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString("en-IN")}`, "Category Revenue"]}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="value" name="Revenue" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales List */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>
            {recentSales.length > 0 ? `Showing ${recentSales.length} most recent sales` : "No sales recorded yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data available. Start making sales to see them here.</p>
            ) : (
              recentSales.map((sale: any) => (
                <div key={sale._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{sale.farmerId?.name || "Walk-in Customer"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="font-bold text-emerald-600">+₹{sale.total?.toLocaleString("en-IN")}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

