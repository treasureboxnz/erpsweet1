import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  FileText,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  Bell,
  Search,
  UserCog,
  History,
  Shield,
  Lock,
  Image,
  FolderTree,
  Truck,
  Tags,
  ListTree,
  Settings,
  Palette,
  PanelLeft,
  Menu,
  Mail,
  Telescope,
  ChevronDown,
  ChevronRight,
  Briefcase,
  TrendingUp,
  Wrench,
  ClipboardList,
  Building2,
  Globe,
  Hash,
  FileCheck,
  FileCog,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import RabbitLoader from "./RabbitLoader";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSidebar } from "@/contexts/SidebarContext";

interface ERPLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

interface NavGroup {
  id: string;
  name: string;
  icon: any;
  items: NavItem[];
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

// 7个业务分组导航
const navGroups: NavGroup[] = [
  {
    id: "business",
    name: "业务中心",
    icon: Briefcase,
    defaultOpen: true,
    items: [
      { name: "工作台", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    id: "customers",
    name: "客户管理",
    icon: Users,
    defaultOpen: false,
    items: [
      { name: "客户档案", href: "/customers", icon: Users },
      { name: "Apollo 开发", href: "/apollo", icon: Telescope },
      { name: "开发邮件", href: "/utilities/email-generator", icon: Mail },
    ],
  },
  {
    id: "products",
    name: "产品中心",
    icon: Package,
    defaultOpen: false,
    items: [
      { name: "产品管理", href: "/products", icon: Package },
      { name: "类目管理", href: "/categories", icon: FolderTree },
      { name: "材料管理", href: "/materials", icon: Palette },
      { name: "媒体库", href: "/media-library", icon: Image },
    ],
  },
  {
    id: "sales",
    name: "销售管理",
    icon: TrendingUp,
    defaultOpen: false,
    items: [
      { name: "报价管理", href: "/quotations", icon: FileText },
      { name: "订单管理", href: "/orders", icon: ShoppingCart },
    ],
  },
  {
    id: "supply",
    name: "供应链",
    icon: Truck,
    items: [
      { name: "供应商管理", href: "/suppliers", icon: Truck },
    ],
  },
  {
    id: "analytics",
    name: "数据分析",
    icon: BarChart3,
    items: [
      { name: "报表中心", href: "/reports", icon: BarChart3 },
    ],
  },
  {
    id: "system",
    name: "系统管理",
    icon: Settings,
    adminOnly: true,
    items: [
      { name: "用户管理", href: "/users", icon: UserCog, adminOnly: true },
      { name: "岗位管理", href: "/users/positions", icon: Shield, adminOnly: true },
      { name: "权限管理", href: "/users/permissions", icon: Lock, adminOnly: true },
      { name: "公司信息", href: "/settings/company", icon: Building2, adminOnly: true },
      { name: "网站设置", href: "/settings/system", icon: Globe, adminOnly: true },
      { name: "SKU规则", href: "/settings/sku-rules", icon: Hash, adminOnly: true },
      { name: "Invoice条款", href: "/settings/invoice-terms", icon: FileCheck, adminOnly: true },
      { name: "Invoice模板", href: "/settings/invoice-template", icon: FileCog, adminOnly: true },
      { name: "属性管理", href: "/management/attributes", icon: ListTree, adminOnly: true },
      { name: "Tag管理", href: "/utilities/tags", icon: Tags, adminOnly: true },
      { name: "操作日志", href: "/logs", icon: History, adminOnly: true },
    ],
  },
];

const SIDEBAR_GROUPS_KEY = "sidebar-groups-state";

export default function ERPLayout({ children }: ERPLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const { isCollapsed, setIsCollapsed, isMobile } = useSidebar();
  
  // 移动端侧边栏显示状态
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 分组展开/折叠状态
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_GROUPS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // 默认展开状态
    const defaults: Record<string, boolean> = {};
    navGroups.forEach((g) => {
      defaults[g.id] = g.defaultOpen ?? false;
    });
    return defaults;
  });

  // 保存分组状态到localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  // 根据当前路由自动展开对应分组，收起其他分组
  useEffect(() => {
    const newState: Record<string, boolean> = {};
    for (const group of navGroups) {
      const isInGroup = group.items.some((item) => {
        if (item.href === "/") return location === "/";
        return location === item.href || location.startsWith(item.href + "/");
      });
      newState[group.id] = isInGroup || group.id === "business";
    }
    setExpandedGroups(newState);
  }, [location]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  // 移动端自动收起侧边栏
  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
      setIsMobileMenuOpen(false);
    }
  }, [isMobile, setIsCollapsed]);

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsMobileMenuOpen(false);
    }
  };

  // 全局搜索
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const handleGlobalSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && globalSearchTerm.trim()) {
      const term = globalSearchTerm.trim().toLowerCase();
      // 智能导航：根据搜索关键词跳转到对应页面
      if (term.includes("客户") || term.includes("customer")) {
        navigate("/customers");
      } else if (term.includes("产品") || term.includes("product")) {
        navigate("/products");
      } else if (term.includes("订单") || term.includes("order")) {
        navigate("/orders");
      } else if (term.includes("报价") || term.includes("quotation")) {
        navigate("/quotations");
      } else if (term.includes("供应商") || term.includes("supplier")) {
        navigate("/suppliers");
      } else if (term.includes("报表") || term.includes("report")) {
        navigate("/reports");
      } else {
        // 默认搜索客户
        navigate(`/customers?search=${encodeURIComponent(globalSearchTerm.trim())}`);
      }
      setGlobalSearchTerm("");
    }
  };

  // 通知相关
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { data: notifData, refetch: refetchNotifications } = trpc.notifications.list.useQuery(
    { limit: 20 },
    { refetchInterval: 30000 }
  );
  const unreadCount = notifData?.unreadCount || 0;
  const notifications = notifData?.notifications || [];

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetchNotifications(),
  });

  // 点击外部关闭通知面板
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/login";
    } catch (error) {
      toast.error("退出登录失败");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <RabbitLoader size="lg" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl(location);
    return null;
  }

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const showExpanded = !isCollapsed || isMobile;

  const isItemActive = (href: string) => {
    if (href === "/") return location === "/";
    return location === href || location.startsWith(href + "/");
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Overlay for mobile */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Left Sidebar */}
      <aside 
        className={`bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out z-50 ${
          isMobile 
            ? `fixed inset-y-0 left-0 w-64 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
            : isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo and Toggle Button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {showExpanded && (
            <div className="flex items-center">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663334223494/BIbPhKWDPrNqpRwc.png" 
                alt="Casaviva Logo" 
                className="h-8 w-8"
              />
              <span className="ml-3 text-xl font-bold">ERP Sweet</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="h-8 w-8 flex items-center justify-center hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <PanelLeft className="h-5 w-5 text-gray-300" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto scrollbar-thin">
          {navGroups.map((group) => {
            // 管理员分组仅管理员可见
            if (group.adminOnly && !isAdmin) return null;

            const visibleItems = group.items.filter(
              (item) => !item.adminOnly || isAdmin
            );
            if (visibleItems.length === 0) return null;

            const isGroupExpanded = expandedGroups[group.id] ?? false;
            const hasActiveItem = visibleItems.some((item) => isItemActive(item.href));

            // 折叠模式：只显示分组图标，点击展开第一个子项
            if (isCollapsed && !isMobile) {
              return (
                <div key={group.id} className="mb-1">
                  {visibleItems.map((item) => {
                    const active = isItemActive(item.href);
                    return (
                      <Link key={item.href} href={item.href}>
                        <div
                          className={`flex items-center justify-center rounded-lg transition-colors cursor-pointer px-2 py-2.5 mb-0.5 ${
                            active
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-slate-800 hover:text-white"
                          }`}
                          title={item.name}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                        </div>
                      </Link>
                    );
                  })}
                  <div className="h-px bg-slate-800 my-1.5 mx-2" />
                </div>
              );
            }

            // 展开模式：分组标题 + 子菜单
            return (
              <div key={group.id} className="mb-1">
                {/* 分组标题 */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    hasActiveItem
                      ? "text-white"
                      : "text-gray-400 hover:text-gray-200 hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <group.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{group.name}</span>
                  </div>
                  {isGroupExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                  )}
                </button>

                {/* 子菜单项 */}
                {isGroupExpanded && (
                  <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/50">
                    {visibleItems.map((item) => {
                      const active = isItemActive(item.href);
                      return (
                        <Link key={item.href} href={item.href}>
                          <div
                            onClick={closeMobileSidebar}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                              active
                                ? "bg-blue-600 text-white"
                                : "text-gray-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span>{item.name}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Info */}
        <div className={`p-4 border-t border-slate-800 ${(isCollapsed && !isMobile) ? "px-2" : ""}`}>
          <Link href="/profile">
            <div 
              onClick={closeMobileSidebar}
              className={`flex items-center hover:bg-slate-800 p-2 rounded-lg transition-colors cursor-pointer ${
                (isCollapsed && !isMobile) ? "justify-center" : ""
              }`}
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={user?.avatarUrl || ""} />
                <AvatarFallback className="bg-blue-600">
                  {(user?.displayName || user?.name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {showExpanded && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.displayName || user?.name || "用户"}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.role === "super_admin" ? "超级管理员" : user?.role === "admin" ? "管理员" : "操作员"}
                  </p>
                </div>
              )}
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center flex-1 gap-4">
            {/* Mobile menu button */}
            {isMobile && (
              <button
                onClick={toggleSidebar}
                className="h-10 w-10 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            )}
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索客户、产品、订单...按Enter跳转"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onKeyDown={handleGlobalSearch}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* 通知铃铛 */}
            <div className="relative" ref={notificationRef}>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>

              {/* 通知下拉面板 */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {/* 面板头部 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">通知</h3>
                    {unreadCount > 0 && (
                      <button
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        onClick={() => markAllReadMutation.mutate()}
                      >
                        全部标记已读
                      </button>
                    )}
                  </div>

                  {/* 通知列表 */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">暂无通知</p>
                      </div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div
                          key={notif.id}
                          className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors ${
                            !notif.isRead ? 'bg-blue-50/50' : ''
                          }`}
                          onClick={() => {
                            if (!notif.isRead) {
                              markReadMutation.mutate(notif.id);
                            }
                            if (notif.relatedCustomerId) {
                              window.location.href = `/customers/${notif.relatedCustomerId}`;
                              setShowNotifications(false);
                            }
                          }}
                        >
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                            notif.type === 'mention' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {notif.senderName?.charAt(0) || '@'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{notif.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.content}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(notif.createdAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium hidden sm:inline">{user?.name || "用户"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.location.href = '/profile'}>
                  个人设置
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/change-password'}>
                  修改密码
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/settings/system'}>
                  系统设置
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
