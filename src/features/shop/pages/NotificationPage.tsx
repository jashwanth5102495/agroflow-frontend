import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bell,
  Send,
  Save,
  AlertCircle,
  MessageSquare,
  QrCode,
  RefreshCw,
  Unlink,
  CheckCircle2,
  Clock,
  Phone,
  Sun,
  Moon,
  Loader2,
  Share2,
} from "lucide-react";
import { API_BASE_URL } from "@/config/api";
import BannerSlideshow from "@/components/BannerSlideshow";

type NotificationChannel = "WHATSAPP" | "TELEGRAM" | "BOTH";
type WhatsAppStatus = "DISCONNECTED" | "CONNECTING" | "SCAN_QR" | "CONNECTED";

export default function NotificationPage() {
  const [channel, setChannel] = useState<NotificationChannel>("WHATSAPP");
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [shift1Time, setShift1Time] = useState("23:30");
  const [shift2Time, setShift2Time] = useState("10:00");
  const [reportTime, setReportTime] = useState("20:00");
  const [enabled, setEnabled] = useState(false);

  // WhatsApp connection states
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>("DISCONNECTED");
  const [whatsappConnectedNumber, setWhatsappConnectedNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Form loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingShift1, setIsTestingShift1] = useState(false);
  const [isTestingShift2, setIsTestingShift2] = useState(false);
  const [isTestingDaily, setIsTestingDaily] = useState(false);
  const [isTestingTg, setIsTestingTg] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const token = localStorage.getItem("token");
  const NOTIFICATIONS_API = `${API_BASE_URL}/notifications`;
  const pollingRef = useRef<any>(null);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // 1. Fetch current notification configuration & WhatsApp device status
  const fetchConfig = async () => {
    try {
      const response = await fetch(`${NOTIFICATIONS_API}/config`, {
        headers: getHeaders(),
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          const d = resData.data;
          setChannel(d.channel || "WHATSAPP");
          setWhatsappPhoneNumber(d.whatsappPhoneNumber || d.whatsappNumber || "");
          setTelegramChatId(d.telegramChatId || "");
          setShift1Time(d.shift1Time || "23:30");
          setShift2Time(d.shift2Time || "10:00");
          setReportTime(d.reportTime || "20:00");
          setEnabled(d.enabled || false);

          if (d.whatsappStatus) setWhatsappStatus(d.whatsappStatus);
          if (d.whatsappConnectedNumber) setWhatsappConnectedNumber(d.whatsappConnectedNumber);
          if (d.whatsappQrCode) setQrCode(d.whatsappQrCode);
          setIsStandaloneMode(false);
          return;
        }
      }
      setIsStandaloneMode(true);
    } catch (err) {
      console.warn("Backend not reachable, falling back to standalone mode:", err);
      setIsStandaloneMode(true);
      const local = localStorage.getItem("agroflow_notifications");
      if (local) {
        const parsed = JSON.parse(local);
        setChannel(parsed.channel || "WHATSAPP");
        setWhatsappPhoneNumber(parsed.whatsappPhoneNumber || "");
        setTelegramChatId(parsed.telegramChatId || "");
        setShift1Time(parsed.shift1Time || "23:30");
        setShift2Time(parsed.shift2Time || "10:00");
        setReportTime(parsed.reportTime || "20:00");
        setEnabled(parsed.enabled || false);
      }
    }
  };

  // 2. Poll WhatsApp Status when in SCAN_QR or CONNECTING state
  const pollWhatsAppStatus = async () => {
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/whatsapp/status`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const { status, connectedNumber, qrCode: newQr } = data.data;
          setWhatsappStatus(status);
          if (connectedNumber) setWhatsappConnectedNumber(connectedNumber);
          if (newQr) setQrCode(newQr);

          if (status === "CONNECTED") {
            setQrCode(null);
            toast.success(`WhatsApp linked successfully to +${connectedNumber || "phone"}!`);
          }
        }
      }
    } catch (err) {
      // Ignore polling errors
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchConfig().finally(() => setIsLoading(false));
  }, [token]);

  // Handle active status polling loop
  useEffect(() => {
    if (whatsappStatus === "SCAN_QR" || whatsappStatus === "CONNECTING") {
      pollingRef.current = setInterval(pollWhatsAppStatus, 3000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [whatsappStatus]);

  // 3. Generate WhatsApp QR Code
  const handleGenerateQr = async () => {
    setIsGeneratingQr(true);
    setWhatsappStatus("CONNECTING");
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/whatsapp/qr`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setWhatsappStatus(data.data.status);
        if (data.data.qrCode) {
          setQrCode(data.data.qrCode);
          toast.info("Scan the QR code below on your WhatsApp mobile app.");
        } else if (data.data.status === "CONNECTED") {
          setWhatsappConnectedNumber(data.data.connectedNumber || null);
          setQrCode(null);
          toast.success("WhatsApp is already connected!");
        }
      } else {
        toast.error(data.message || "Failed to generate QR code. Try again in a few seconds.");
        setWhatsappStatus("DISCONNECTED");
      }
    } catch (err: any) {
      toast.error(err.message || "Connection error generating QR code.");
      setWhatsappStatus("DISCONNECTED");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // 4. Disconnect WhatsApp Device
  const handleDisconnectWhatsApp = async () => {
    setIsUnlinking(true);
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/whatsapp/disconnect`, {
        method: "POST",
        headers: getHeaders(),
      });
      if (res.ok) {
        setWhatsappStatus("DISCONNECTED");
        setWhatsappConnectedNumber(null);
        setQrCode(null);
        toast.success("WhatsApp device unlinked successfully.");
      } else {
        toast.error("Failed to disconnect device.");
      }
    } catch (err: any) {
      toast.error(err.message || "Error disconnecting WhatsApp.");
    } finally {
      setIsUnlinking(false);
    }
  };

  // 5. Save Configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((channel === "WHATSAPP" || channel === "BOTH") && !whatsappPhoneNumber.trim()) {
      toast.error("Please enter a WhatsApp phone number for report delivery.");
      return;
    }
    if ((channel === "TELEGRAM" || channel === "BOTH") && !telegramChatId.trim()) {
      toast.error("Please enter a Telegram Chat ID.");
      return;
    }

    setIsSaving(true);
    localStorage.setItem(
      "agroflow_notifications",
      JSON.stringify({
        channel,
        whatsappPhoneNumber,
        telegramChatId,
        shift1Time,
        shift2Time,
        reportTime,
        enabled,
      })
    );

    try {
      const res = await fetch(`${NOTIFICATIONS_API}/config`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          channel,
          whatsappPhoneNumber,
          telegramChatId,
          shift1Time,
          shift2Time,
          reportTime,
          enabled,
        }),
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        toast.success("Notification settings saved successfully!");
        setIsStandaloneMode(false);
      } else {
        setIsStandaloneMode(true);
        toast.success("Settings saved locally (Preview Mode)");
      }
    } catch (err) {
      setIsStandaloneMode(true);
      toast.success("Settings saved locally (Preview Mode)");
    } finally {
      setIsSaving(false);
    }
  };

  // 6. Test WhatsApp Dispatch (Shift 1, Shift 2, Daily)
  const handleTestWhatsApp = async (shiftType: "shift1" | "shift2" | "daily") => {
    const phone = whatsappPhoneNumber.trim();
    if (!phone) {
      toast.error("Please enter a recipient WhatsApp phone number first.");
      return;
    }

    if (shiftType === "shift1") setIsTestingShift1(true);
    else if (shiftType === "shift2") setIsTestingShift2(true);
    else setIsTestingDaily(true);

    try {
      const res = await fetch(`${NOTIFICATIONS_API}/whatsapp/test-report`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          phone,
          shiftType,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`WhatsApp ${shiftType} report and branded PDF sent to ${phone}!`);
      } else {
        toast.error(data.message || `Failed to send ${shiftType} report. Ensure WhatsApp is paired.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger test WhatsApp report.");
    } finally {
      if (shiftType === "shift1") setIsTestingShift1(false);
      else if (shiftType === "shift2") setIsTestingShift2(false);
      else setIsTestingDaily(false);
    }
  };

  // 7. Test Telegram Dispatch
  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast.error("Please enter a Telegram Chat ID first.");
      return;
    }
    setIsTestingTg(true);
    try {
      const res = await fetch(`${NOTIFICATIONS_API}/test-message`, {
        method: "POST",
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Telegram report sent to Chat ID ${telegramChatId}!`);
      } else {
        toast.error(data.message || "Failed to send Telegram test message.");
      }
    } catch (err: any) {
      toast.error(err.message || "Telegram test error.");
    } finally {
      setIsTestingTg(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      <BannerSlideshow />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automated Reports & Notifications</h2>
          <p className="text-muted-foreground text-sm">
            Receive automated daily business summaries, sales, profit calculations, and itemized PDF reports directly on your WhatsApp phone.
          </p>
        </div>

        {/* Live Channel Badges */}
        <div className="flex items-center gap-2">
          {whatsappStatus === "CONNECTED" ? (
            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              WhatsApp Linked {whatsappConnectedNumber ? `(+${whatsappConnectedNumber})` : ""}
            </Badge>
          ) : whatsappStatus === "SCAN_QR" ? (
            <Badge className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 px-3 py-1">
              <QrCode className="h-3.5 w-3.5 animate-pulse" />
              Scan QR Code
            </Badge>
          ) : whatsappStatus === "CONNECTING" ? (
            <Badge className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 px-3 py-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connecting...
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30 px-3 py-1">
              WhatsApp Not Linked
            </Badge>
          )}
        </div>
      </div>

      {isStandaloneMode && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Offline Preview Mode</h4>
            <p className="text-xs mt-1">
              Backend is currently offline or unreachable. Configuration changes will be saved to local storage.
            </p>
          </div>
        </div>
      )}

      {/* 1. CHANNEL SELECTION BAR */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Delivery Channel</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Select where to receive shift reports</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setChannel("WHATSAPP")}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                channel === "WHATSAPP"
                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-border hover:border-muted-foreground/40 text-foreground"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                WhatsApp
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Free open-source multi-device web socket (no Meta fees)
              </p>
            </button>

            <button
              type="button"
              onClick={() => setChannel("TELEGRAM")}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                channel === "TELEGRAM"
                  ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20 shadow-sm"
                  : "border-border hover:border-muted-foreground/40 text-foreground"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                Telegram
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Direct Telegram Bot messages and PDF files
              </p>
            </button>

            <button
              type="button"
              onClick={() => setChannel("BOTH")}
              className={`p-3.5 rounded-lg border text-left transition-all flex flex-col justify-between ${
                channel === "BOTH"
                  ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-sm"
                  : "border-border hover:border-muted-foreground/40 text-foreground"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary"></span>
                Both Channels
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Receive summaries on WhatsApp and Telegram simultaneously
              </p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 2. WHATSAPP MULTI-DEVICE PAIRING CARD */}
      {(channel === "WHATSAPP" || channel === "BOTH") && (
        <Card className="border shadow-sm border-emerald-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-emerald-600" />
                <CardTitle>WhatsApp Multi-Device Link</CardTitle>
              </div>
              {whatsappStatus === "CONNECTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectWhatsApp}
                  disabled={isUnlinking}
                  className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs"
                >
                  <Unlink className="mr-1.5 h-3.5 w-3.5" />
                  {isUnlinking ? "Unlinking..." : "Unlink Device"}
                </Button>
              )}
            </div>
            <CardDescription>
              Link your WhatsApp phone once using WhatsApp Web. No paid APIs, no per-message fees, no templates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {whatsappStatus === "CONNECTED" ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-emerald-950 dark:text-emerald-100">
                      WhatsApp Connected
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                      Linked as <strong>+{whatsappConnectedNumber || "Active Number"}</strong>. Automated PDF reports and shift summaries will be delivered automatically.
                    </p>
                  </div>
                </div>
              </div>
            ) : qrCode && (whatsappStatus === "SCAN_QR" || whatsappStatus === "CONNECTING") ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 border rounded-xl bg-card">
                {/* QR Code Container */}
                <div className="p-3 bg-white border rounded-xl shadow-sm shrink-0 flex flex-col items-center">
                  <img
                    src={qrCode}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain rounded"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <RefreshCw className="h-3 w-3 animate-spin text-emerald-600" />
                    Listening for scan...
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-base text-foreground">
                    Link WhatsApp in 3 Easy Steps:
                  </h4>
                  <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
                    <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                    <li>Tap <strong>Menu (⋮)</strong> on Android or <strong>Settings</strong> on iPhone.</li>
                    <li>Tap <strong>Linked Devices</strong>, then tap <strong>Link a Device</strong>.</li>
                    <li>Point your phone camera at this QR code to scan.</li>
                  </ol>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateQr}
                      disabled={isGeneratingQr}
                      className="text-xs"
                    >
                      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isGeneratingQr ? "animate-spin" : ""}`} />
                      Refresh QR Code
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-xl bg-muted/20">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mb-3">
                  <QrCode className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-base">WhatsApp Not Paired</h4>
                <p className="text-xs text-muted-foreground max-w-md mt-1 mb-4">
                  Connect any phone to receive daily closing reports and itemized inventory alerts directly on WhatsApp.
                </p>
                <Button
                  onClick={handleGenerateQr}
                  disabled={isGeneratingQr}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
                >
                  {isGeneratingQr ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating QR Code...
                    </>
                  ) : (
                    <>
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate WhatsApp QR Code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. REPORT TIMINGS & CONFIGURATION FORM */}
      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Schedule & Recipients</CardTitle>
          </div>
          <CardDescription>
            Configure report delivery timing windows, shift schedules, and recipient contact numbers.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            {/* Recipient WhatsApp Phone Number */}
            {(channel === "WHATSAPP" || channel === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="whatsappPhone" className="flex items-center gap-1.5 font-medium">
                  <Phone className="h-4 w-4 text-emerald-600" />
                  Owner / Manager WhatsApp Phone Number
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">+91</span>
                  <Input
                    id="whatsappPhone"
                    type="tel"
                    placeholder="9845320581"
                    value={whatsappPhoneNumber}
                    onChange={(e) => setWhatsappPhoneNumber(e.target.value)}
                    className="pl-12 focus-visible:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter 10-digit mobile number where reports and PDF vouchers should be delivered.
                </p>
              </div>
            )}

            {/* Telegram Chat ID */}
            {(channel === "TELEGRAM" || channel === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="telegram" className="flex items-center gap-1.5 font-medium">
                  <MessageSquare className="h-4 w-4 text-sky-600" />
                  Telegram Chat ID or Username
                </Label>
                <Input
                  id="telegram"
                  type="text"
                  placeholder="e.g. 123456789 or @shop_channel"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  className="focus-visible:ring-sky-500"
                />
                <p className="text-xs text-muted-foreground">
                  Enter Telegram numeric Chat ID. (Find via <strong>@userinfobot</strong> on Telegram).
                </p>
              </div>
            )}

            {/* Daily Report Delivery Time */}
            <div className="space-y-3 pt-2">
              <Label className="font-semibold flex items-center gap-1.5 text-base">
                <Clock className="h-4 w-4 text-primary" />
                Daily Closing Report Delivery Time (24-Hour Format)
              </Label>

              <div className="p-4 border rounded-xl bg-card space-y-2 max-w-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-emerald-600" /> Daily Closing Business & Profit Report
                  </span>
                  <span className="text-xs text-muted-foreground">Full Day Summary</span>
                </div>
                <Input
                  type="time"
                  value={reportTime}
                  onChange={(e) => setReportTime(e.target.value)}
                  className="font-medium text-base h-10 w-full"
                />
                <p className="text-xs text-muted-foreground">
                  AgroFlow automatically compiles the full day's sales, collections, profit calculation, credit ledger, and PDF statement, delivering it directly to your WhatsApp at this time.
                </p>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-3 pt-3 border-t">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-semibold text-foreground">
                  Enable Scheduled Daily WhatsApp Reports
                </span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 border-t bg-muted/20 px-6 py-4">
            <Button
              type="submit"
              className="w-full sm:w-auto gradient-btn shadow-md font-medium"
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Notification Settings"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 4. INSTANT TESTING CARD */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Send className="h-4 w-4 text-primary" />
            Instant Test Delivery
          </CardTitle>
          <CardDescription>
            Verify report formatting, profit calculations, and PDF attachments on your WhatsApp phone immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleTestWhatsApp("daily")}
              disabled={isTestingDaily}
              className="h-auto py-3.5 px-4 border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-left flex items-center gap-3 w-full sm:w-auto"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                  {isTestingDaily ? "Dispatching WhatsApp Report..." : "Send Test Daily WhatsApp Report & PDF"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {isTestingDaily ? "Sending message & branded PDF to your phone..." : "Verify sales, profit, credit ledger, and PDF on WhatsApp now"}
                </div>
              </div>
            </Button>
          </div>

          {(channel === "TELEGRAM" || channel === "BOTH") && (
            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestTelegram}
                disabled={isTestingTg || !telegramChatId}
                className="text-xs"
              >
                <Send className="mr-1.5 h-3.5 w-3.5 text-sky-600" />
                {isTestingTg ? "Sending to Telegram..." : "Send Telegram Test Report"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. MESSAGE PREVIEW CARD */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">WhatsApp Report Message Preview</CardTitle>
          <CardDescription>
            Sample layout of the automated text summary delivered with the branded PDF attachment:
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-emerald-50/50 dark:bg-emerald-950/10 p-4 rounded-xl font-mono text-xs text-emerald-950 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/40">
          <div className="whitespace-pre-wrap leading-relaxed">
            {`*🌾 AgroFlow Daily Business & Profit Report*
*(ದೈನಂದಿನ ವ್ಯಾಪಾರ ಮತ್ತು ಲಾಭದ ವರದಿ)*

🏪 *Store:* SSB Hi-Tech farm
👤 *Proprietor:* Store Owner
📅 *Date:* 2026-11-25
⏱️ *Window:* 00:00 – 23:59 (Full Day)

💰 *FINANCIAL & PROFIT SUMMARY (ಆರ್ಥಿಕ & ಲಾಭದ ಸಾರಾಂಶ):*
• *Total Sales (ಒಟ್ಟು ಮಾರಾಟ):* ₹45,230.00
• *Purchase Cost (ಖರೀದಿ ವೆಚ್ಚ / COGS):* ₹31,450.00
• *Gross Profit (ಒಟ್ಟು ನಿವ್ವಳ ಲಾಭ):* ₹13,780.00 (30.5% margin)
• *Invoices Completed (ಒಟ್ಟು ಬಿಲ್ಲುಗಳು):* 18
• *Avg Bill Value:* ₹2,512.78

💳 *COLLECTIONS & CREDIT BREAKDOWN (ನಗದು & ಸಾಲದ ವಿವರ):*
• 💵 *Cash Collected (ನಗದು):* ₹32,000.00
• 📱 *UPI / Online:* ₹8,500.00
• 💳 *Card / Bank:* ₹2,500.00
• 📥 *Total Collected in Hand (ಒಟ್ಟು ನಗದು):* ₹43,000.00
• 📝 *Credit Given Today (ಇಂದಿನ ಸಾಲ):* ₹2,230.00

👥 *FARMER CREDIT LEDGER (ರೈತರ ಸಾಲದ ಬಾಕಿ):*
• *Pending Credit Accounts:* 4 farmers
• *Total Outstanding Balance (ಒಟ್ಟು ಬಾಕಿ):* ₹18,450.00
  - Ravi Kumar: ₹6,500.00
  - Suresh Gowda: ₹4,200.00

📈 *TOP PRODUCTS SOLD & PROFIT:*
• *INFINITO-100 ML* (Qty: 4) -> Revenue: ₹2,400.00 | Profit: +₹680.00
• *M 45 - 1KG INDOFIL* (Qty: 6) -> Revenue: ₹3,600.00 | Profit: +₹920.00

📦 *STOCK MOVEMENTS (6 products):*
• *INFINITO-100 ML:* Sold 4 pcs | Closing: 16 pcs
• *DAP (18-46-0):* Sold 10 pcs | Closing: 40 pcs

🚨 *OUT OF STOCK ALERTS:*
• ❌ MONOCROTOPHOS-500 ML (0 pcs)

📄 _Attached PDF contains complete itemized farmer billing, profit breakdown, and full audit ledger._`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
