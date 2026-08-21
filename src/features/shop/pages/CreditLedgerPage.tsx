import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, IndianRupee, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function CreditLedgerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API_BASE_URL}/credits`, { headers });
        const data = await response.json();
        if (response.ok && data.success) {
          const creditData = data.data;
          if (Array.isArray(creditData)) {
            setAccounts(creditData);
            setTotalOutstanding(creditData.reduce((sum: number, a: any) => sum + (a.balance || 0), 0));
          } else if (creditData?.accounts) {
            setAccounts(creditData.accounts);
            setTotalOutstanding(creditData.summary?.totalOutstanding || 0);
          }
        }
      } catch (err) {
        console.error("Failed to fetch credits:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCredits();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Credit Ledger</h2>
          <p className="text-muted-foreground">
            Track outstanding balances and receive payments from farmers.
          </p>
        </div>
        <Button size="sm" className="bg-success hover:bg-success/90 shadow-md text-white">
          <IndianRupee className="mr-2 h-4 w-4" /> Receive Payment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{totalOutstanding.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">From {accounts.length} account(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Accounts</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{accounts.filter((a: any) => a.balance > 0).length}</div>
            <p className="text-xs text-muted-foreground">With outstanding balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Settled Accounts</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{accounts.filter((a: any) => a.balance <= 0).length}</div>
            <p className="text-xs text-muted-foreground">Fully paid</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between border-b">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by farmer name..."
              className="pl-9 bg-muted/50"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Farmer</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    No credit accounts found. Credit accounts are created when sales are made on credit.
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map((account: any) => (
                  <TableRow key={account._id}>
                    <TableCell className="font-medium">{account.farmerId?.name || "Unknown"}</TableCell>
                    <TableCell className="text-right">₹{(account.creditLimit || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className={`text-right font-medium ${account.balance > 0 ? "text-destructive" : "text-success"}`}>
                      ₹{(account.balance || 0).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
