import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CalendarDays,
  History,
  CheckCircle2,
  Zap,
  Sparkles,
  RefreshCw,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

const API_BASE_URL = "http://127.0.0.1:5000/api/v1";

interface BillingRecord {
  _id?: string;
  date: string;
  amount: number;
  plan: string;
  cycle: string;
  status: string;
  paymentMethod: string;
  transactionId: string;
}

interface SubscriptionData {
  subscriptionStatus: "PENDING_PAYMENT" | "ACTIVE" | "EXPIRED" | "CANCELLED";
  billingCycle: "MONTHLY" | "ANNUAL";
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  daysRemaining: number;
  autoPay: boolean;
  monthlyBasePrice: number;
  annualDiscountedPrice: number;
  annualSavings: number;
  plans: {
    id: "MONTHLY" | "ANNUAL";
    name: string;
    price: number;
    originalPrice?: number;
    period: string;
    billingText: string;
    discount: string;
    isPopular: boolean;
  }[];
  billingHistory: BillingRecord[];
}

export default function SoftwareBillingPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY");
  const [isAutoPayEnabled, setIsAutoPayEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/status`, {
        headers: getHeaders(),
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setData(resData.data);
        setSelectedCycle(resData.data.billingCycle || "MONTHLY");
        setIsAutoPayEnabled(resData.data.autoPay ?? true);
        
        // Update local shop status cache
        const shop = localStorage.getItem("shop");
        if (shop) {
          const parsed = JSON.parse(shop);
          parsed.subscriptionStatus = resData.data.subscriptionStatus;
          localStorage.setItem("shop", JSON.stringify(parsed));
        }
      }
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handlePayAndActivate = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/subscription/pay`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          cycle: selectedCycle,
          autoPay: isAutoPayEnabled,
          paymentMethod: isAutoPayEnabled ? "UPI AutoPay (Mandate)" : "Online Payment",
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success(
          selectedCycle === "ANNUAL"
            ? "Annual Plan activated with 15% discount!"
            : "Monthly Plan activated with AutoPay enabled!"
        );
        fetchSubscription();
      } else {
        toast.error(resData.message || "Payment processing failed");
      }
    } catch (err) {
      toast.error("Cannot connect to payment gateway. Please ensure backend is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const monthlyPrice = data?.monthlyBasePrice || 1500;
  const annualPrice = data?.annualDiscountedPrice || Math.round((monthlyPrice * 12) * 0.85);
  const annualSavings = (monthlyPrice * 12) - annualPrice;
  const isActive = data?.subscriptionStatus === "ACTIVE";

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Software Billing & AutoPay</h2>
          <p className="text-muted-foreground mt-1">
            Choose your subscription plan and activate automated monthly/annual billing.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubscription} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Subscription Status Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className={`border shadow-sm ${isActive ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Subscription Status</CardTitle>
              <CardDescription>Current account operational state</CardDescription>
            </div>
            {isActive ? (
              <Badge variant="outline" className="bg-success text-white border-transparent flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 flex items-center gap-1 font-medium">
                <Lock className="h-3.5 w-3.5" /> Payment Required
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 pt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                {isActive ? (data?.billingCycle === "ANNUAL" ? `₹${annualPrice.toLocaleString("en-IN")}` : `₹${monthlyPrice.toLocaleString("en-IN")}`) : "₹0"}
              </span>
              <span className="text-muted-foreground text-sm font-medium">
                {isActive ? (data?.billingCycle === "ANNUAL" ? "/ year (15% OFF)" : "/ month") : "(Inactive)"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {isActive
                ? `AutoPay is ${data?.autoPay ? "Active (Recurring)" : "Manual"}. Dashboard is unlocked.`
                : "Your shop dashboard is in preview mode. Activate AutoPay below to unlock full real-time POS, ledger, and WhatsApp reports."}
            </p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">Billing Timeline</CardTitle>
              <CardDescription>Next renewal schedule</CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Renews On</span>
              <span className="font-semibold">
                {data?.subscriptionEndDate
                  ? new Date(data.subscriptionEndDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Not started"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Days Remaining</span>
              <span className={`font-semibold ${isActive ? "text-success" : "text-muted-foreground"}`}>
                {isActive ? `${data?.daysRemaining || 0} days` : "0 days"}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{
                  width: isActive ? `${Math.min(100, Math.max(5, ((data?.daysRemaining || 0) / (data?.billingCycle === "ANNUAL" ? 365 : 30)) * 100))}%` : "0%",
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Selection Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Select Subscription Plan</h3>
          <p className="text-sm text-muted-foreground">
            Subscription rate is configured by your field agent. Select your preferred billing cycle:
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* 1. Monthly Plan */}
          <Card
            className={`cursor-pointer transition-all border-2 relative ${
              selectedCycle === "MONTHLY"
                ? "border-primary shadow-md bg-primary/[0.02]"
                : "border-border hover:border-primary/50"
            }`}
            onClick={() => setSelectedCycle("MONTHLY")}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold">Monthly Plan</CardTitle>
                  <CardDescription>Billed month-to-month with AutoPay</CardDescription>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${selectedCycle === "MONTHLY" ? "border-primary bg-primary text-white" : "border-muted-foreground/30"}`}>
                  {selectedCycle === "MONTHLY" && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-foreground">₹{monthlyPrice.toLocaleString("en-IN")}</span>
                <span className="text-muted-foreground text-sm font-medium">/ month</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Full access to POS, Inventory, and Ledger</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Daily 8 PM WhatsApp overview reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Recurring AutoPay on the 1st of every month</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 2. Annual Plan with 15% OFF */}
          <Card
            className={`cursor-pointer transition-all border-2 relative overflow-hidden ${
              selectedCycle === "ANNUAL"
                ? "border-emerald-500 shadow-md bg-emerald-50/10"
                : "border-border hover:border-emerald-500/50"
            }`}
            onClick={() => setSelectedCycle("ANNUAL")}
          >
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1 shadow-sm uppercase tracking-wider">
              <Sparkles className="h-3 w-3" /> Save 15%
            </div>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                    Annual Plan
                  </CardTitle>
                  <CardDescription>12 Months upfront with 15% discount</CardDescription>
                </div>
                <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${selectedCycle === "ANNUAL" ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"}`}>
                  {selectedCycle === "ANNUAL" && <div className="h-2 w-2 bg-white rounded-full" />}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-emerald-700 dark:text-emerald-300">
                  ₹{annualPrice.toLocaleString("en-IN")}
                </span>
                <span className="text-muted-foreground text-sm font-medium line-through">
                  ₹{(monthlyPrice * 12).toLocaleString("en-IN")}
                </span>
                <span className="text-muted-foreground text-sm font-medium">/ year</span>
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-md w-fit">
                You save ₹{annualSavings.toLocaleString("en-IN")} per year
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>365 days uninterrupted dashboard access</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Priority WhatsApp notification delivery</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Protected price lock for 1 full year</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* AutoPay Toggle & Action Card */}
        <Card className="border shadow-sm p-6 bg-card">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAutoPayEnabled}
                  onChange={(e) => setIsAutoPayEnabled(e.target.checked)}
                  className="rounded border-gray-300 text-primary h-4 w-4 focus:ring-primary"
                />
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" /> Enable AutoPay Mandate
                </span>
              </label>
              <p className="text-xs text-muted-foreground pl-7">
                Automatically renews {selectedCycle === "ANNUAL" ? "annually at 15% discount" : "monthly"} so your store never experiences downtime.
              </p>
            </div>
            
            <Button
              size="lg"
              className="gradient-btn shadow-md text-base px-8 w-full sm:w-auto"
              onClick={handlePayAndActivate}
              disabled={isProcessing}
            >
              <CreditCard className="mr-2 h-5 w-5" />
              {isProcessing
                ? "Processing..."
                : isActive
                ? `Switch / Renew (${selectedCycle === "ANNUAL" ? `₹${annualPrice.toLocaleString("en-IN")}` : `₹${monthlyPrice.toLocaleString("en-IN")}`})`
                : `Pay & Activate (${selectedCycle === "ANNUAL" ? `₹${annualPrice.toLocaleString("en-IN")}` : `₹${monthlyPrice.toLocaleString("en-IN")}`})`}
            </Button>
          </div>
        </Card>
      </div>

      {/* Real Billing History */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Billing & AutoPay History</CardTitle>
          </div>
          <CardDescription>
            Live transactions and invoices recorded for your shop account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.billingHistory && data.billingHistory.length > 0 ? (
                data.billingHistory.map((rec, index) => (
                  <TableRow key={rec.transactionId || index}>
                    <TableCell className="font-medium">
                      {new Date(rec.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{rec.transactionId}</TableCell>
                    <TableCell>{rec.plan}</TableCell>
                    <TableCell>{rec.paymentMethod}</TableCell>
                    <TableCell className="text-right font-semibold">₹{rec.amount.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                        {rec.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payment history yet. Complete your first AutoPay activation above to record an invoice.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
