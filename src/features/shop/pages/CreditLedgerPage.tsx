import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { IndianRupee, Search, ChevronDown, ChevronRight, ArrowUpRight, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";

export default function CreditLedgerPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);

  // Payment Modal
  const [paymentModal, setPaymentModal] = useState<{ open: boolean; account: any | null }>({ open: false, account: null });
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchCredits = async () => {
    setIsLoading(true);
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

  useEffect(() => { fetchCredits(); }, []);

  const handleReceivePayment = async () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    if (amount > paymentModal.account?.balance) {
      toast.error("Payment amount cannot exceed the outstanding balance.");
      return;
    }

    setIsSubmitting(true);
    try {
      const farmerId = paymentModal.account?.farmerId?._id;
      const res = await fetch(`${API_BASE_URL}/credits/${farmerId}/payment`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          amount,
          paymentMethod: "CASH",
          notes: paymentNotes || `Payment received from ${paymentModal.account?.farmerId?.name}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`₹${amount.toLocaleString("en-IN")} payment recorded. Balance updated.`);
        setPaymentModal({ open: false, account: null });
        setPaymentAmount("");
        setPaymentNotes("");
        await fetchCredits(); // Refresh
      } else {
        toast.error(data.message || "Failed to record payment.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <p className="text-muted-foreground">Track outstanding credit and receive payments from farmers.</p>
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
            <CardTitle className="text-sm font-medium">Cleared Accounts</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{accounts.filter(a => a.balance <= 0).length}</div>
            <p className="text-xs text-muted-foreground">Fully paid</p>
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

      {/* Credit Accounts */}
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
            <Card key={account._id} className={`border ${account.balance > 0 ? "border-destructive/30" : "border-green-200"}`}>
              {/* Farmer row header */}
              <div className="flex items-center justify-between p-4">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => setExpandedAccount(expandedAccount === account._id ? null : account._id)}
                >
                  {expandedAccount === account._id
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div>
                    <p className="font-semibold">{account.farmerId?.name || "Unknown Farmer"}</p>
                    <p className="text-xs text-muted-foreground">{account.farmerId?.phone || account.farmerId?.village || ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className={`text-lg font-bold ${account.balance > 0 ? "text-destructive" : "text-success"}`}>
                      ₹{(account.balance || 0).toLocaleString("en-IN")}
                    </p>
                    <Badge variant={account.balance > 0 ? "destructive" : "outline"} className="text-xs">
                      {account.balance > 0 ? "Outstanding" : "Cleared"}
                    </Badge>
                  </div>
                  {account.balance > 0 && (
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentModal({ open: true, account });
                        setPaymentAmount(account.balance.toString());
                      }}
                    >
                      <IndianRupee className="h-3 w-3 mr-1" />
                      Receive Payment
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded transaction history */}
              {expandedAccount === account._id && (
                <div className="border-t">
                  {!account.transactions || account.transactions.length === 0 ? (
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
                            <th className="text-right p-3 font-medium">Sale Outstanding</th>
                            <th className="text-center p-3 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody>
                          {account.transactions.map((tx: any) => (
                            <tr key={tx._id} className="border-t hover:bg-muted/10">
                              <td className="p-3 font-mono text-xs text-primary">
                                {tx.saleDetails?.invoiceNumber || "—"}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {new Date(tx.saleDetails?.date || tx.createdAt).toLocaleDateString("en-IN", {
                                  day: "2-digit", month: "short", year: "numeric"
                                })}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {tx.saleDetails ? `₹${tx.saleDetails.totalAmount.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-right text-green-600 font-medium">
                                {tx.saleDetails ? `₹${tx.saleDetails.downPayment.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-3 text-right text-warning font-medium">
                                ₹{(tx.amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                <span className={tx.type === "CREDIT_ADDED" && tx.saleDetails?.outstanding > 0 ? "text-destructive" : "text-success"}>
                                  {tx.saleDetails
                                    ? `₹${tx.saleDetails.outstanding.toLocaleString("en-IN")}`
                                    : tx.type === "PAYMENT_RECEIVED"
                                      ? <span className="text-success">₹{(tx.amount || 0).toLocaleString("en-IN")} Paid</span>
                                      : "—"}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <Badge
                                  variant={tx.type === "CREDIT_ADDED" ? "destructive" : "outline"}
                                  className={`text-xs ${tx.type === "PAYMENT_RECEIVED" ? "bg-green-100 text-green-700 border-green-300" : ""}`}
                                >
                                  {tx.type === "CREDIT_ADDED" ? "Credit" : "Payment"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/30 font-semibold">
                          <tr>
                            <td colSpan={5} className="p-3 text-right text-sm">Current Outstanding Balance:</td>
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

      {/* Receive Payment Modal */}
      <Dialog open={paymentModal.open} onOpenChange={(open) => !open && setPaymentModal({ open: false, account: null })}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Receive Credit Payment</DialogTitle>
            <DialogDescription>
              Record payment from <strong>{paymentModal.account?.farmerId?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center bg-destructive/10 p-3 rounded-lg border border-destructive/20">
              <span className="text-sm font-medium">Current Outstanding</span>
              <span className="text-xl font-bold text-destructive">
                ₹{(paymentModal.account?.balance || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentAmt">Amount Being Paid (₹)</Label>
              <Input
                id="paymentAmt"
                type="number"
                min="1"
                max={paymentModal.account?.balance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            {paymentAmount && Number(paymentAmount) > 0 && Number(paymentAmount) <= (paymentModal.account?.balance || 0) && (
              <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg border border-green-200">
                <span className="text-sm font-medium text-green-700">Balance After Payment</span>
                <span className="text-lg font-bold text-green-700">
                  ₹{((paymentModal.account?.balance || 0) - Number(paymentAmount)).toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Input
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="e.g. Cash payment received"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={isSubmitting} onClick={() => setPaymentModal({ open: false, account: null })}>
              Cancel
            </Button>
            <Button
              onClick={handleReceivePayment}
              disabled={isSubmitting || !paymentAmount || Number(paymentAmount) <= 0}
              className="bg-success hover:bg-success/90 text-white"
            >
              {isSubmitting ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
