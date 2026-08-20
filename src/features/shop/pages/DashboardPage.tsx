import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, IndianRupee, TrendingUp } from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:5000/api/v1";

export default function DashboardPage() {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todaySalesCount: 0,
    todayCollection: 0,
    totalFarmers: 0,
    totalProducts: 0,
    outstandingCredit: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const shopData = localStorage.getItem("shop");
  const shopName = shopData ? JSON.parse(shopData).name : "Your Shop";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [summaryRes, transactionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/dashboard/summary`, { headers }),
          fetch(`${API_BASE_URL}/dashboard/recent-transactions`, { headers }),
        ]);

        const summaryData = await summaryRes.json();
        const transactionsData = await transactionsRes.json();

        if (summaryRes.ok && summaryData.success) {
          setSummary(summaryData.data);
        }
        if (transactionsRes.ok && transactionsData.success) {
          setRecentSales(transactionsData.data.recentSales || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome back to {shopName}. Here's what's happening today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground">
              {summary.todaySalesCount} sale(s) today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farmers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalFarmers}</div>
            <p className="text-xs text-muted-foreground">
              Active farmers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active products in inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Due</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">₹{summary.outstandingCredit.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">
              Total outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
          <CardDescription>
            {recentSales.length > 0 ? `Showing ${recentSales.length} most recent sales` : "No sales recorded yet"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No sales data available. Start making sales to see them here.</p>
            ) : (
              recentSales.map((sale: any) => (
                <div key={sale._id} className="flex items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{sale.farmerId?.name || "Walk-in Customer"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+₹{sale.total?.toLocaleString("en-IN")}</div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
