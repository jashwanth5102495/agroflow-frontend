import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Bell, Phone, Clock, Send, Save, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "@/config/api";

export default function NotificationPage() {
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [reportTime, setReportTime] = useState("20:00");
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);

  const token = localStorage.getItem("token");
  const NOTIFICATIONS_API = `${API_BASE_URL}/notifications`;

  // Fetch config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${NOTIFICATIONS_API}/config`, {
          headers,
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            setWhatsappNumber(resData.data.whatsappNumber || "");
            setReportTime(resData.data.reportTime || "20:00");
            setEnabled(resData.data.enabled || false);
            setIsStandaloneMode(false); // Successfully connected to real backend
            return;
          }
        }
        setIsStandaloneMode(true);
      } catch (err) {
        console.warn("Backend not reachable, falling back to standalone preview mode:", err);
        setIsStandaloneMode(true);
        // Load local storage fallback
        const localConfig = localStorage.getItem("agroflow_notifications");
        if (localConfig) {
          const parsed = JSON.parse(localConfig);
          setWhatsappNumber(parsed.whatsappNumber || "");
          setReportTime(parsed.reportTime || "20:00");
          setEnabled(parsed.enabled || false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [token]);

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!whatsappNumber.trim()) {
      toast.error("Please enter a valid WhatsApp number");
      return;
    }

    setIsSaving(true);
    
    // Save to local storage for frontend preview consistency
    localStorage.setItem("agroflow_notifications", JSON.stringify({
      whatsappNumber,
      reportTime,
      enabled
    }));

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${NOTIFICATIONS_API}/config`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          whatsappNumber,
          reportTime,
          enabled,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success("Notification settings updated successfully");
        setIsStandaloneMode(false);
      } else {
        setIsStandaloneMode(true);
        toast.success("Settings saved successfully (Preview Mode)");
      }
    } catch (err) {
      setIsStandaloneMode(true);
      toast.success("Settings saved successfully (Preview Mode)");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Send Test Message
  const handleSendTest = async () => {
    if (!whatsappNumber.trim()) {
      toast.error("Please enter a WhatsApp number first");
      return;
    }

    setIsTesting(true);

    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${NOTIFICATIONS_API}/test-message`, {
        method: "POST",
        headers,
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        toast.success(`Test WhatsApp message sent to ${whatsappNumber}`);
        setIsStandaloneMode(false);
      } else {
        setIsStandaloneMode(true);
        toast.success(`Mock test message sent from +91 9347564390 to ${whatsappNumber}! check backend console log.`);
      }
    } catch (err) {
      setIsStandaloneMode(true);
      toast.success(`Mock test message sent from +91 9347564390 to ${whatsappNumber}! check backend console log.`);
    } finally {
      setIsTesting(false);
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Daily Notifications</h2>
        <p className="text-muted-foreground">
          Configure automated daily WhatsApp reports for your shop sales and inventory.
        </p>
      </div>

      {isStandaloneMode && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 flex gap-3 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Standalone Preview Mode</h4>
            <p className="text-xs mt-1">
              The backend server is not connected or you skipped login. Changes will be saved locally. Run the backend and log in to link real WhatsApp updates.
            </p>
          </div>
        </div>
      )}

      <Card className="border shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>WhatsApp Configuration</CardTitle>
          </div>
          <CardDescription>
            Messages will be dispatched daily from standard sender number **+91 93475 64390**.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSave}>
          <CardContent className="space-y-6">
            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-1.5 font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Recipient WhatsApp Number
              </Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+91 98765 43210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="focus-visible:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g. +91 for India) followed by your 10-digit mobile number.
              </p>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-1.5 font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Daily Send Time
              </Label>
              <Input
                id="time"
                type="time"
                value={reportTime}
                onChange={(e) => setReportTime(e.target.value)}
                required
                className="w-40 focus-visible:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                Select the time in 24-hour format when you want to receive your daily shop overview.
              </p>
            </div>

            {/* Enable/Disable Toggle */}
            <div className="flex items-center space-x-3 pt-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-foreground">Enable Daily WhatsApp Updates</span>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 border-t bg-muted/20 px-6 py-4">
            <Button 
              type="submit" 
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium shadow-sm"
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" /> 
              {isSaving ? "Saving..." : "Save Configuration"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleSendTest}
              className="w-full sm:w-auto border-input hover:bg-muted"
              disabled={isTesting || !whatsappNumber}
            >
              <Send className="mr-2 h-4 w-4" />
              {isTesting ? "Sending..." : "Send Test Message"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Message Format Preview</CardTitle>
          <CardDescription>
            This is what the daily message will look like when received on your device:
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-emerald-50 dark:bg-emerald-950/10 p-4 rounded-lg font-mono text-sm text-emerald-900 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-950">
          <div className="whitespace-pre-wrap leading-relaxed">
            {`*🌾 AgroFlow Daily Overview 🌾*
📅 *Date:* 2026-08-20
🏪 *Shop:* Sri Ram Fertilizers

💰 *SALES SUMMARY:*
• *Total Sale:* ₹45,231.89
• *Today's Total Cash Sale:* ₹32,150.00
• *Today's Total Credit Sale:* ₹13,081.89

📦 *INVENTORY STATUS:*
• 2 low stock product(s) require attention:
  - *Urea 50kg (IFFCO)*: 8 bag (Min limit: 15)
  - *Roundup Herbicide 1L*: 2 ltr (Min limit: 5)`}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
