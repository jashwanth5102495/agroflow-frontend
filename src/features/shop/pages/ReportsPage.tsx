import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const handleGenerateReport = (reportName: string = "General Report") => {
    toast.info(`${reportName} generation will be available once sales data is recorded.`);
  };

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
          <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <BarChart3 className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">No sales data available yet</p>
            <p className="text-sm">Charts will appear once you start recording sales.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <PieChartIcon className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">No category data available yet</p>
            <p className="text-sm">Charts will appear once you start recording sales.</p>
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
    </div>
  );
}
