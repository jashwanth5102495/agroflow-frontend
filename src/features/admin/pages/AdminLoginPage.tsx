import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        toast.success("Admin access granted");
        navigate("/admin");
      } else {
        toast.error(data.message || "Invalid admin credentials");
      }
    } catch (err) {
      toast.error("Cannot connect to server. Please ensure backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 bg-card border border-primary/20 p-8 rounded-2xl shadow-xl">
        <div className="text-center space-y-3">
          <div className="mx-auto bg-primary/10 text-primary w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            AgroFlow Super Admin
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter administrator credentials to access platform controls.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleAdminLogin}>
          <div className="space-y-2">
            <Label htmlFor="admin-id">Admin Email / Phone / Identifier</Label>
            <Input
              id="admin-id"
              placeholder="e.g. admin@agroflow.com"
              required
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="admin-pass">Master Password / Passcode</Label>
            </div>
            <Input
              id="admin-pass"
              type="password"
              placeholder="••••••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            className="w-full gradient-btn shadow-md py-6 text-base font-semibold"
            disabled={isLoading}
          >
            <Lock className="mr-2 h-4 w-4" />
            {isLoading ? "Authenticating..." : "Unlock Admin Dashboard"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => navigate("/auth/login")}
            className="text-xs text-muted-foreground hover:text-primary underline"
          >
            Back to Shop Owner Login
          </button>
        </div>
      </div>
    </div>
  );
}
