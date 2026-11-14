import { createBrowserRouter, Navigate, Outlet, useParams } from "react-router-dom";
import AuthLayout from "@/layouts/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterShopPage from "@/features/auth/pages/RegisterShopPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import DashboardPage from "@/features/shop/pages/DashboardPage";
import IncomingPage from "@/features/shop/pages/IncomingPage";
import InventoryPage from "@/features/shop/pages/InventoryPage";
import FarmersPage from "@/features/shop/pages/FarmersPage";
import SalesPage from "@/features/shop/pages/SalesPage";
import CreditLedgerPage from "@/features/shop/pages/CreditLedgerPage";
import ReportsPage from "@/features/shop/pages/ReportsPage";
import AdminDashboardPage from "@/features/admin/pages/AdminDashboardPage";
import AdminShopsPage from "@/features/admin/pages/AdminShopsPage";
import AdminAgentsPage from "@/features/admin/pages/AdminAgentsPage";
import AdminReportsPage from "@/features/admin/pages/AdminReportsPage";
import AdminLoginPage from "@/features/admin/pages/AdminLoginPage";
import TelegramGatewayPage from "@/features/admin/pages/TelegramGatewayPage";
import SettingsPage from "@/features/shop/pages/SettingsPage";
import SoftwareBillingPage from "@/features/shop/pages/SoftwareBillingPage";
import NotificationPage from "@/features/shop/pages/NotificationPage";
import CashierLayout from "@/layouts/CashierLayout";
import CashierAuthPage from "@/features/auth/pages/CashierAuthPage";

// Secure Admin Route Guard
function AdminGuard() {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : null;

  if (!token || user?.role !== "ADMIN") {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}

// Tenant Isolation & Security Guard for /shop/:shopId
function ShopTenantGuard() {
  const { shopId } = useParams<{ shopId: string }>();
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const shopData = localStorage.getItem("shop");

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  const user = userData ? JSON.parse(userData) : null;
  const shop = shopData ? JSON.parse(shopData) : null;
  const userShopId = shop?._id || user?.shopId;

  // Platform Admin has global permissions to inspect any shop
  if (user?.role === "ADMIN") {
    return <Outlet />;
  }

  // Cross-tenant protection: if a user navigates to another shop's ID, bounce them back to their own
  if (userShopId && shopId && userShopId !== shopId) {
    return <Navigate to={`/shop/${userShopId}`} replace />;
  }

  return <Outlet />;
}

// Redirects generic unparameterized /shop URLs to the user's isolated /shop/:shopId URL
function GenericShopRedirect({ subpath = "" }: { subpath?: string }) {
  const token = localStorage.getItem("token");
  const userData = localStorage.getItem("user");
  const shopData = localStorage.getItem("shop");

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  const user = userData ? JSON.parse(userData) : null;
  const shop = shopData ? JSON.parse(shopData) : null;
  const userShopId = shop?._id || user?.shopId;

  if (user?.role === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  if (userShopId) {
    const target = subpath ? `/shop/${userShopId}/${subpath}` : `/shop/${userShopId}`;
    return <Navigate to={target} replace />;
  }

  return <Navigate to="/auth/login" replace />;
}

// Smart Cashier direct redirect for /cashier or /casher
function CashierDirectRedirect() {
  const token = localStorage.getItem("token");
  const shopData = localStorage.getItem("shop");
  const userData = localStorage.getItem("user");
  const shop = shopData ? JSON.parse(shopData) : null;
  const user = userData ? JSON.parse(userData) : null;
  const shopId = shop?._id || user?.shopId;

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  if (shopId) {
    return <Navigate to={`/cashier/${shopId}/incoming`} replace />;
  }
  return <Navigate to="/auth/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: "/admin/login",
    element: <AdminLoginPage />,
  },
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "register",
        element: <RegisterShopPage />,
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />,
      },
    ],
  },
  // Generic unparameterized redirects for safety and backward-compatibility
  {
    path: "/shop",
    element: <GenericShopRedirect />,
  },
  {
    path: "/shop/dashboard",
    element: <GenericShopRedirect subpath="dashboard" />,
  },
  {
    path: "/shop/incoming",
    element: <GenericShopRedirect subpath="incoming" />,
  },
  {
    path: "/shop/inventory",
    element: <GenericShopRedirect subpath="inventory" />,
  },
  {
    path: "/shop/farmers",
    element: <GenericShopRedirect subpath="farmers" />,
  },
  {
    path: "/shop/sales",
    element: <GenericShopRedirect subpath="sales" />,
  },
  {
    path: "/shop/credit",
    element: <GenericShopRedirect subpath="credit" />,
  },
  {
    path: "/shop/reports",
    element: <GenericShopRedirect subpath="reports" />,
  },
  {
    path: "/shop/billing",
    element: <GenericShopRedirect subpath="billing" />,
  },
  {
    path: "/shop/notification",
    element: <GenericShopRedirect subpath="notification" />,
  },
  {
    path: "/shop/settings",
    element: <GenericShopRedirect subpath="settings" />,
  },
  {
    path: "/settings",
    element: <GenericShopRedirect subpath="settings" />,
  },
  // Isolated Unique Shop URL Routes: /shop/:shopId/...
  {
    path: "/shop/:shopId",
    element: <ShopTenantGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: "dashboard",
            element: <DashboardPage />,
          },
          {
            path: "incoming",
            element: <IncomingPage />,
          },
          {
            path: "inventory",
            element: <InventoryPage />,
          },
          {
            path: "farmers",
            element: <FarmersPage />,
          },
          {
            path: "sales",
            element: <SalesPage />,
          },
          {
            path: "credit",
            element: <CreditLedgerPage />,
          },
          {
            path: "reports",
            element: <ReportsPage />,
          },
          {
            path: "billing",
            element: <SoftwareBillingPage />,
          },
          {
            path: "notification",
            element: <NotificationPage />,
          },
          {
            path: "settings",
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
  // Admin Routes
  {
    path: "/admin",
    element: <AdminGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            index: true,
            element: <AdminDashboardPage />,
          },
          {
            path: "agents",
            element: <AdminAgentsPage />,
          },
          {
            path: "shops",
            element: <AdminShopsPage />,
          },
          {
            path: "reports",
            element: <AdminReportsPage />,
          },
          {
            path: "telegram-gateway",
            element: <TelegramGatewayPage />,
          },
        ],
      },
    ],
  },
  // Cashier Routes
  {
    path: "/cashier",
    element: <CashierDirectRedirect />,
  },
  {
    path: "/casher",
    element: <CashierDirectRedirect />,
  },
  {
    path: "/cashier/auth/:shopId/:token",
    element: <CashierAuthPage />,
  },
  {
    path: "/cashier/:shopId",
    element: <CashierLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="incoming" replace />,
      },
      {
        path: "incoming",
        element: <IncomingPage />,
      },
      {
        path: "sales",
        element: <SalesPage />,
      },
      {
        path: "farmers",
        element: <FarmersPage />,
      },
      {
        path: "inventory",
        element: <InventoryPage />,
      },
      {
        path: "credit",
        element: <CreditLedgerPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/auth/login" replace />,
  },
]);
