import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Trash2, ReceiptText, Info, Copy, Link as LinkIcon, IndianRupee, Printer, CheckCircle2, Calendar, CalendarDays, History, Filter, RotateCcw, Minus, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import BannerSlideshow from "@/components/BannerSlideshow";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatProductName } from "@/lib/utils";

interface Product {
  _id: string;
  name: string;
  sellingPrice: number;
  category?: string;
  description?: string;
  stock?: number;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  qty: number;
  total: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState("walkin");
  
  // Info Modal
  const [infoProduct, setInfoProduct] = useState<Product | null>(null);

  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [downPayment, setDownPayment] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Receipt Modal
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Sales History
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [salesSummary, setSalesSummary] = useState({ todaySales: 0, overallSales: 0 });

  // Date Bill State
  const [dateBillDate, setDateBillDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dateBillSelectedFarmer, setDateBillSelectedFarmer] = useState("walkin");
  const [dateBillCustomerName, setDateBillCustomerName] = useState("");
  const [dateBillCustomerPhone, setDateBillCustomerPhone] = useState("");
  const [dateBillCart, setDateBillCart] = useState<CartItem[]>([]);
  const [dateBillSearchTerm, setDateBillSearchTerm] = useState("");
  const [dateBillPaymentMethod, setDateBillPaymentMethod] = useState("CASH");
  const [dateBillDownPayment, setDateBillDownPayment] = useState("");
  const [dateBillNotes, setDateBillNotes] = useState("");
  const [isSubmittingDateBill, setIsSubmittingDateBill] = useState(false);
  const [dateBillsTrack, setDateBillsTrack] = useState<any[]>([]);
  const [dateBillSubView, setDateBillSubView] = useState<"create" | "track">("create");
  const [dateBillTrackSearch, setDateBillTrackSearch] = useState("");
  const [dateBillFilterDate, setDateBillFilterDate] = useState("");

  // Cashier Mode
  const [isCashierMode, setIsCashierMode] = useState(false);
  const [cashierUrl, setCashierUrl] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [inventoryRes, farmersRes, salesRes, summaryRes, dateBillsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/inventory?limit=1000`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/farmers`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/sales?limit=100`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/dashboard/summary`, { headers: getHeaders() }),
          fetch(`${API_BASE_URL}/sales?isDateBill=true&limit=500`, { headers: getHeaders() }),
        ]);
        const inventoryData = await inventoryRes.json();
        const farmersData = await farmersRes.json();
        const salesData = await salesRes.json();
        const summaryData = await summaryRes.json();
        const dateBillsData = await dateBillsRes.json();

        if (inventoryRes.ok && inventoryData.success) {
          const mappedProducts = inventoryData.data.map((item: any) => ({
            ...item.productId,
            stock: item.quantity
          }));
          setProducts(mappedProducts || []);
        }
        if (farmersRes.ok && farmersData.success) {
          setFarmers(farmersData.data || []);
        }
        if (salesRes.ok && salesData.success) {
          setSalesHistory(salesData.data || []);
        }
        if (dateBillsRes.ok && dateBillsData.success) {
          setDateBillsTrack(dateBillsData.data || []);
        } else if (salesRes.ok && salesData.success) {
          setDateBillsTrack((salesData.data || []).filter((s: any) => s.isDateBill));
        }
        if (summaryRes.ok && summaryData.success) {
          setSalesSummary({
            todaySales: summaryData.data.todaySales || 0,
            overallSales: summaryData.data.overallSales || 0
          });
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    // Init Cashier Mode state
    const shopData = localStorage.getItem("shop");
    if (shopData) {
      const shop = JSON.parse(shopData);
      if (shop.isCashierEnabled && shop.cashierToken) {
        setIsCashierMode(true);
        setCashierUrl(`${window.location.origin}/cashier/auth/${shop._id}/${shop.cashierToken}`);
      }
    }
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.productId === product._id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product._id
            ? { ...item, qty: item.qty + 1, total: (item.qty + 1) * item.price }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: product._id, name: formatProductName(product.name), price: product.sellingPrice, qty: 1, total: product.sellingPrice }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const grandTotal = cart.reduce((acc, item) => acc + item.total, 0);

  const filteredProducts = products.filter((p) => {
    const formatted = formatProductName(p.name);
    const term = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || formatted.toLowerCase().includes(term);
  });

  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    
    // Default down payment to full total for Cash
    setDownPayment(grandTotal.toString());
    setPaymentMethod("CASH");
    if (selectedFarmer !== "walkin") {
      const f = farmers.find(f => f._id === selectedFarmer);
      if (f) {
        setCustomerName(f.name);
        setCustomerPhone(f.phone || "");
      }
    } else {
      setCustomerName("");
      setCustomerPhone("");
    }
    setIsCheckoutOpen(true);
  };

  const handlePrintBill = async (sale: any) => {
    if (!sale) return;

    let saleToPrint = sale;
    if ((!sale.cartItems || sale.cartItems.length === 0) && (!sale.items || sale.items.length === 0) && sale._id) {
      try {
        const res = await fetch(`${API_BASE_URL}/sales/${sale._id}`, { headers: getHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          saleToPrint = {
            ...data.data.sale,
            items: data.data.items,
          };
        }
      } catch (e) {
        console.error("Failed to fetch full sale items for printing", e);
      }
    }

    const printWindow = window.open("", "_blank", "width=420,height=650");
    if (!printWindow) {
      window.print();
      return;
    }

    const grandTotal = saleToPrint.total ?? saleToPrint.totalAmount ?? 0;
    const downPayment = saleToPrint.downPayment ?? saleToPrint.amountPaid ?? 0;
    const balance = grandTotal - downPayment;
    const billDate = saleToPrint.saleDate
      ? new Date(saleToPrint.saleDate)
      : (saleToPrint.createdAt ? new Date(saleToPrint.createdAt) : new Date());

    const itemRows = (saleToPrint.cartItems || saleToPrint.items || []).map((item: any) => {
      const name = formatProductName(item.name || item.productName || item.productId?.name || "Item");
      const qty = item.qty || item.quantity || 1;
      const price = item.price || item.unitPrice || 0;
      const total = item.total || item.subtotal || qty * price;
      return `
        <tr>
          <td style="padding: 4px 0; word-break: break-word;">${name}</td>
          <td style="padding: 4px 0; text-align: center;">${qty}</td>
          <td style="padding: 4px 0; text-align: right;">${price}</td>
          <td style="padding: 4px 0; text-align: right; font-weight: 600;">${total}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${saleToPrint.invoiceNumber || "Bill"}</title>
          <style>
            @page { margin: 4mm; size: 80mm auto; }
            body { font-family: monospace, -apple-system, sans-serif; font-size: 12px; color: #000; margin: 0; padding: 10px; width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .dashed { border-top: 1px dashed #666; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th { border-bottom: 1px dashed #666; padding: 4px 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <h2 style="margin: 0; font-size: 16px;" class="bold">${saleToPrint.shop?.name || "AGRIFLOW SHOP"}</h2>
            <div style="font-size: 10px; color: #444;">${saleToPrint.shop?.address || ""}</div>
            <div style="font-size: 10px; color: #444;">Ph: ${saleToPrint.shop?.phone || ""}</div>
          </div>
          <div class="dashed"></div>
          <div style="font-size: 10px;">
            <div class="row">
              <span>Inv: <b>${saleToPrint.invoiceNumber || "—"}</b></span>
              <span>Date: <b>${billDate.toLocaleDateString("en-IN")}</b></span>
            </div>
            <div class="row"><span>Cust: <b>${saleToPrint.customerName || saleToPrint.farmerId?.name || "Walk-in"}</b></span></div>
            ${saleToPrint.isDateBill ? `<div class="row" style="color: #555;"><span>Type: <b>Date Bill</b></span></div>` : ""}
            ${saleToPrint.notes ? `<div class="row" style="color: #555;"><span>Notes: ${saleToPrint.notes}</span></div>` : ""}
          </div>
          <div class="dashed"></div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">Item</th>
                <th style="text-align: center; width: 35px;">Qty</th>
                <th style="text-align: right; width: 45px;">Price</th>
                <th style="text-align: right; width: 50px;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <div class="dashed"></div>
          <div class="row bold" style="font-size: 13px;"><span>Grand Total:</span><span>₹${grandTotal.toLocaleString("en-IN")}</span></div>
          <div class="row"><span>Paid (${saleToPrint.paymentMethod || "CASH"}):</span><span>₹${Number(downPayment).toLocaleString("en-IN")}</span></div>
          ${saleToPrint.paymentMethod === "CREDIT" || (saleToPrint.amountDue && saleToPrint.amountDue > 0) ? `<div class="row bold"><span>Balance (Credit):</span><span>₹${(saleToPrint.amountDue ?? balance).toLocaleString("en-IN")}</span></div>` : ""}
          <div class="dashed"></div>
          <div class="center" style="margin-top: 10px;">
            <div class="bold" style="font-size: 12px; font-style: italic;">Thanks for visiting! See you again!</div>
            <div style="font-size: 9px; color: #666; margin-top: 4px;">Software by BluNet IT Services</div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (selectedFarmer === "walkin" && paymentMethod === "CREDIT") {
      toast.error("Walk-in customers cannot be given credit. Please register the farmer first.");
      return;
    }
    if (selectedFarmer === "walkin" && !customerName.trim()) {
      toast.error("Please enter a customer name for walk-in billing.");
      return;
    }

    setIsSubmitting(true);
    try {
      let finalPaymentMethod = paymentMethod;
      const amtPaid = Number(downPayment) || 0;

      if (paymentMethod === "CREDIT" && amtPaid > 0 && amtPaid < grandTotal) {
        finalPaymentMethod = "PARTIAL";
      } else if (paymentMethod === "CREDIT" && amtPaid >= grandTotal) {
        finalPaymentMethod = "CASH";
      }

      const payload = {
        farmerId: selectedFarmer === "walkin" ? undefined : selectedFarmer, 
        customerName: selectedFarmer === "walkin" ? customerName : undefined,
        customerPhone: selectedFarmer === "walkin" ? customerPhone : undefined,
        invoiceNumber: `INV-${Date.now()}`,
        paymentMethod: finalPaymentMethod,
        amountPaid: amtPaid,
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.qty,
          discount: 0
        }))
      };

      const res = await fetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Invoice generated successfully!");
        setCompletedSale({
          ...data.data,
          cartItems: cart, // Save cart details for receipt
          paymentMethod: finalPaymentMethod,
          downPayment: amtPaid
        });
        setCart([]);
        setIsCheckoutOpen(false);
      } else {
        throw new Error(data.message || "Failed to generate invoice");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleToggleCashierMode = async () => {
    try {
      const newState = !isCashierMode;
      const res = await fetch(`${API_BASE_URL}/auth/cashier/toggle`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newState }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setIsCashierMode(newState);
        
        const shopData = localStorage.getItem("shop");
        if (shopData) {
          const shop = JSON.parse(shopData);
          shop.isCashierEnabled = newState;
          shop.cashierToken = data.data.cashierToken;
          localStorage.setItem("shop", JSON.stringify(shop));
          
          if (newState) {
            setCashierUrl(`${window.location.origin}/cashier/auth/${shop._id}/${data.data.cashierToken}`);
            toast.success("Cashier Mode enabled");
          } else {
            setCashierUrl("");
            toast.success("Cashier Mode disabled");
          }
        }
      } else {
        toast.error(data.message || "Failed to toggle Cashier Mode");
      }
    } catch (err) {
      toast.error("Failed to connect to server");
    }
  };

  const copyCashierUrl = () => {
    navigator.clipboard.writeText(cashierUrl);
    toast.success("Cashier link copied to clipboard!");
  };

  // Date Bill helpers & actions
  const formatDateDisplay = (dateStr?: string | Date) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const dateBillGrandTotal = dateBillCart.reduce((acc, item) => acc + item.total, 0);

  const addDateBillToCart = (product: Product) => {
    const existing = dateBillCart.find((item) => item.productId === product._id);
    if (existing) {
      const newQty = existing.qty + 1;
      const newCart = dateBillCart.map((item) =>
        item.productId === product._id
          ? { ...item, qty: newQty, total: newQty * item.price }
          : item
      );
      setDateBillCart(newCart);
      if (dateBillPaymentMethod !== "CREDIT") {
        const newTotal = newCart.reduce((acc, item) => acc + item.total, 0);
        setDateBillDownPayment(newTotal.toString());
      }
    } else {
      const newCart = [
        ...dateBillCart,
        {
          productId: product._id,
          name: formatProductName(product.name),
          price: product.sellingPrice,
          qty: 1,
          total: product.sellingPrice,
        },
      ];
      setDateBillCart(newCart);
      if (dateBillPaymentMethod !== "CREDIT") {
        const newTotal = newCart.reduce((acc, item) => acc + item.total, 0);
        setDateBillDownPayment(newTotal.toString());
      }
    }
  };

  const updateDateBillQty = (productId: string, delta: number) => {
    const newCart = dateBillCart
      .map((item) => {
        if (item.productId === productId) {
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty, total: newQty * item.price } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];
    setDateBillCart(newCart);
    if (dateBillPaymentMethod !== "CREDIT") {
      const newTotal = newCart.reduce((acc, item) => acc + item.total, 0);
      setDateBillDownPayment(newTotal.toString());
    }
  };

  const removeDateBillFromCart = (productId: string) => {
    const newCart = dateBillCart.filter((item) => item.productId !== productId);
    setDateBillCart(newCart);
    if (dateBillPaymentMethod !== "CREDIT") {
      const newTotal = newCart.reduce((acc, item) => acc + item.total, 0);
      setDateBillDownPayment(newTotal.toString());
    }
  };

  const handleGenerateDateBill = async () => {
    if (!dateBillDate) {
      toast.error("Please select a date for the bill.");
      return;
    }
    if (dateBillCart.length === 0) {
      toast.error("Please add at least one product to the bill.");
      return;
    }
    if (dateBillSelectedFarmer === "walkin" && dateBillPaymentMethod === "CREDIT") {
      toast.error("Walk-in customers cannot take credit. Please select a registered farmer.");
      return;
    }
    if (dateBillSelectedFarmer === "walkin" && !dateBillCustomerName.trim()) {
      toast.error("Please enter a customer name for the date bill.");
      return;
    }

    setIsSubmittingDateBill(true);
    try {
      let finalPaymentMethod = dateBillPaymentMethod;
      const amtPaid = Number(dateBillDownPayment) || 0;

      if (dateBillPaymentMethod === "CREDIT" && amtPaid > 0 && amtPaid < dateBillGrandTotal) {
        finalPaymentMethod = "PARTIAL";
      } else if (dateBillPaymentMethod === "CREDIT" && amtPaid >= dateBillGrandTotal) {
        finalPaymentMethod = "CASH";
      }

      const invoiceNumber = `INV-DB-${Date.now().toString().slice(-8)}`;
      const chosenDate = new Date(`${dateBillDate}T12:00:00.000Z`);

      const payload = {
        farmerId: dateBillSelectedFarmer === "walkin" ? undefined : dateBillSelectedFarmer,
        customerName: dateBillSelectedFarmer === "walkin" ? dateBillCustomerName.trim() : undefined,
        customerPhone: dateBillSelectedFarmer === "walkin" ? (dateBillCustomerPhone.trim() || undefined) : undefined,
        invoiceNumber,
        paymentMethod: finalPaymentMethod,
        amountPaid: amtPaid,
        saleDate: chosenDate.toISOString(),
        isDateBill: true,
        notes: dateBillNotes.trim() || `Date Bill (${dateBillDate})`,
        items: dateBillCart.map((item) => ({
          productId: item.productId,
          quantity: item.qty,
          discount: 0,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/sales`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Date Bill generated for ${dateBillDate}!`);
        
        const newSaleRecord = {
          ...data.data,
          cartItems: dateBillCart,
          paymentMethod: finalPaymentMethod,
          downPayment: amtPaid,
          saleDate: chosenDate.toISOString(),
          isDateBill: true,
          notes: payload.notes,
        };

        setCompletedSale(newSaleRecord);
        setDateBillsTrack((prev) => [newSaleRecord, ...prev]);
        setSalesHistory((prev) => [newSaleRecord, ...prev]);

        // Reset cart and fields
        setDateBillCart([]);
        setDateBillDownPayment("");
        setDateBillNotes("");
        if (dateBillSelectedFarmer === "walkin") {
          setDateBillCustomerName("");
          setDateBillCustomerPhone("");
        }
      } else {
        throw new Error(data.message || "Failed to generate Date Bill");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong while generating Date Bill.");
    } finally {
      setIsSubmittingDateBill(false);
    }
  };

  const filteredDateBillProducts = products.filter((p) => {
    const formatted = formatProductName(p.name);
    const term = dateBillSearchTerm.toLowerCase();
    return p.name.toLowerCase().includes(term) || formatted.toLowerCase().includes(term);
  });

  const filteredDateBills = dateBillsTrack.filter((bill) => {
    const term = dateBillTrackSearch.toLowerCase();
    const invMatch = bill.invoiceNumber?.toLowerCase().includes(term);
    const custMatch =
      bill.customerName?.toLowerCase().includes(term) ||
      bill.farmerId?.name?.toLowerCase().includes(term) ||
      bill.customerPhone?.includes(term);

    let dateMatch = true;
    if (dateBillFilterDate) {
      const bDate = bill.saleDate || bill.createdAt;
      if (bDate) {
        const billDateStr = new Date(bDate).toISOString().split("T")[0];
        dateMatch = billDateStr === dateBillFilterDate;
      }
    }

    return (invMatch || custMatch) && dateMatch;
  });

  const totalDateBillsCount = dateBillsTrack.length;
  const totalDateBillsAmount = dateBillsTrack.reduce((sum, b) => sum + (b.total ?? b.totalAmount ?? 0), 0);
  const totalDateBillsCollected = dateBillsTrack.reduce((sum, b) => sum + (b.amountPaid ?? b.downPayment ?? 0), 0);
  const totalDateBillsDue = dateBillsTrack.reduce((sum, b) => sum + (b.amountDue ?? ((b.total ?? 0) - (b.amountPaid ?? 0))), 0);

  // Check if current user is cashier
  const userData = localStorage.getItem("user");
  const isCashier = userData ? JSON.parse(userData).role === "CASHIER" : false;

  const filteredHistory = salesHistory.filter(sale => {
    const term = historySearchTerm.toLowerCase();
    const invMatch = sale.invoiceNumber?.toLowerCase().includes(term);
    const custMatch = sale.customerName?.toLowerCase().includes(term) || sale.farmerId?.name?.toLowerCase().includes(term);
    return invMatch || custMatch;
  });

  return (
    <div className="space-y-6 flex flex-col h-full">
      <BannerSlideshow />
      <Tabs defaultValue="pos" className="space-y-6 flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales</h2>
          <p className="text-muted-foreground">
            Manage point of sale and sales history.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <TabsList>
            <TabsTrigger value="pos">Point of Sale</TabsTrigger>
            <TabsTrigger value="date-bill" className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> Date Bill
            </TabsTrigger>
            <TabsTrigger value="history">Sales History</TabsTrigger>
          </TabsList>
        
        {!isCashier && (
          <div className="flex flex-col gap-2 p-3 bg-muted/20 border rounded-lg w-full sm:w-auto">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cashier Desk Link</span>
              </div>
              
              {/* Custom Tailwind Toggle */}
              <button 
                type="button"
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isCashierMode ? 'bg-primary' : 'bg-input'}`}
                role="switch"
                aria-checked={isCashierMode}
                onClick={handleToggleCashierMode}
              >
                <span className="sr-only">Toggle Cashier Mode</span>
                <span 
                  aria-hidden="true" 
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${isCashierMode ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {isCashierMode && cashierUrl && (
              <div className="flex items-center gap-2">
                <Input value={cashierUrl} readOnly className="h-8 text-xs w-full sm:w-64" />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyCashierUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      <TabsContent value="pos" className="flex-1 mt-0">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2 flex flex-col h-full">
          <Card className="flex-1 flex flex-col h-full border shadow-sm">
            <CardHeader className="pb-3 border-b shrink-0">
              <div className="flex justify-between items-center">
                <CardTitle>Products</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="pl-9 bg-muted/50"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto content-start auto-rows-max min-h-[520px]">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  {searchTerm ? "No products match your search." : "No products available. Add products in Inventory first."}
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="border rounded-lg p-3 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col justify-between min-h-[140px] relative group"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm line-clamp-2 pr-6 leading-tight">{formatProductName(product.name)}</h4>
                        {product.description && (
                          <div 
                            className="absolute top-2 right-2 text-muted-foreground hover:text-primary z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoProduct(product);
                            }}
                          >
                            <Info className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{product.category || ""}</p>
                    </div>
                    <div className="flex justify-between items-end mt-2 pt-1 border-t border-muted/40">
                      <div>
                        <span className="font-semibold text-primary text-base">₹{product.sellingPrice}</span>
                        <div className={`text-xs mt-0.5 font-medium ${(product.stock || 0) <= 0 ? "text-destructive" : (product.stock || 0) <= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                          Stock: {product.stock || 0}
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary hover:text-white"
                        disabled={(product.stock || 0) <= 0}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 flex flex-col h-full">
          <Card className="flex-1 flex flex-col h-full border shadow-sm sticky top-4">
            <CardHeader className="pb-3 border-b bg-muted/20 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold">Current Sale</CardTitle>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block font-medium">Grand Total</span>
                  <span className="text-xl font-bold text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Select Farmer</Label>
                <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select farmer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {farmers.map((f: any) => (
                      <SelectItem key={f._id} value={f._id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TOP ACTION BUTTON: Placed right at the top so it is always visible without scrolling */}
              <Button 
                className="w-full gradient-btn shadow-md py-5 text-base font-semibold" 
                disabled={cart.length === 0} 
                onClick={handleOpenCheckout}
              >
                <ReceiptText className="mr-2 h-5 w-5" /> Generate Invoice ({cart.length} {cart.length === 1 ? 'item' : 'items'} • ₹{grandTotal.toLocaleString("en-IN")})
              </Button>
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-y-auto max-h-[380px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-center w-16">Qty</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                        Click products to add them to the cart
                      </TableCell>
                    </TableRow>
                  ) : (
                    cart.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium text-sm py-2.5">
                          {formatProductName(item.name)}
                          <div className="text-xs text-muted-foreground">₹{item.price}/unit</div>
                        </TableCell>
                        <TableCell className="text-center font-medium">{item.qty}</TableCell>
                        <TableCell className="text-right font-medium py-2.5">₹{item.total}</TableCell>
                        <TableCell className="py-2.5 px-2">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => removeFromCart(item.productId)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>

            {cart.length > 0 && (
              <CardFooter className="flex justify-between items-center border-t bg-muted/10 py-2.5 px-4 shrink-0 text-xs">
                <span className="text-muted-foreground font-medium">{cart.length} {cart.length === 1 ? 'item' : 'items'} in bill</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2 font-medium"
                  onClick={() => setCart([])}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Clear Cart
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!infoProduct} onOpenChange={() => setInfoProduct(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="uppercase">{formatProductName(infoProduct?.name)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{infoProduct?.description}</p>
          </div>
          <DialogFooter>
            <Button onClick={() => setInfoProduct(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
            <DialogDescription>
              Review payment details before generating invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3 bg-muted/20 p-3 rounded-lg border">
              <h4 className="font-semibold text-sm flex items-center justify-between">
                Customer Details
                {selectedFarmer !== "walkin" && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">Registered Farmer</span>
                )}
              </h4>
              <div className="grid gap-2 relative">
                <Label htmlFor="customerName">Name *</Label>
                <Input 
                  id="customerName" 
                  autoComplete="off"
                  placeholder="Enter name to search farmers or add new" 
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (selectedFarmer !== "walkin") {
                      setSelectedFarmer("walkin");
                    }
                  }}
                />
                {customerName.length > 0 && selectedFarmer === "walkin" && (
                  <div className="absolute top-[100%] left-0 w-full z-50 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                    {farmers
                      .filter(f => f.name.toLowerCase().includes(customerName.toLowerCase()) || (f.phone && f.phone.includes(customerName)))
                      .map(f => (
                        <div 
                          key={f._id}
                          className="px-3 py-2 cursor-pointer hover:bg-muted text-sm border-b last:border-0"
                          onClick={() => {
                            setCustomerName(f.name);
                            setCustomerPhone(f.phone || "");
                            setSelectedFarmer(f._id);
                          }}
                        >
                          <div className="font-medium">{f.name}</div>
                          {f.phone && <div className="text-xs text-muted-foreground">{f.phone}</div>}
                        </div>
                      ))}
                    {farmers.filter(f => f.name.toLowerCase().includes(customerName.toLowerCase()) || (f.phone && f.phone.includes(customerName))).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground italic">No registered farmers found. Will bill as walk-in.</div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="customerPhone">Phone (Optional)</Label>
                <Input 
                  id="customerPhone" 
                  placeholder="Enter phone number" 
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-lg font-bold bg-muted/30 p-3 rounded-lg border">
              <span>Grand Total</span>
              <span className="text-primary">₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>

            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  type="button" 
                  variant={paymentMethod === "CASH" ? "default" : "outline"} 
                  onClick={() => { setPaymentMethod("CASH"); setDownPayment(grandTotal.toString()); }}
                >
                  Cash
                </Button>
                <Button 
                  type="button" 
                  variant={paymentMethod === "CREDIT" ? "default" : "outline"}
                  onClick={() => { setPaymentMethod("CREDIT"); setDownPayment("0"); }}
                >
                  Credit
                </Button>
              </div>
            </div>

            {paymentMethod === "CREDIT" && (
              <div className="space-y-4 pt-2 border-t">
                {selectedFarmer === "walkin" && (
                  <div className="text-sm text-destructive font-medium bg-destructive/10 p-2 rounded">
                    Warning: Walk-in customers cannot take credit. Please select a registered farmer.
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Down Payment (Amount Paid)</Label>
                  <Input 
                    type="number" 
                    value={downPayment} 
                    onChange={(e) => setDownPayment(e.target.value)} 
                    max={grandTotal}
                    min={0}
                  />
                </div>
                
                <div className="flex justify-between items-center text-sm p-3 bg-warning/10 text-warning-foreground rounded-lg border border-warning/20">
                  <span className="font-medium">Credit Amount to Ledger:</span>
                  <span className="font-bold">
                    ₹{Math.max(0, grandTotal - (Number(downPayment) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
            
            {paymentMethod === "CASH" && (
              <div className="space-y-2 pt-2 border-t">
                <Label>Amount Collected</Label>
                <Input 
                  type="number" 
                  value={downPayment} 
                  onChange={(e) => setDownPayment(e.target.value)} 
                />
              </div>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={isSubmitting || (paymentMethod === "CREDIT" && selectedFarmer === "walkin")}>
              {isSubmitting ? "Processing..." : "Confirm & Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="date-bill" className="flex-1 mt-0 space-y-6">
        {/* Sub-view Switcher & Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border rounded-xl p-4 shadow-sm">
          <div>
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-primary" /> Date Bill Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Generate custom or backdated sales invoices with exact date selection and track all date bills.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant={dateBillSubView === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateBillSubView("create")}
              className="flex-1 sm:flex-none gap-1.5 font-medium"
            >
              <Plus className="h-4 w-4" /> Generate Date Bill
            </Button>
            <Button
              type="button"
              variant={dateBillSubView === "track" ? "default" : "outline"}
              size="sm"
              onClick={() => setDateBillSubView("track")}
              className="flex-1 sm:flex-none gap-1.5 font-medium"
            >
              <History className="h-4 w-4" /> Track Date Bills ({totalDateBillsCount})
            </Button>
          </div>
        </div>

        {/* Date Bills KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm bg-primary/5 border-primary/20">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-primary flex items-center justify-between">
                <span>Total Date Bills</span>
                <CalendarDays className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-primary">{totalDateBillsCount}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recorded date bills</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-muted/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Total Value</span>
                <IndianRupee className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-foreground">₹{totalDateBillsAmount.toLocaleString("en-IN")}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Gross date bills volume</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                <span>Collected</span>
                <CheckCircle2 className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">₹{totalDateBillsCollected.toLocaleString("en-IN")}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Cash / UPI / Card paid</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center justify-between">
                <span>Credit Outstanding</span>
                <ReceiptText className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">₹{totalDateBillsDue.toLocaleString("en-IN")}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Credit balance to collect</p>
            </CardContent>
          </Card>
        </div>

        {/* View 1: Generate Date Bill */}
        {dateBillSubView === "create" && (
          <div className="space-y-6">
            {/* Bill Settings Header Bar */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Step 1: Select Date & Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Date Selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="dateBillDate" className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Bill Date *
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="dateBillDate"
                      type="date"
                      value={dateBillDate}
                      onChange={(e) => setDateBillDate(e.target.value)}
                      className="h-9 font-medium"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant={dateBillDate === new Date().toISOString().split("T")[0] ? "default" : "outline"}
                      className="h-9 text-xs px-2.5 shrink-0"
                      onClick={() => setDateBillDate(new Date().toISOString().split("T")[0])}
                    >
                      Today
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 text-xs px-2.5 shrink-0"
                      onClick={() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        setDateBillDate(y.toISOString().split("T")[0]);
                      }}
                    >
                      Yesterday
                    </Button>
                  </div>
                </div>

                {/* 2. Customer Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Customer / Farmer *</Label>
                  <Select
                    value={dateBillSelectedFarmer}
                    onValueChange={(val) => {
                      setDateBillSelectedFarmer(val);
                      if (val !== "walkin") {
                        const f = farmers.find((x) => x._id === val);
                        if (f) {
                          setDateBillCustomerName(f.name);
                          setDateBillCustomerPhone(f.phone || "");
                        }
                      } else {
                        setDateBillCustomerName("");
                        setDateBillCustomerPhone("");
                      }
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select farmer or Walk-in" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">Walk-in Customer</SelectItem>
                      {farmers.map((f: any) => (
                        <SelectItem key={f._id} value={f._id}>
                          {f.name} {f.phone ? `(${f.phone})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 3. Walk-in details or Bill Notes */}
                {dateBillSelectedFarmer === "walkin" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dateBillCustName" className="text-xs font-semibold">Name *</Label>
                      <Input
                        id="dateBillCustName"
                        placeholder="Customer name"
                        value={dateBillCustomerName}
                        onChange={(e) => setDateBillCustomerName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dateBillCustPhone" className="text-xs font-semibold">Phone (Opt)</Label>
                      <Input
                        id="dateBillCustPhone"
                        placeholder="Phone"
                        value={dateBillCustomerPhone}
                        onChange={(e) => setDateBillCustomerPhone(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="dateBillNotes" className="text-xs font-semibold">Notes / Reference (Optional)</Label>
                    <Input
                      id="dateBillNotes"
                      placeholder="e.g. Backdated dispatch note"
                      value={dateBillNotes}
                      onChange={(e) => setDateBillNotes(e.target.value)}
                      className="h-9"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Split Grid: Products on Left, Cart & Billing on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              {/* Product Catalog Card */}
              <div className="lg:col-span-2 flex flex-col h-full">
                <Card className="flex-1 flex flex-col h-full border shadow-sm">
                  <CardHeader className="pb-3 border-b shrink-0">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" /> Step 2: Add Products to Date Bill
                      </CardTitle>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          className="pl-9 bg-muted/50 h-9 text-xs"
                          value={dateBillSearchTerm}
                          onChange={(e) => setDateBillSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto content-start auto-rows-max min-h-[460px] max-h-[620px]">
                    {filteredDateBillProducts.length === 0 ? (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        {dateBillSearchTerm ? "No products match your search." : "No products available in inventory."}
                      </div>
                    ) : (
                      filteredDateBillProducts.map((product) => {
                        const inCart = dateBillCart.find((it) => it.productId === product._id);
                        return (
                          <div
                            key={product._id}
                            className={`border rounded-lg p-3 hover:border-primary hover:shadow-sm cursor-pointer transition-all bg-card flex flex-col justify-between min-h-[135px] relative group ${inCart ? 'border-primary/60 bg-primary/5 ring-1 ring-primary/30' : ''}`}
                            onClick={() => addDateBillToCart(product)}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-xs sm:text-sm line-clamp-2 leading-tight">
                                  {formatProductName(product.name)}
                                </h4>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{product.category || ""}</p>
                            </div>
                            <div className="flex justify-between items-end mt-2 pt-1 border-t border-muted/40">
                              <div>
                                <span className="font-semibold text-primary text-sm sm:text-base">₹{product.sellingPrice}</span>
                                <div className={`text-[11px] mt-0.5 font-medium ${(product.stock || 0) <= 0 ? "text-destructive" : (product.stock || 0) <= 10 ? "text-amber-600" : "text-muted-foreground"}`}>
                                  Stock: {product.stock || 0}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {inCart && (
                                  <span className="text-xs font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                                    {inCart.qty}
                                  </span>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-full bg-primary/10 hover:bg-primary hover:text-white"
                                  disabled={(product.stock || 0) <= 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addDateBillToCart(product);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Date Bill Cart & Checkout Card */}
              <div className="lg:col-span-1 flex flex-col h-full">
                <Card className="flex-1 flex flex-col h-full border shadow-sm sticky top-4">
                  <CardHeader className="pb-3 border-b bg-muted/20 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">Date Bill Cart</CardTitle>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">
                        <Calendar className="h-3 w-3" /> {formatDateDisplay(dateBillDate)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        Customer: <span className="font-semibold text-foreground">{dateBillSelectedFarmer !== "walkin" ? (farmers.find(f => f._id === dateBillSelectedFarmer)?.name || "Registered Farmer") : (dateBillCustomerName || "Walk-in Customer")}</span>
                      </span>
                      <span className="text-base font-bold text-primary">₹{dateBillGrandTotal.toLocaleString("en-IN")}</span>
                    </div>

                    {/* TOP ACTION BUTTON: Generate Date Bill right at top */}
                    <Button
                      className="w-full gradient-btn shadow-md py-5 text-sm font-semibold"
                      disabled={dateBillCart.length === 0 || isSubmittingDateBill || (dateBillPaymentMethod === "CREDIT" && dateBillSelectedFarmer === "walkin")}
                      onClick={handleGenerateDateBill}
                    >
                      <ReceiptText className="mr-2 h-4 w-4" />
                      {isSubmittingDateBill ? "Generating..." : `Generate Date Bill (${dateBillCart.length} ${dateBillCart.length === 1 ? 'item' : 'items'} • ₹${dateBillGrandTotal.toLocaleString("en-IN")})`}
                    </Button>
                  </CardHeader>

                  <CardContent className="flex-1 p-0 overflow-y-auto max-h-[300px]">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs">Item</TableHead>
                          <TableHead className="text-center w-24 text-xs">Qty</TableHead>
                          <TableHead className="text-right text-xs">Total</TableHead>
                          <TableHead className="w-8"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dateBillCart.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground text-xs">
                              Click products on the left to add items to this date bill
                            </TableCell>
                          </TableRow>
                        ) : (
                          dateBillCart.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell className="font-medium text-xs py-2">
                                <div className="line-clamp-2 uppercase">{formatProductName(item.name)}</div>
                                <div className="text-[10px] text-muted-foreground">₹{item.price}/unit</div>
                              </TableCell>
                              <TableCell className="text-center py-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 rounded"
                                    onClick={() => updateDateBillQty(item.productId, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="font-semibold text-xs px-1">{item.qty}</span>
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-5 w-5 rounded"
                                    onClick={() => updateDateBillQty(item.productId, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-semibold text-xs py-2">
                                ₹{item.total}
                              </TableCell>
                              <TableCell className="py-2 px-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                  onClick={() => removeDateBillFromCart(item.productId)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>

                  <CardFooter className="flex flex-col border-t bg-muted/10 pt-3 gap-3 shrink-0">
                    {/* Payment Settings */}
                    <div className="w-full space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">Payment Method</Label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {dateBillPaymentMethod}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {["CASH", "UPI", "CREDIT", "CARD"].map((method) => (
                          <Button
                            key={method}
                            type="button"
                            size="sm"
                            variant={dateBillPaymentMethod === method ? "default" : "outline"}
                            className="h-7 text-[11px] px-1"
                            onClick={() => {
                              setDateBillPaymentMethod(method);
                              if (method === "CREDIT") {
                                setDateBillDownPayment("0");
                              } else {
                                setDateBillDownPayment(dateBillGrandTotal.toString());
                              }
                            }}
                          >
                            {method}
                          </Button>
                        ))}
                      </div>

                      {/* Down payment / amount paid input */}
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="text-[11px]">Amount Collected (₹)</Label>
                          {dateBillPaymentMethod === "CREDIT" && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              Ledger Credit: ₹{Math.max(0, dateBillGrandTotal - (Number(dateBillDownPayment) || 0))}
                            </span>
                          )}
                        </div>
                        <Input
                          type="number"
                          value={dateBillDownPayment}
                          onChange={(e) => setDateBillDownPayment(e.target.value)}
                          placeholder="Amount paid"
                          className="h-8 text-xs font-semibold"
                        />
                      </div>

                      {dateBillSelectedFarmer === "walkin" && dateBillPaymentMethod === "CREDIT" && (
                        <div className="text-[11px] text-destructive bg-destructive/10 p-2 rounded">
                          Walk-in customers cannot take credit. Please select a registered farmer.
                        </div>
                      )}

                      <div className="flex justify-between items-center text-base font-bold border-t pt-2 mt-1">
                        <span>Total:</span>
                        <span className="text-primary text-lg">₹{dateBillGrandTotal.toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full gradient-btn shadow-md py-5 text-sm"
                      disabled={dateBillCart.length === 0 || isSubmittingDateBill || (dateBillPaymentMethod === "CREDIT" && dateBillSelectedFarmer === "walkin")}
                      onClick={handleGenerateDateBill}
                    >
                      <ReceiptText className="mr-2 h-4 w-4" />
                      {isSubmittingDateBill ? "Generating..." : `Generate Date Bill (₹${dateBillGrandTotal.toLocaleString("en-IN")})`}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Recently Generated Date Bills Quick Table */}
            <Card className="border shadow-sm">
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Recently Generated Date Bills
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Quickly view or reprint your latest generated date bills.</p>
                </div>
                {dateBillsTrack.length > 0 && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs gap-1 text-primary p-0 h-auto font-medium"
                    onClick={() => setDateBillSubView("track")}
                  >
                    View All ({dateBillsTrack.length}) <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="text-xs">Invoice No</TableHead>
                      <TableHead className="text-xs">Bill Date</TableHead>
                      <TableHead className="text-xs">Customer</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Payment</TableHead>
                      <TableHead className="text-right text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dateBillsTrack.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                          No date bills generated yet. Use the form above to generate your first date bill.
                        </TableCell>
                      </TableRow>
                    ) : (
                      dateBillsTrack.slice(0, 5).map((bill) => (
                        <TableRow key={bill._id || bill.invoiceNumber}>
                          <TableCell className="font-medium text-xs">
                            <span className="font-mono">{bill.invoiceNumber || "—"}</span>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-primary">
                            {formatDateDisplay(bill.saleDate || bill.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {bill.customerName || bill.farmerId?.name || "Walk-in"}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            ₹{(bill.total ?? bill.totalAmount ?? 0).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                              bill.paymentMethod === 'CASH' ? 'bg-success/10 text-success' :
                              bill.paymentMethod === 'CREDIT' ? 'bg-warning/10 text-warning-foreground' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {bill.paymentMethod}
                            </span>
                          </TableCell>
                          <TableCell className="text-right py-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                              onClick={() => handlePrintBill(bill)}
                            >
                              <Printer className="h-3.5 w-3.5" /> Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* View 2: Complete Date Bills Tracker */}
        {dateBillSubView === "track" && (
          <Card className="border shadow-sm">
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" /> Date Bills Audit & Tracking Log
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Search, filter, and reprint all date bills generated across custom and historical dates.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setDateBillSubView("create")}
                  className="gap-1.5 text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" /> New Date Bill
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoice or customer..."
                    value={dateBillTrackSearch}
                    onChange={(e) => setDateBillTrackSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Date:
                  </Label>
                  <Input
                    type="date"
                    value={dateBillFilterDate}
                    onChange={(e) => setDateBillFilterDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                {(dateBillTrackSearch || dateBillFilterDate) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs gap-1.5 w-fit"
                    onClick={() => {
                      setDateBillTrackSearch("");
                      setDateBillFilterDate("");
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset Filters
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-xs">Invoice No</TableHead>
                    <TableHead className="text-xs">Bill Date</TableHead>
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Total Amount</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Notes / Ref</TableHead>
                    <TableHead className="text-right text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDateBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-sm">
                        {dateBillTrackSearch || dateBillFilterDate
                          ? "No date bills found matching your filter criteria."
                          : "No date bills have been generated yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDateBills.map((bill) => (
                      <TableRow key={bill._id || bill.invoiceNumber}>
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">{bill.invoiceNumber || "—"}</span>
                            <span className="inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              Date Bill
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-primary">
                          {formatDateDisplay(bill.saleDate || bill.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{bill.customerName || bill.farmerId?.name || "Walk-in"}</div>
                          {bill.customerPhone && (
                            <div className="text-[10px] text-muted-foreground">{bill.customerPhone}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          ₹{(bill.total ?? bill.totalAmount ?? 0).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            bill.paymentMethod === 'CASH' ? 'bg-success/10 text-success' :
                            bill.paymentMethod === 'CREDIT' ? 'bg-warning/10 text-warning-foreground' :
                            'bg-primary/10 text-primary'
                          }`}>
                            {bill.paymentMethod}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                          {bill.notes || "—"}
                        </TableCell>
                        <TableCell className="text-right py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                            onClick={() => handlePrintBill(bill)}
                          >
                            <Printer className="h-3.5 w-3.5" /> Print
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="history" className="flex-1 mt-0 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary flex items-center justify-between">
                Today's Sales
                <IndianRupee className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">₹{salesSummary.todaySales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                Overall Sales
                <ReceiptText className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{salesSummary.overallSales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Filter by customer or invoice..." 
                  className="pl-9"
                  value={historySearchTerm}
                  onChange={(e) => setHistorySearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No sales found matching your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((sale) => (
                    <TableRow key={sale._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{sale.invoiceNumber || sale._id.slice(-6).toUpperCase()}</span>
                          {sale.isDateBill && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                              <Calendar className="h-3 w-3" /> Date Bill
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(sale.saleDate || sale.createdAt).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>{sale.customerName || sale.farmerId?.name || "Walk-in"}</TableCell>
                      <TableCell className="font-semibold text-foreground">₹{(sale.total ?? sale.totalAmount ?? 0).toLocaleString("en-IN")}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          sale.paymentMethod === 'CASH' ? 'bg-success/10 text-success' :
                          sale.paymentMethod === 'CREDIT' ? 'bg-warning/10 text-warning-foreground' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {sale.paymentMethod}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                          onClick={() => handlePrintBill(sale)}
                        >
                          <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Printable Receipt Modal */}
      <Dialog open={!!completedSale} onOpenChange={(open) => !open && setCompletedSale(null)}>
        <DialogContent className="sm:max-w-[440px] max-h-[92vh] flex flex-col p-4 sm:p-5 print:w-full print:max-w-full print:p-0 print:border-none print:shadow-none bg-white">
          <DialogHeader className="print:hidden pb-1 shrink-0">
            <DialogTitle className="text-lg">Invoice Generated</DialogTitle>
            <DialogDescription className="text-xs">
              Review invoice details or print thermal bill for the customer.
            </DialogDescription>
          </DialogHeader>

          {/* Sticky Top Action Bar for Immediate Access */}
          {completedSale && (
            <div className="print:hidden flex items-center justify-between gap-2 p-2.5 bg-emerald-50/90 border border-emerald-200 rounded-lg shrink-0 mt-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Invoice Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handlePrintBill(completedSale)} 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm gap-1.5 h-8 px-3.5 text-xs"
                >
                  <ReceiptText className="w-4 h-4" /> Print Bill
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setCompletedSale(null)}
                  className="h-8 px-3 text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
          
          {completedSale && (
            <div id="printable-receipt" className="p-3 space-y-3 text-sm font-mono text-black bg-white print:p-0 print:text-xs overflow-y-auto flex-1 border rounded-md shadow-inner mt-2">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-bold uppercase">{completedSale.shop?.name || "AgriFlow Shop"}</h2>
                <p>{completedSale.shop?.address}</p>
                <p>Ph: {completedSale.shop?.phone}</p>
                <div className="border-b border-dashed my-2 border-gray-400"></div>
                <h3 className="font-bold text-lg">TAX INVOICE</h3>
                <div className="text-left mt-2 space-y-0.5">
                  <p>Inv No: {completedSale.invoiceNumber || completedSale._id?.slice(-6).toUpperCase()}</p>
                  <p>Date: {new Date(completedSale.saleDate || completedSale.createdAt || Date.now()).toLocaleString('en-IN')}</p>
                  <p>
                    Customer: {completedSale.customerName || completedSale.farmerId?.name || (selectedFarmer !== 'walkin' ? farmers.find(f => f._id === selectedFarmer)?.name : 'Walk-in')}
                  </p>
                  {completedSale.isDateBill && (
                    <p className="text-xs font-semibold text-primary">Type: Date Bill</p>
                  )}
                  {completedSale.notes && (
                    <p className="text-xs text-muted-foreground">Notes: {completedSale.notes}</p>
                  )}
                </div>
                <div className="border-b border-dashed my-2 border-gray-400"></div>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dashed border-gray-400">
                    <th className="py-1 w-1/2">Item</th>
                    <th className="py-1 text-center w-1/6">Qty</th>
                    <th className="py-1 text-right w-1/6">Price</th>
                    <th className="py-1 text-right w-1/6">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSale.cartItems?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="py-1 pr-1 break-words uppercase">{formatProductName(item.name)}</td>
                      <td className="py-1 text-center">{item.qty}</td>
                      <td className="py-1 text-right">{item.price}</td>
                      <td className="py-1 text-right">{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-400 pt-2 mt-2 space-y-1 text-right">
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total:</span>
                  <span>₹{(completedSale.total ?? completedSale.totalAmount ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({completedSale.paymentMethod}):</span>
                  <span>₹{(completedSale.downPayment ?? completedSale.amountPaid ?? 0).toLocaleString("en-IN")}</span>
                </div>
                {completedSale.paymentMethod === 'CREDIT' && (
                  <div className="flex justify-between font-semibold">
                    <span>Balance (Credit):</span>
                    <span>₹{((completedSale.total ?? completedSale.totalAmount ?? 0) - (Number(completedSale.downPayment ?? completedSale.amountPaid) || 0)).toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-400 pt-3 mt-4 text-center space-y-1">
                <p className="font-bold text-base italic">Thanks for visiting! See you again!</p>
                <p className="text-[10px] text-gray-500 mt-2 font-sans">Software by BluNet IT Services</p>
              </div>
            </div>
          )}
          
          <DialogFooter className="print:hidden pt-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setCompletedSale(null)}>Close</Button>
            <Button size="sm" onClick={() => handlePrintBill(completedSale)} className="gap-1.5"><ReceiptText className="w-4 h-4" /> Print Bill</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
    </div>
  );
}
