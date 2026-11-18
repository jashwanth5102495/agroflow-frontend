import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Search,
  Plus,
  Trash2,
  Printer,
  ReceiptText,
  Truck,
  IndianRupee,
  Calendar,
  Building2,
  FileText,
  Package,
  CheckCircle2,
  AlertCircle,
  Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_BASE_URL } from "@/config/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface IncomingItem {
  productId: string;
  name: string;
  packSize?: string;
  unit?: string;
  quantity: number | "";
  purchasePrice: number | "";
  subtotal: number;
}

interface IncomingRecord {
  _id: string;
  companyName: string;
  invoiceNumber: string;
  purchaseDate: string;
  subtotal: number;
  discount: number;
  gstRate?: number;
  tax: number;
  total: number;
  notes?: string;
  paymentStatus: string;
  items?: any[];
  createdAt: string;
}

export default function IncomingPage() {
  const { shopId } = useParams();
  const [activeTab, setActiveTab] = useState("entry");

  // Inventory products for dropdown selection
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [gstRate, setGstRate] = useState("18"); // default 18% GST
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<IncomingItem[]>([
    { productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History State
  const [history, setHistory] = useState<IncomingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Print & View Voucher Modal
  const [selectedVoucher, setSelectedVoucher] = useState<any | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  };

  // Fetch products for dropdown selection
  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE_URL}/inventory?limit=2000`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        const prods = (data.data || []).map((inv: any) => ({
          _id: inv.productId?._id,
          name: inv.productId?.name,
          unit: inv.productId?.unit || "pcs",
          category: inv.productId?.category,
          sellingPrice: inv.productId?.sellingPrice || 0,
          purchasePrice: inv.productId?.purchasePrice || 0,
        })).filter((p: any) => p._id);
        setAvailableProducts(prods);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Fetch incoming history
  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/purchases?limit=100`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load incoming history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchHistory();
  }, [shopId]);

  // Handle product selection in item row
  const handleProductSelect = (index: number, prodId: string) => {
    const prod = availableProducts.find(p => p._id === prodId);
    if (!prod) return;

    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      productId: prod._id,
      name: prod.name,
      unit: prod.unit || "pcs",
      purchasePrice: prod.purchasePrice || "",
      subtotal: (Number(newItems[index].quantity) || 0) * (Number(prod.purchasePrice) || 0),
    };
    setItems(newItems);
  };

  // Handle field change in item row
  const handleItemChange = (index: number, field: "quantity" | "purchasePrice" | "name" | "unit", val: any) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: val,
    };

    const qty = Number(newItems[index].quantity) || 0;
    const price = Number(newItems[index].purchasePrice) || 0;
    newItems[index].subtotal = Number((qty * price).toFixed(2));
    setItems(newItems);
  };

  // Add line item
  const addItemRow = () => {
    setItems([...items, { productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
  };

  // Remove line item
  const removeItemRow = (index: number) => {
    if (items.length === 1) {
      setItems([{ productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial calculations
  const rawSubtotal = items.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0);
  const gstPercentage = Number(gstRate) || 0;
  const gstAmount = Number(((rawSubtotal * gstPercentage) / 100).toFixed(2));
  const totalCost = Number((rawSubtotal + gstAmount).toFixed(2));

  // Reset form
  const resetForm = () => {
    setCompanyName("");
    setInvoiceNumber("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setGstRate("18");
    setNotes("");
    setItems([{ productId: "", name: "", packSize: "", unit: "pcs", quantity: "", purchasePrice: "", subtotal: 0 }]);
  };

  // Submit Incoming Record
  const handleSubmit = async (andPrint = false) => {
    if (!companyName.trim()) {
      toast.error("Please enter the Company / Supplier name.");
      return;
    }

    const validItems = items.filter(
      (it) => it.productId && Number(it.quantity) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one product with quantity greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        companyName: companyName.trim(),
        invoiceNumber: invoiceNumber.trim() || `INC-${Date.now().toString().slice(-6)}`,
        purchaseDate,
        gstRate: gstPercentage,
        tax: gstAmount,
        total: totalCost,
        notes: notes.trim(),
        items: validItems.map((it) => ({
          productId: it.productId,
          productName: it.name,
          unit: it.unit,
          quantity: Number(it.quantity),
          purchasePrice: Number(it.purchasePrice) || 0,
        })),
      };

      const res = await fetch(`${API_BASE_URL}/purchases`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save incoming material");
      }

      toast.success("Incoming material recorded and stock updated successfully!");

      const savedVoucherData = {
        ...data.data,
        items: validItems,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      };

      if (andPrint) {
        setSelectedVoucher(savedVoucherData);
      }

      resetForm();
      fetchHistory();
      fetchProducts(); // refresh inventory stock
      if (!andPrint) {
        setActiveTab("history");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while saving incoming material");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open voucher modal from history
  const handleViewVoucher = async (record: IncomingRecord) => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/${record._id}`, { headers: getHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedVoucher({
          ...data.data.purchase,
          items: data.data.items,
          shop: JSON.parse(localStorage.getItem("shop") || "{}"),
        });
      } else {
        setSelectedVoucher({
          ...record,
          shop: JSON.parse(localStorage.getItem("shop") || "{}"),
        });
      }
    } catch (err) {
      setSelectedVoucher({
        ...record,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      });
    }
  };

  const handlePrintVoucher = (voucher: any) => {
    if (!voucher) return;
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      window.print();
      return;
    }

    const items = voucher.items || [];
    const rowsHtml = items.map((it: any, i: number) => {
      const name = it.productName || it.name || it.productId?.name || "Product";
      const unit = it.unit || "unit";
      const qty = it.quantity || 0;
      const price = Number(it.purchasePrice || 0).toFixed(2);
      const total = Number(it.subtotal || qty * (it.purchasePrice || 0)).toFixed(2);
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${i + 1}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: 600;">${name}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center;">${unit}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: center; font-weight: bold;">${qty}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right;">₹${price}</td>
          <td style="padding: 8px; border: 1px solid #d1d5db; text-align: right; font-weight: bold;">₹${total}</td>
        </tr>
      `;
    }).join("");

    const subtotal = Number(voucher.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const tax = Number(voucher.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const grandTotal = Number(voucher.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
    const dateStr = new Date(voucher.purchaseDate || voucher.createdAt || Date.now()).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Goods Receipt Note - ${voucher.invoiceNumber || voucher._id?.slice(-8)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111827; margin: 0; padding: 20px; font-size: 13px; }
            .header { text-align: center; border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 16px; }
            .shop-title { font-size: 22px; font-weight: 800; text-transform: uppercase; margin: 0; }
            .shop-sub { font-size: 12px; color: #4b5563; margin-top: 3px; }
            .badge { display: inline-block; margin-top: 10px; background: #f3f4f6; border: 1px solid #9ca3af; padding: 4px 14px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; border-radius: 4px; text-transform: uppercase; }
            .meta { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding: 12px 0; margin-bottom: 16px; }
            .meta-col { flex: 1; }
            .meta-col.right { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f9fafb; border: 1px solid #9ca3af; padding: 8px; font-weight: 700; text-align: left; }
            .totals-box { margin-left: auto; width: 300px; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; background: #fafafa; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; padding: 3px 0; }
            .grand-total { font-size: 15px; font-weight: 800; border-top: 2px solid #111827; padding-top: 6px; margin-top: 6px; }
            .notes { border: 1px solid #e5e7eb; background: #f9fafb; padding: 10px; border-radius: 6px; margin-bottom: 30px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; }
            .sig-box { border-top: 1px solid #6b7280; width: 190px; text-align: center; padding-top: 6px; font-size: 12px; font-weight: 600; color: #374151; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="shop-title">${voucher.shop?.name || "AgroFlow Store"}</div>
            <div class="shop-sub">${voucher.shop?.address || "Agricultural Supplies & Solutions"}</div>
            <div class="shop-sub">Phone: ${voucher.shop?.phone || "N/A"}${voucher.shop?.gstNumber ? ` | GSTIN: ${voucher.shop.gstNumber}` : ""}</div>
            <div class="badge">GOODS RECEIPT NOTE (INWARD VOUCHER)</div>
          </div>
          <div class="meta">
            <div class="meta-col">
              <div><span style="color: #6b7280;">Supplier / Company:</span> <b style="font-size: 14px;">${voucher.companyName}</b></div>
              <div style="margin-top: 4px;"><span style="color: #6b7280;">Invoice / Challan No:</span> <b>${voucher.invoiceNumber || "—"}</b></div>
            </div>
            <div class="meta-col right">
              <div><span style="color: #6b7280;">Date:</span> <b>${dateStr}</b></div>
              <div style="margin-top: 4px;"><span style="color: #6b7280;">Voucher Ref:</span> #${voucher._id?.slice(-8).toUpperCase() || "NEW"}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Product Name</th>
                <th style="width: 65px; text-align: center;">Unit</th>
                <th style="width: 60px; text-align: center;">Qty</th>
                <th style="width: 95px; text-align: right;">Cost (₹)</th>
                <th style="width: 110px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="totals-box">
            <div class="row"><span>Material Subtotal:</span> <span>₹${subtotal}</span></div>
            ${Number(voucher.gstRate) > 0 ? `<div class="row"><span>Input GST (${voucher.gstRate}%):</span> <span>₹${tax}</span></div>` : ""}
            <div class="row grand-total"><span>Total Incoming Cost:</span> <span>₹${grandTotal}</span></div>
          </div>
          ${voucher.notes ? `<div class="notes"><b style="color: #374151;">Remarks / Memo:</b> <span style="color: #4b5563;">${voucher.notes}</span></div>` : ""}
          <div class="signatures">
            <div class="sig-box">Store Incharge Signature</div>
            <div class="sig-box">Received By Signature</div>
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

  const handleDownloadPDF = (voucher: any) => {
    if (!voucher) return;
    try {
      const doc = new jsPDF();
      const shop = voucher.shop || JSON.parse(localStorage.getItem("shop") || "{}");
      const dateStr = new Date(voucher.purchaseDate || voucher.createdAt || Date.now()).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(shop.name || "AGROFLOW STORE", 105, 18, { align: "center" });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(shop.address || "Agricultural Supplies & Solutions", 105, 24, { align: "center" });
      doc.text(`Phone: ${shop.phone || "N/A"}${shop.gstNumber ? ` | GSTIN: ${shop.gstNumber}` : ""}`, 105, 29, { align: "center" });

      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.5);
      doc.line(14, 33, 196, 33);

      // Title badge
      doc.setFillColor(243, 244, 246);
      doc.rect(50, 36, 110, 8, "F");
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("GOODS RECEIPT NOTE (INCOMING MATERIAL)", 105, 41.5, { align: "center" });

      // Meta details
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Supplier / Company:", 14, 52);
      doc.setFont("helvetica", "bold");
      doc.text(voucher.companyName || "N/A", 50, 52);

      doc.setFont("helvetica", "normal");
      doc.text("Invoice / Challan No:", 14, 58);
      doc.setFont("helvetica", "bold");
      doc.text(voucher.invoiceNumber || "—", 50, 58);

      doc.setFont("helvetica", "normal");
      doc.text("Date:", 140, 52);
      doc.setFont("helvetica", "bold");
      doc.text(dateStr, 165, 52);

      doc.setFont("helvetica", "normal");
      doc.text("Voucher Ref:", 140, 58);
      doc.setFont("helvetica", "bold");
      doc.text(`#${voucher._id?.slice(-8).toUpperCase() || "NEW"}`, 165, 58);

      // Table
      const tableBody = (voucher.items || []).map((it: any, i: number) => {
        const name = it.productName || it.name || it.productId?.name || "Product";
        const unit = it.unit || "unit";
        const qty = it.quantity || 0;
        const price = Number(it.purchasePrice || 0).toFixed(2);
        const total = Number(it.subtotal || qty * (it.purchasePrice || 0)).toFixed(2);
        return [i + 1, name, unit, qty, `₹${price}`, `₹${total}`];
      });

      autoTable(doc, {
        head: [["#", "Product Name", "Unit", "Qty", "Cost (₹)", "Total (₹)"]],
        body: tableBody,
        startY: 64,
        theme: "grid",
        headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: "bold" },
        styles: { fontSize: 8, cellPadding: 3 },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          1: { cellWidth: 80 },
          2: { halign: "center", cellWidth: 20 },
          3: { halign: "center", cellWidth: 20 },
          4: { halign: "right", cellWidth: 30 },
          5: { halign: "right", cellWidth: 30 },
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable?.finalY || 120;
      const subtotal = Number(voucher.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
      const tax = Number(voucher.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
      const grandTotal = Number(voucher.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Material Subtotal:  ₹${subtotal}`, 196, finalY + 8, { align: "right" });
      if (voucher.gstRate > 0) {
        doc.text(`Input GST (${voucher.gstRate}%):  ₹${tax}`, 196, finalY + 14, { align: "right" });
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const totalY = voucher.gstRate > 0 ? finalY + 22 : finalY + 16;
      doc.text(`Total Incoming Cost:  ₹${grandTotal}`, 196, totalY, { align: "right" });

      // Notes
      if (voucher.notes) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Remarks / Memo:", 14, finalY + 10);
        doc.setFont("helvetica", "normal");
        doc.text(voucher.notes, 14, finalY + 15, { maxWidth: 110 });
      }

      // Signatures
      const sigY = Math.max(totalY + 30, 245);
      doc.line(20, sigY, 70, sigY);
      doc.line(140, sigY, 190, sigY);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Store Incharge Signature", 45, sigY + 5, { align: "center" });
      doc.text("Received By Signature", 165, sigY + 5, { align: "center" });

      doc.save(`Incoming_Voucher_${voucher.invoiceNumber || voucher._id?.slice(-8) || "GRN"}.pdf`);
      toast.success("Voucher PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF. Use Print Voucher instead.");
    }
  };

  const handleDirectDownloadPDF = async (record: IncomingRecord) => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchases/${record._id}`, { headers: getHeaders() });
      const data = await res.json();
      const fullVoucher = res.ok && data.success ? {
        ...data.data.purchase,
        items: data.data.items,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      } : {
        ...record,
        shop: JSON.parse(localStorage.getItem("shop") || "{}"),
      };
      handleDownloadPDF(fullVoucher);
    } catch (e) {
      handleDownloadPDF({ ...record, shop: JSON.parse(localStorage.getItem("shop") || "{}") });
    }
  };

  // Filter history
  const filteredHistory = history.filter((rec) => {
    const term = searchTerm.toLowerCase();
    return (
      rec.companyName?.toLowerCase().includes(term) ||
      rec.invoiceNumber?.toLowerCase().includes(term) ||
      rec.notes?.toLowerCase().includes(term) ||
      rec.items?.some((it: any) => it.productName?.toLowerCase().includes(term))
    );
  });

  // History stats
  const totalInwardAmount = history.reduce((sum, h) => sum + (h.total || 0), 0);
  const totalInwardGst = history.reduce((sum, h) => sum + (h.tax || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8 text-primary" /> Incoming Material & Purchases
          </h2>
          <p className="text-muted-foreground">
            Log inward products from companies, update live stock automatically, calculate GST, and maintain incoming history.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full sm:w-[400px] grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> New Incoming Entry
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" /> Incoming History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: NEW INCOMING ENTRY */}
        <TabsContent value="entry" className="space-y-6">
          <Card className="shadow-sm border">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" /> Supplier & Material Inward Details
              </CardTitle>
              <CardDescription>
                Mention company name, invoice or DC number, receiving date, GST, and products received.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Top Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="font-semibold text-foreground">
                    Company / Supplier Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="companyName"
                      placeholder="e.g. Bayer, UPL, Syngenta, Local Agency"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber" className="font-semibold">
                    Invoice / Challan No.
                  </Label>
                  <Input
                    id="invoiceNumber"
                    placeholder="e.g. INV-98214 (or auto-generated)"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchaseDate" className="font-semibold">
                    Incoming Date
                  </Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstRate" className="font-semibold">
                    GST Rate (%)
                  </Label>
                  <Select value={gstRate} onValueChange={setGstRate}>
                    <SelectTrigger id="gstRate">
                      <SelectValue placeholder="Select GST %" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0% (Nil / Exempted)</SelectItem>
                      <SelectItem value="5">5% GST</SelectItem>
                      <SelectItem value="12">12% GST</SelectItem>
                      <SelectItem value="18">18% GST (Standard)</SelectItem>
                      <SelectItem value="28">28% GST</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">Incoming Products Line Items</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItemRow}
                    className="text-primary border-primary/30 hover:bg-primary/5"
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Another Product
                  </Button>
                </div>

                <div className="border rounded-lg overflow-x-auto bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[38%]">Product Name</TableHead>
                        <TableHead className="w-[14%] text-center">Unit</TableHead>
                        <TableHead className="w-[16%] text-center">Quantity Inward</TableHead>
                        <TableHead className="w-[16%] text-right">Unit Cost (₹)</TableHead>
                        <TableHead className="w-[12%] text-right">Subtotal (₹)</TableHead>
                        <TableHead className="w-[4%] text-center"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/20">
                          {/* Product Selection */}
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(val) => handleProductSelect(index, val)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Search or select product..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-64">
                                {availableProducts.map((p) => (
                                  <SelectItem key={p._id} value={p._id}>
                                    {p.name} {p.category ? `(${p.category})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>

                          {/* Unit */}
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {item.unit || "pcs"}
                          </TableCell>

                          {/* Quantity */}
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              step="any"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                              className="text-center font-medium"
                            />
                          </TableCell>

                          {/* Unit Cost */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(index, "purchasePrice", e.target.value)}
                              className="text-right font-medium"
                            />
                          </TableCell>

                          {/* Subtotal */}
                          <TableCell className="text-right font-semibold text-foreground">
                            ₹{item.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </TableCell>

                          {/* Remove button */}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItemRow(index)}
                              className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Bottom Row: Additional Notes & Cost Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                <div className="lg:col-span-7 space-y-2">
                  <Label htmlFor="notes" className="font-semibold">
                    Additional Notes & Delivery Remarks
                  </Label>
                  <textarea
                    id="notes"
                    rows={4}
                    placeholder="Enter transport / vehicle number, batch / lot details, delivery conditions, or any memo..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>

                <div className="lg:col-span-5 bg-muted/40 p-5 rounded-xl border space-y-3">
                  <h4 className="font-bold text-base text-foreground border-b pb-2">Cost & GST Summary</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal Cost:</span>
                    <span className="font-medium">₹{rawSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({gstPercentage}%):</span>
                    <span className="font-medium">₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center text-lg font-bold text-emerald-600">
                    <span>Total Cost of Material:</span>
                    <span>₹{totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      <Printer className="h-4 w-4 mr-2" /> Save & Print Voucher
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handleSubmit(false)}
                      disabled={isSubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Saving..." : "Save Incoming"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INCOMING HISTORY */}
        <TabsContent value="history" className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Inward Shipments</p>
                  <p className="text-2xl font-bold">{history.length}</p>
                </div>
                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Truck className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Material Inward Cost</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ₹{totalInwardAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <IndianRupee className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Input GST Paid</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{totalInwardGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-primary">
                  <ReceiptText className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Search & Table */}
          <Card className="border shadow-sm">
            <CardHeader className="p-4 border-b flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, invoice #, product, or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-muted/50"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistory}>
                Refresh History
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Company / Supplier</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Items Received</TableHead>
                    <TableHead className="text-right">GST (₹)</TableHead>
                    <TableHead className="text-right">Total Cost (₹)</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Loading incoming history...
                      </TableCell>
                    </TableRow>
                  ) : filteredHistory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? "No incoming records matching your search." : "No incoming material logged yet. Click 'New Incoming Entry' above."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory.map((rec) => (
                      <TableRow key={rec._id} className="hover:bg-muted/30">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(rec.purchaseDate || rec.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {rec.companyName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {rec.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">
                            {rec.items?.length || 1} product(s)
                          </span>
                          {rec.items && rec.items.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {rec.items.map((it: any) => it.productName || it.name).filter(Boolean).join(", ")}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          ₹{(rec.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 whitespace-nowrap">
                          ₹{(rec.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {rec.notes || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewVoucher(rec)}
                              title="Print / View Inward Voucher"
                              className="text-primary hover:bg-primary/10"
                            >
                              <Printer className="h-4 w-4 mr-1" /> Print
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDirectDownloadPDF(rec)}
                              title="Download PDF"
                              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* PRINTABLE INWARD VOUCHER MODAL */}
      <Dialog open={!!selectedVoucher} onOpenChange={(open) => !open && setSelectedVoucher(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader className="print:hidden">
            <DialogTitle>Goods Receipt Note / Inward Voucher</DialogTitle>
          </DialogHeader>

          {selectedVoucher && (
            <div id="print-incoming-voucher" className="p-4 bg-white text-black font-sans text-xs border rounded-lg">
              {/* Header */}
              <div className="text-center space-y-1 border-b pb-3">
                <h2 className="text-xl font-bold tracking-tight uppercase">
                  {selectedVoucher.shop?.name || "AGROFLOW STORE"}
                </h2>
                <p className="text-gray-600">
                  {selectedVoucher.shop?.address || "Agricultural Supplies & Solutions"}
                </p>
                <p className="text-gray-600">
                  Phone: {selectedVoucher.shop?.phone || "N/A"}
                  {selectedVoucher.shop?.gstNumber && ` | GSTIN: ${selectedVoucher.shop.gstNumber}`}
                </p>
                <div className="pt-2">
                  <span className="inline-block bg-gray-100 border px-3 py-1 font-bold text-sm tracking-wide uppercase rounded">
                    GOODS RECEIPT NOTE (INCOMING MATERIAL)
                  </span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-2 py-3 border-b text-xs">
                <div>
                  <p><span className="font-semibold text-gray-700">Supplier / Company:</span> <span className="font-bold text-sm">{selectedVoucher.companyName}</span></p>
                  <p><span className="font-semibold text-gray-700">Invoice / Challan No:</span> {selectedVoucher.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p>
                    <span className="font-semibold text-gray-700">Date:</span>{" "}
                    {new Date(selectedVoucher.purchaseDate || selectedVoucher.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p><span className="font-semibold text-gray-700">Voucher Ref:</span> #{selectedVoucher._id?.slice(-8).toUpperCase()}</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full my-3 border-collapse text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-gray-700">
                    <th className="py-1.5 px-1 font-bold">#</th>
                    <th className="py-1.5 px-1 font-bold">Product Name</th>
                    <th className="py-1.5 px-1 text-center font-bold">Unit</th>
                    <th className="py-1.5 px-1 text-center font-bold">Qty</th>
                    <th className="py-1.5 px-1 text-right font-bold">Cost (₹)</th>
                    <th className="py-1.5 px-1 text-right font-bold">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedVoucher.items || []).map((it: any, i: number) => {
                    const itemName = it.productName || it.name || it.productId?.name || "Product";
                    const itemQty = it.quantity;
                    const itemPrice = it.purchasePrice || 0;
                    const itemTotal = it.subtotal || itemQty * itemPrice;
                    return (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="py-1.5 px-1">{i + 1}</td>
                        <td className="py-1.5 px-1 font-medium">{itemName}</td>
                        <td className="py-1.5 px-1 text-center">{it.unit || "pcs"}</td>
                        <td className="py-1.5 px-1 text-center font-bold">{itemQty}</td>
                        <td className="py-1.5 px-1 text-right">₹{Number(itemPrice).toFixed(2)}</td>
                        <td className="py-1.5 px-1 text-right font-bold">₹{Number(itemTotal).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="border-t pt-2 space-y-1 text-right text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Material Subtotal:</span>
                  <span className="font-semibold">₹{(selectedVoucher.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {selectedVoucher.gstRate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Input GST ({selectedVoucher.gstRate}%):</span>
                    <span className="font-semibold">₹{(selectedVoucher.tax || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-b py-1.5 mt-1">
                  <span>Total Incoming Cost:</span>
                  <span>₹{(selectedVoucher.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedVoucher.notes && (
                <div className="mt-3 p-2 bg-gray-50 border rounded text-xs">
                  <p className="font-semibold text-gray-700">Remarks / Memo:</p>
                  <p className="text-gray-600">{selectedVoucher.notes}</p>
                </div>
              )}

              {/* Signatures */}
              <div className="mt-8 pt-4 border-t flex justify-between text-xs text-gray-600">
                <div>
                  <p className="border-t border-gray-400 pt-1 mt-6 w-36 text-center font-medium">Store Incharge Signature</p>
                </div>
                <div>
                  <p className="border-t border-gray-400 pt-1 mt-6 w-36 text-center font-medium">Received By Signature</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="print:hidden flex flex-row items-center justify-between sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedVoucher(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDownloadPDF(selectedVoucher)}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            >
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
            <Button onClick={() => handlePrintVoucher(selectedVoucher)} className="bg-primary text-primary-foreground">
              <Printer className="w-4 h-4 mr-2" /> Print Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
