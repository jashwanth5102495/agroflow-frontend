import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
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

// Smart Cashier direct redirect for /cashier or /casher
function CashierDirectRedirect() {
  const shopData = localStorage.getItem("shop");
  const userData = localStorage.getItem("user");
  const shop = shopData ? JSON.parse(shopData) : null;
  const user = userData ? JSON.parse(userData) : null;
  const shopId = shop?._id || user?.shopId;

  if (shopId) {
    return <Navigate to={`/cashier/${shopId}/incoming`} replace />;
  }
  return <Navigate to="/shop/incoming" replace />;
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
  {
    path: "/shop",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
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
    ],
  },
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
  {
    path: "/settings",
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <SettingsPage />,
      },
    ],
  },
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
