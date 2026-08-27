import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { IndianRupee, Search, ChevronDown, ChevronRight, ArrowUpRight } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function CreditLedgerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/credits/ledger`, { headers: getHeaders() });
        const data = await response.json();
        if (response.ok && data.success) {
          setAccounts(data.data.accounts || []);
          setTotalOutstanding(data.data.totalOutstanding || 0);
        }
      } catch (err) {
        console.error("Failed to fetch credits:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCredits();
  }, []);

  const filtered = accounts.filter((a: any) =>
    (a.farmerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h2 className="text-3xl font-bold tracking-tight">Credit Ledger</h2>
        <p className="text-muted-foreground">Track outstanding credit balances and transaction history per farmer.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">₹{totalOutstanding.toLocaleString("en-IN")}</div>
            <p className="text-xs text-muted-foreground">From {accounts.filter(a => a.balance > 0).length} account(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Credit Accounts</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{accounts.filter(a => a.balance > 0).length}</div>
            <p className="text-xs text-muted-foreground">With outstanding balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farmers on Credit</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-80">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by farmer name..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Credit Accounts Table */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <IndianRupee className="h-12 w-12 mb-4 opacity-20" />
              <p className="font-medium">No credit accounts found</p>
              <p className="text-sm">Credit accounts are created when a sale is made on credit for a registered farmer.</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((account: any) => (
            <Card key={account._id} className={`border ${account.balance > 0 ? "border-destructive/30" : "border-success/30"}`}>
              {/* Header row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
                onClick={() => setExpandedAccount(expandedAccount === account._id ? null : account._id)}
              >
                <div className="flex items-center gap-3">
                  {expandedAccount === account._id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-semibold">{account.farmerId?.name || "Unknown Farmer"}</p>
                    <p className="text-xs text-muted-foreground">{account.farmerId?.phone || account.farmerId?.village || ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${account.balance > 0 ? "text-destructive" : "text-success"}`}>
                    ₹{(account.balance || 0).toLocaleString("en-IN")}
                  </p>
                  <Badge variant={account.balance > 0 ? "destructive" : "outline"} className="text-xs">
                    {account.balance > 0 ? "Outstanding" : "Cleared"}
                  </Badge>
                </div>
              </div>

              {/* Expanded transactions */}
              {expandedAccount === account._id && (
                <div className="border-t">
                  {account.transactions?.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">No transactions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="text-left p-3 font-medium">Invoice #</th>
                            <th className="text-left p-3 font-medium">Date</th>
                            <th className="text-right p-3 font-medium">Bill Total</th>
                            <th className="text-right p-3 font-medium">Down Payment</th>
                            <th className="text-right p-3 font-medium">Credit Taken</th>
                            <th className="text-right p-3 font-medium">Outstanding</th>
                            <th className="text-center p-3 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {account.transactions.map((tx: any) => (
                            <tr key={tx._id} className="border-t hover:bg-muted/10">
                              <td className="p-3 font-mono text-xs">
                                {tx.saleDetails?.invoiceNumber || "—"}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {tx.saleDetails?.date
                                  ? new Date(tx.saleDetails.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                                  : new Date(tx.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="p-3 text-right">
                                {tx.saleDetails ? `₹${tx.saleDetails.totalAmount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-right text-success font-medium">
                                {tx.saleDetails ? `₹${tx.saleDetails.downPayment.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-right text-warning font-medium">
                                ₹{(tx.amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-3 text-right text-destructive font-semibold">
                                {tx.saleDetails ? `₹${tx.saleDetails.outstanding.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-center">
                                <Badge variant={tx.type === "CREDIT_ADDED" ? "destructive" : "outline"} className="text-xs">
                                  {tx.type === "CREDIT_ADDED" ? "Credit" : "Payment"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 font-semibold">
                          <tr>
                            <td colSpan={5} className="p-3 text-right">Current Outstanding Balance:</td>
                            <td className={`p-3 text-right text-base ${account.balance > 0 ? "text-destructive" : "text-success"}`}>
                              ₹{(account.balance || 0).toLocaleString("en-IN")}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
