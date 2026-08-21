import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/config/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("token", data.data.token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        localStorage.setItem("shop", JSON.stringify(data.data.shop));
        toast.success("Successfully logged in");
        
        // Navigate based on role
        if (data.data.user?.role === "ADMIN") {
          navigate("/admin");
        } else {
          navigate("/shop");
        }
      } else {
        toast.error(data.message || "Invalid credentials");
      }
    } catch (err) {
      toast.error("Cannot connect to server. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome Back</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Enter your credentials to access your account.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleLogin}>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="e.g. 9876543210"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/auth/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input type="checkbox" id="remember" className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50" />
          <Label htmlFor="remember" className="text-sm font-normal">Remember me</Label>
        </div>

        <Button type="submit" className="w-full gradient-btn shadow-md py-6 text-lg" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Log In"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/auth/register" className="font-semibold text-primary hover:underline">
          Register your shop
        </Link>
      </p>
    </div>
  );
}
