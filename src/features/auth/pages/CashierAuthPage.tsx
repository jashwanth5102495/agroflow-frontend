import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "@/config/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CashierAuthPage() {
  const { shopId, token } = useParams<{ shopId: string; token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authenticateCashier = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/cashier/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId, cashierToken: token }),
        });
        
        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.setItem("token", data.data.token);
          localStorage.setItem("user", JSON.stringify(data.data.user));
          localStorage.setItem("shop", JSON.stringify(data.data.shop));
          toast.success("Logged in as Cashier successfully!");
          navigate("/cashier/sales");
        } else {
          setError(data.message || "Invalid or expired cashier link");
        }
      } catch (err) {
        setError("Failed to connect to server");
      }
    };

    if (shopId && token) {
      authenticateCashier();
    }
  }, [shopId, token, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="p-8 max-w-sm w-full bg-card shadow-lg rounded-xl border text-center space-y-4">
        <h2 className="text-2xl font-bold text-primary">AgriFlow</h2>
        {error ? (
          <div className="text-destructive font-medium">
            <p>{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Please ask the shop owner to generate a new link.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p>Authenticating Cashier Desk...</p>
          </div>
        )}
      </div>
    </div>
  );
}
