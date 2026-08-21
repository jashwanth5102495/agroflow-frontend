import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Settings, RefreshCw, CheckCircle, QrCode, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function WhatsAppGatewayPage() {
  const [status, setStatus] = useState<"DISCONNECTED" | "QR_READY" | "CONNECTED">("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const token = localStorage.getItem("token");
  const NOTIFICATIONS_API = `${API_BASE_URL}/notifications`;

  const fetchStatus = async (showToast = false) => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${NOTIFICATIONS_API}/gateway-status`, {
        headers,
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          setStatus(resData.data.status);
          setQrCode(resData.data.qr);
          setIsStandaloneMode(false); // Connected to real backend
          return;
        }
      }
      setIsStandaloneMode(true);
    } catch (err) {
      console.warn("Backend not reachable. Standalone mode active:", err);
      setIsStandaloneMode(true);
      
      // Standalone mockup state
      const localStatus = localStorage.getItem("agroflow_mock_gateway_status") || "QR_READY";
      const localQr = "https://github.com/google/antigravity";
      setStatus(localStatus as any);
      setQrCode(localQr);
    } finally {
      if (showToast) {
        toast.success("Gateway status refreshed");
      }
    }
  };

  // Poll status every 3 seconds for active QR scanning updates
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [token]);

  // Mock complete authentication (only visible in standalone mockup mode for preview testing)
  const handleMockAuthenticate = () => {
    localStorage.setItem("agroflow_mock_gateway_status", "CONNECTED");
    setStatus("CONNECTED");
    setQrCode(null);
    toast.success("Mock Device successfully linked!");
  };

  const handleMockDisconnect = () => {
    localStorage.setItem("agroflow_mock_gateway_status", "QR_READY");
    setStatus("QR_READY");
    setQrCode("https://github.com/google/antigravity");
    toast.info("Mock Device disconnected.");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">WhatsApp Gateway</h2>
        <p className="text-muted-foreground">
          Link and monitor the global sender phone number (**+91 93475 64390**) that transmits daily reports.
        </p>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary animate-spin-slow" />
              <CardTitle>System Status</CardTitle>
            </div>
            <CardDescription>
              This phone links to the backend global server instance.
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchStatus(true)}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
          
          {/* 1. CONNECTED STATE */}
          {status === "CONNECTED" && (
            <div className="space-y-4 max-w-md py-6">
              <div className="mx-auto bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 p-4 rounded-full w-16 h-16 flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shadow-sm animate-pulse-slow">
                <CheckCircle className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400">Gateway Connected</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The sender device **+91 93475 64390** is active and authenticated. All daily overview reports for all shop owners are being sent from this number.
                </p>
              </div>
              
              {isStandaloneMode && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleMockDisconnect}
                  className="mt-2"
                >
                  Mock Disconnect (For Testing)
                </Button>
              )}
            </div>
          )}

          {/* 2. QR READY STATE */}
          {status === "QR_READY" && qrCode && (
            <div className="space-y-6 max-w-md">
              <div className="mx-auto bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-4 rounded-full w-16 h-16 flex items-center justify-center border border-amber-200 dark:border-amber-900/50">
                <QrCode className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400">Action Required: Link WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Scan this QR code using the WhatsApp app on the sender phone (**+91 93475 64390**).
                </p>
              </div>

              {/* Render QR code via secure free API */}
              <div className="relative inline-block p-4 bg-white border rounded-xl shadow-md">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                  alt="WhatsApp Linking QR Code"
                  className={`w-48 h-48 block ${isStandaloneMode ? "opacity-30 blur-[2px]" : ""}`}
                />
                {isStandaloneMode && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-background/80 text-destructive text-center">
                    <ShieldCheck className="h-8 w-8 text-destructive mb-1" />
                    <span className="text-xs font-bold leading-tight">MOCK QR CODE</span>
                    <span className="text-[10px] text-muted-foreground mt-1 px-2">Cannot be scanned by WhatsApp. Run backend server.</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 border rounded-lg p-4 text-left space-y-2">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Instructions:</h4>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1.5">
                  <li>Open <strong>WhatsApp</strong> on phone +91 9347564390.</li>
                  <li>Tap <strong>Menu</strong> (Android) or <strong>Settings</strong> (iOS) &gt; <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong> and point your camera to this screen.</li>
                </ol>
              </div>

              {isStandaloneMode && (
                <div className="space-y-2 pt-2 border-t w-full">
                  <p className="text-xs text-amber-600">Running Standalone mockup mode. Trigger complete simulation below:</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMockAuthenticate}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    Simulate Scanned QR
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. DISCONNECTED/CONNECTING STATE */}
          {status === "DISCONNECTED" && (
            <div className="space-y-4 max-w-md py-6">
              <div className="mx-auto animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent"></div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Initializing Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Spawning WhatsApp browser instance on server. Wait for the QR code to load...
                </p>
              </div>
            </div>
          )}

        </CardContent>
        <CardFooter className="bg-muted/20 border-t px-6 py-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span>This is a global admin system configuration. Linked credentials are encrypted and stored locally.</span>
        </CardFooter>
      </Card>
    </div>
  );
}
