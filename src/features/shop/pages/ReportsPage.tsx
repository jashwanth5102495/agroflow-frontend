import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/dashboard/analytics`, { headers: getHeaders() });
        const data = await res.json();
        if (res.ok && data.success) {
          setAnalytics(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleGenerateReport = (reportName: string = "General Report") => {
    toast.info(`${reportName} generation will be available once sales data is recorded.`);
  };

  const handleRequestOldData = async () => {
    try {
      const now = new Date();
      // Usually would prompt for month/year, we just send current for mock
      const month = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();

      // Simulate payment
      toast("Initializing Payment Gateway for ₹50...", { icon: "💳" });
      await new Promise(r => setTimeout(r, 1500));
      
      const res = await fetch(`${API_BASE_URL}/backup/shop/request-data`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ month, year })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Payment successful! Request sent to Admin. Your data will be restored shortly.", { duration: 5000 });
      } else {
        toast.error("Request failed");
      }
    } catch (err) {
      toast.error("Could not connect to server");
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            View your business performance and download reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleGenerateReport()}>
            <Download className="mr-2 h-4 w-4" /> PDF Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Credit (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">Loading...</div>
            ) : analytics?.salesVsCredit?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.salesVsCredit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#8884d8" name="Total Sales" />
                  <Bar dataKey="credit" fill="#82ca9d" name="Credit Added" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">No sales data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-muted-foreground animate-pulse">Loading...</div>
            ) : analytics?.salesByCategory?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.salesByCategory}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {analytics.salesByCategory.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <PieChartIcon className="h-12 w-12 mb-4 opacity-20" />
                <p className="font-medium">No category data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Monthly GST Report", desc: "Sales and tax details for GST filing." },
              { name: "Inventory Valuation", desc: "Current stock value across all categories." },
              { name: "Credit Recovery", desc: "List of farmers with overdue payments." },
            ].map((report, idx) => (
              <div key={idx} className="border p-4 rounded-lg flex flex-col gap-3 hover:border-primary transition-colors cursor-pointer group">
                <div>
                  <h4 className="font-semibold text-lg group-hover:text-primary transition-colors">{report.name}</h4>
                  <p className="text-sm text-muted-foreground">{report.desc}</p>
                </div>
                <Button variant="outline" className="w-full mt-auto" onClick={() => handleGenerateReport(report.name)}>Generate</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Request Historical Data Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-background p-4 rounded-lg border shadow-sm">
            <div>
              <p className="font-medium text-foreground">Need detailed line-by-line sales data from past months?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Detailed receipts older than 30 days are automatically archived. 
                You can request a complete restore of any previous month's data for ₹50.
              </p>
            </div>
            <Button onClick={handleRequestOldData} className="whitespace-nowrap gradient-btn shadow-sm">
              Request Old Data (₹50)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
