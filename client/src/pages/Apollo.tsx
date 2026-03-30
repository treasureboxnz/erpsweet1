import { useState, useMemo, useEffect, useRef } from "react";
import ERPLayout from "@/components/ERPLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Telescope,
  Search,
  Users,
  Building2,
  Mail,
  Linkedin,
  Globe,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  X,
  Plus,
  Trash2,
  UserCheck,
  RefreshCw,
  Filter,
  BanIcon,
  RotateCcw,
  Users2,
  Info,
  Send,
  SendHorizonal,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// 行业选项（跨境家具B2B场景）
const INDUSTRY_OPTIONS = [
  { value: "furniture_retail", label: "家居零售" },
  { value: "interior_design", label: "室内设计" },
  { value: "real_estate", label: "地产开发" },
  { value: "home_decor", label: "家居装饰" },
  { value: "hospitality", label: "酒店/餐饮" },
  { value: "wholesale", label: "批发商" },
  { value: "ecommerce", label: "电商平台" },
  { value: "department_store", label: "百货商场" },
];

// 职位选项
const JOB_TITLE_OPTIONS = [
  { value: "CEO", label: "CEO / 总裁" },
  { value: "COO", label: "COO / 首席运营官" },
  { value: "Purchasing Director", label: "采购总监" },
  { value: "Purchasing Manager", label: "采购经理" },
  { value: "Procurement Manager", label: "采购经理（Procurement）" },
  { value: "Buyer", label: "买手 / Buyer" },
  { value: "Sourcing Manager", label: "Sourcing 经理" },
  { value: "Category Manager", label: "品类经理" },
  { value: "Owner", label: "老板 / Owner" },
  { value: "Founder", label: "创始人" },
];

// 国家/地区选项
const COUNTRY_OPTIONS = [
  { value: "United States", label: "🇺🇸 美国" },
  { value: "United Kingdom", label: "🇬🇧 英国" },
  { value: "Germany", label: "🇩🇪 德国" },
  { value: "France", label: "🇫🇷 法国" },
  { value: "Canada", label: "🇨🇦 加拿大" },
  { value: "Australia", label: "🇦🇺 澳大利亚" },
  { value: "Netherlands", label: "🇳🇱 荷兰" },
  { value: "Sweden", label: "🇸🇪 瑞典" },
  { value: "Denmark", label: "🇩🇰 丹麦" },
  { value: "Italy", label: "🇮🇹 意大利" },
  { value: "Spain", label: "🇪🇸 西班牙" },
  { value: "Japan", label: "🇯🇵 日本" },
  { value: "South Korea", label: "🇰🇷 한국" },
];

// 国家名 → 国旗emoji映射
const COUNTRY_FLAG_MAP: Record<string, string> = {
  "United States": "🇺🇸",
  "United Kingdom": "🇬🇧",
  "Germany": "🇩🇪",
  "France": "🇫🇷",
  "Canada": "🇨🇦",
  "Australia": "🇦🇺",
  "Netherlands": "🇳🇱",
  "Sweden": "🇸🇪",
  "Denmark": "🇩🇰",
  "Italy": "🇮🇹",
  "Spain": "🇪🇸",
  "Japan": "🇯🇵",
  "South Korea": "🇰🇷",
  "China": "🇨🇳",
  "Brazil": "🇧🇷",
  "India": "🇮🇳",
  "Mexico": "🇲🇽",
  "Poland": "🇵🇱",
  "Belgium": "🇧🇪",
  "Switzerland": "🇨🇭",
  "Austria": "🇦🇹",
  "Norway": "🇳🇴",
  "Finland": "🇫🇮",
  "Portugal": "🇵🇹",
  "Czech Republic": "🇨🇿",
  "Romania": "🇷🇴",
  "Hungary": "🇭🇺",
  "New Zealand": "🇳🇿",
  "Singapore": "🇸🇬",
  "Hong Kong": "🇭🇰",
  "Taiwan": "🇹🇼",
  "United Arab Emirates": "🇦🇪",
  "Saudi Arabia": "🇸🇦",
  "South Africa": "🇿🇦",
  "Israel": "🇮🇱",
  "Turkey": "🇹🇷",
  "Russia": "🇷🇺",
  "Ukraine": "🇺🇦",
  "Greece": "🇬🇷",
  "Ireland": "🇮🇪",
  "Thailand": "🇹🇭",
  "Malaysia": "🇲🇾",
  "Indonesia": "🇮🇩",
  "Philippines": "🇵🇭",
  "Vietnam": "🇻🇳",
};

function getCountryFlag(country: string | null | undefined): string {
  if (!country) return "";
  return COUNTRY_FLAG_MAP[country] ? `${COUNTRY_FLAG_MAP[country]} ` : "";
}

// 员工规模选项
const EMPLOYEE_SIZE_OPTIONS = [
  { min: 1, max: 10, label: "1-10人（微型）" },
  { min: 11, max: 50, label: "11-50人（小型）" },
  { min: 51, max: 200, label: "51-200人（中小型）" },
  { min: 201, max: 1000, label: "201-1000人（中型）" },
  { min: 1001, max: 5000, label: "1001-5000人（大型）" },
  { min: 5001, max: 999999, label: "5000人以上（超大型）" },
];

type Candidate = {
  id: number;
  erpCompanyId: number;
  searchScene: string;
  apolloPersonId: string | null;
  apolloOrgId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  jobTitle: string | null;
  companyName: string | null;
  companyDomain: string | null;
  companyLinkedinUrl: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employeeCount: number | null;
  annualRevenue: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyDescription: string | null;
  companyFoundedYear: number | null;
  companyLogoUrl: string | null;
  companyState: string | null;
  companyPostalCode: string | null;
  enrichedAt: Date | null;
  importStatus: string;
  importedCompanyId: number | null;
  importedContactId: number | null;
  importedAt: Date | null;
  importedBy: number | null;
  aiOutreachEmail: string | null;
  aiGeneratedAt: Date | null;
  searchBatchId: string;
  notes: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type CompanyGroup = {
  companyName: string;
  companyDomain: string | null;
  companyLinkedinUrl: string | null;
  industry: string | null;
  country: string | null;
  city: string | null;
  employeeCount: number | null;
  annualRevenue: string | null;
  companyPhone: string | null;
  companyAddress: string | null;
  companyDescription: string | null;
  companyFoundedYear: number | null;
  companyLogoUrl: string | null;
  people: Candidate[];
  allImported: boolean;
  allSkipped: boolean;
  pendingCount: number;
};

function groupByCompany(people: Candidate[]): CompanyGroup[] {
  const map = new Map<string, CompanyGroup>();
  for (const p of people) {
    const key = p.companyName || "未知公司";
    if (!map.has(key)) {
      map.set(key, {
        companyName: key,
        companyDomain: p.companyDomain,
        companyLinkedinUrl: p.companyLinkedinUrl,
        industry: p.industry,
        country: p.country,
        city: p.city,
        employeeCount: p.employeeCount,
        annualRevenue: p.annualRevenue,
        companyPhone: p.companyPhone,
        companyAddress: p.companyAddress,
        companyDescription: p.companyDescription,
        companyFoundedYear: p.companyFoundedYear,
        companyLogoUrl: p.companyLogoUrl,
        people: [],
        allImported: false,
        allSkipped: false,
        pendingCount: 0,
      });
    }
    map.get(key)!.people.push(p);
  }
  Array.from(map.values()).forEach((group: CompanyGroup) => {
    group.allImported = group.people.every((p: Candidate) => p.importStatus === "imported");
    group.allSkipped = group.people.every((p: Candidate) => p.importStatus === "skipped");
    group.pendingCount = group.people.filter((p: Candidate) => p.importStatus === "pending").length;
  });
  return Array.from(map.values()).sort((a, b) => {
    if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
    if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
    return b.people.length - a.people.length;
  });
}

export default function ApolloPage() {
  const utils = trpc.useUtils();

  const DEFAULT_JOB_TITLES = ["Purchasing Director", "Purchasing Manager", "Procurement Manager", "Buyer", "Sourcing Manager", "Category Manager"];
  const [scenario1Form, setScenario1Form] = useState({
    countries: [] as string[],
    industries: [] as string[],
    jobTitles: DEFAULT_JOB_TITLES,
    employeeSizeMin: undefined as number | undefined,
    employeeSizeMax: undefined as number | undefined,
    employeeSizeRanges: [] as string[],
    page: 1,
    perPage: 50,
  });
  const [scenario1Results, setScenario1Results] = useState<{
    people: Candidate[];
    totalCount: number;
    page: number;
    totalPages: number;
    batchId: string;
  } | null>(null);
  const [scenario1Loading, setScenario1Loading] = useState(false);

  const [competitorDomains, setCompetitorDomains] = useState<string[]>([""]);
  const [scenario2Loading, setScenario2Loading] = useState(false);
  const [scenario2Results, setScenario2Results] = useState<{
    people: Candidate[];
    totalCount: number;
    batchId: string;
  } | null>(null);

  const [candidateFilter, setCandidateFilter] = useState<"all" | "pending" | "imported" | "skipped">("all");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidateIndustryFilter, setCandidateIndustryFilter] = useState("");
  const [candidateCountryFilter, setCandidateCountryFilter] = useState("");
  const [candidateCompanyFilter, setCandidateCompanyFilter] = useState("");
  const [candidateFilterInput, setCandidateFilterInput] = useState({ industry: "", country: "", company: "" });
  const [showIndustryDropdown, setShowIndustryDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [allLoadedCandidates, setAllLoadedCandidates] = useState<Candidate[]>([]);
  const [candidateLoadMoreLoading, setCandidateLoadMoreLoading] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());

  // 公司分组展开状态
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedCompanies, setSelectedCompanies] = useState<Set<string>>(new Set());

  // 忽略公司弹窗
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [ignoreTarget, setIgnoreTarget] = useState<{ companyName: string; companyDomain?: string } | null>(null);
  const [ignoreReason, setIgnoreReason] = useState("");

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDialogCandidate, setEmailDialogCandidate] = useState<Candidate | null>(null);
  const [emailContent, setEmailContent] = useState("");
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [senderCompanyName, setSenderCompanyName] = useState("");
  const [senderProducts, setSenderProducts] = useState("实木家具、餐椅、沙发");

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importCandidateIds, setImportCandidateIds] = useState<number[]>([]);
  const [importMode, setImportMode] = useState<"ids" | "company">("ids");
  const [importCompanyName, setImportCompanyName] = useState("");

  const { data: candidatesData, refetch: refetchCandidates } = trpc.apollo.getCandidates.useQuery({
    importStatus: candidateFilter,
    page: candidatePage,
    pageSize: 20,
    industry: candidateIndustryFilter || undefined,
    country: candidateCountryFilter || undefined,
    companyName: candidateCompanyFilter || undefined,
  });

  // 候选人库累积加载：新数据到来时追加（page=1时重置）
  useEffect(() => {
    if (!candidatesData?.candidates) return;
    if (candidatePage === 1) {
      setAllLoadedCandidates(candidatesData.candidates as Candidate[]);
    } else {
      setAllLoadedCandidates(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = (candidatesData.candidates as Candidate[]).filter(c => !existingIds.has(c.id));
        return [...prev, ...newOnes];
      });
    }
    setCandidateLoadMoreLoading(false);
  }, [candidatesData, candidatePage]);

  const { data: filterOptions } = trpc.apollo.getCandidateFilterOptions.useQuery();
  const { data: ignoredCompanies, refetch: refetchIgnored } = trpc.apollo.getIgnoredCompanies.useQuery();
  const { data: statsData } = trpc.apollo.getStats.useQuery();

  const searchBuyersMutation = trpc.apollo.searchBuyers.useMutation();
  const searchCompetitorCustomersMutation = trpc.apollo.searchCompetitorCustomers.useMutation();
  const generateEmailMutation = trpc.apollo.generateOutreachEmail.useMutation();
  const importCandidatesMutation = trpc.apollo.importCandidates.useMutation();
  const importByCompanyMutation = trpc.apollo.importByCompany.useMutation();
  const updateStatusMutation = trpc.apollo.updateCandidateStatus.useMutation();
  const deleteMutation = trpc.apollo.deleteCandidate.useMutation();
  const ignoreCompanyMutation = trpc.apollo.ignoreCompany.useMutation();
  const unignoreCompanyMutation = trpc.apollo.unignoreCompany.useMutation();
  const batchSendEmailsMutation = trpc.apollo.batchSendEmails.useMutation();
  const importSelectedContactsMutation = trpc.apollo.importSelectedContacts.useMutation();
  const enrichCandidatesMutation = trpc.apollo.enrichCandidates.useMutation();
  const [enrichLoading, setEnrichLoading] = useState(false);

  // 批量发送弹窗
  const [batchSendDialogOpen, setBatchSendDialogOpen] = useState(false);
  const [batchSendIds, setBatchSendIds] = useState<number[]>([]);
  const [batchSendLoading, setBatchSendLoading] = useState(false);

   // 分页加载更多
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  // 重置候选人库并刷新（导入/删除后调用）
  const resetAndRefetchCandidates = () => {
    setAllLoadedCandidates([]);
    setCandidatePage(1);
    // page=1时useEffect会自动用新数据替换
    refetchCandidates();
  };

  const handleScenario1Search = async () => {
    if (scenario1Form.countries.length === 0 && scenario1Form.industries.length === 0 && scenario1Form.jobTitles.length === 0) {
      toast.error("请至少设置目标市场、行业或职位中的一个筛选条件");
      return;
    }
    setScenario1Loading(true);
    try {
      const result = await searchBuyersMutation.mutateAsync(scenario1Form);
      setScenario1Results(result as typeof scenario1Results);
      // 默认折叠所有公司
      setExpandedCompanies(new Set());
      toast.success(`找到 ${result.totalCount} 位潜在买家，已暂存 ${result.people.length} 条`);
      refetchCandidates();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "搜索失败，请稍后重试");
    } finally {
      setScenario1Loading(false);
    }
  };

  const handleScenario2Search = async () => {
    const validDomains = competitorDomains.filter(d => d.trim());
    if (validDomains.length === 0) {
      toast.error("请输入至少一个竞争对手域名");
      return;
    }
    setScenario2Loading(true);
    try {
      const result = await searchCompetitorCustomersMutation.mutateAsync({ competitorDomains: validDomains });
      setScenario2Results(result as typeof scenario2Results);
      // 默认折叠所有公司
      setExpandedCompanies(new Set());
      toast.success(`找到 ${result.totalCount} 位竞品客户决策人`);
      refetchCandidates();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "搜索失败，请稍后重试");
    } finally {
      setScenario2Loading(false);
    }
  };

  const handleGenerateEmail = async (candidate: Candidate) => {
    setEmailDialogCandidate(candidate);
    setEmailContent(candidate.aiOutreachEmail || "");
    setEmailDialogOpen(true);
    if (!candidate.aiOutreachEmail) {
      setEmailGenerating(true);
      try {
        const result = await generateEmailMutation.mutateAsync({
          candidateId: candidate.id,
          senderCompanyName,
          senderProducts,
        });
        setEmailContent(result.email);
        refetchCandidates();
      } catch (e: unknown) {
        toast.error((e as Error).message || "生成失败");
      } finally {
        setEmailGenerating(false);
      }
    }
  };

  const handleBatchSend = async () => {
    if (batchSendIds.length === 0) return;
    setBatchSendLoading(true);
    try {
      const result = await batchSendEmailsMutation.mutateAsync({
        candidateIds: batchSendIds,
        senderCompanyName: senderCompanyName || "我们公司",
        senderProducts: senderProducts || "实木家具",
        regenerateIfMissing: true,
      });
      const msg = `发送完成：${result.sent} 封已发送，${result.generated} 封已生成（无邮箱），${result.failed} 封失败`;
      if (result.failed > 0) toast.warning(msg);
      else toast.success(msg);
      setBatchSendDialogOpen(false);
      setBatchSendIds([]);
      setSelectedCandidates(new Set());
      resetAndRefetchCandidates();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "发送失败");
    } finally {
      setBatchSendLoading(false);
    }
  };

  const handleLoadMore = async (scenario: "search" | "competitor") => {
    const currentResults = scenario === "search" ? scenario1Results : scenario2Results;
    if (!currentResults) return;
    setLoadMoreLoading(true);
    try {
      const nextPage = Math.floor(currentResults.people.length / 50) + 1;
      let result: typeof scenario1Results;
      if (scenario === "search") {
        result = await searchBuyersMutation.mutateAsync({ ...scenario1Form, page: nextPage }) as typeof scenario1Results;
        setScenario1Results(prev => prev ? {
          ...result!,
          people: [...prev.people, ...(result!.people.filter(p => !prev.people.find(ep => ep.id === p.id)))],
        } : result);
      } else {
        const validDomains = competitorDomains.filter(d => d.trim());
        const nextPageCompetitor = Math.floor(currentResults.people.length / 50) + 1;
        result = await searchCompetitorCustomersMutation.mutateAsync({ competitorDomains: validDomains, page: nextPageCompetitor }) as typeof scenario1Results;
        setScenario2Results(prev => prev ? {
          ...result!,
          people: [...prev.people, ...(result!.people.filter(p => !prev.people.find(ep => ep.id === p.id)))],
        } : result);
      }
      toast.success(`加载了 ${result!.people.length} 条新结果`);
      refetchCandidates();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "加载失败");
    } finally {
      setLoadMoreLoading(false);
    }
  };

  const handleImportConfirm = async () => {
    try {
      let result: { imported: number; failed: number };
      if (importMode === "company" && importCompanyName) {
        result = await importByCompanyMutation.mutateAsync({ companyName: importCompanyName });
        toast.success(`成功导入 ${result.imported} 位客户（来自 ${importCompanyName}）`);
      } else {
        // Use importSelectedContacts for contact-level import
        result = await importSelectedContactsMutation.mutateAsync({ candidateIds: importCandidateIds });
        toast.success(`成功导入 ${result.imported} 位客户`);
      }
      if (result.failed > 0) toast.warning(`${result.failed} 位导入失败，请检查数据`);
      setImportDialogOpen(false);
      setImportCandidateIds([]);
      setImportCompanyName("");
      setSelectedCandidates(new Set());
      setSelectedCompanies(new Set());
      resetAndRefetchCandidates();
      utils.apollo.getStats.invalidate();
      // 刷新搜索结果状态
      if (scenario1Results) {
        setScenario1Results(prev => prev ? {
          ...prev,
          people: prev.people.map(p =>
            importCandidateIds.includes(p.id) ? { ...p, importStatus: "imported" } : p
          ),
        } : null);
      }
    } catch (e: unknown) {
      toast.error((e as Error).message || "导入失败");
    }
  };

  const handleSkip = async (id: number) => {
    await updateStatusMutation.mutateAsync({ id, status: "skipped" });
    resetAndRefetchCandidates();
  };

  const handleDelete = async (id: number) => {
    await deleteMutation.mutateAsync({ id });
    resetAndRefetchCandidates();
    utils.apollo.getStats.invalidate();
  };

  const openIgnoreDialog = (companyName: string, companyDomain?: string | null) => {
    setIgnoreTarget({ companyName, companyDomain: companyDomain || undefined });
    setIgnoreReason("");
    setIgnoreDialogOpen(true);
  };

  const handleIgnoreCompany = async () => {
    if (!ignoreTarget) return;
    try {
      const result = await ignoreCompanyMutation.mutateAsync({
        companyName: ignoreTarget.companyName,
        companyDomain: ignoreTarget.companyDomain,
        reason: ignoreReason || undefined,
      });
      toast.success(`已忽略 ${ignoreTarget.companyName}（${result.affected} 位候选人标记为已跳过）`);
      setIgnoreDialogOpen(false);
      setIgnoreTarget(null);
      const name = ignoreTarget.companyName;
      if (scenario1Results) {
        setScenario1Results(prev => prev ? {
          ...prev,
          people: prev.people.map(p => p.companyName === name ? { ...p, importStatus: "skipped" } : p),
        } : null);
      }
      if (scenario2Results) {
        setScenario2Results(prev => prev ? {
          ...prev,
          people: prev.people.map(p => p.companyName === name ? { ...p, importStatus: "skipped" } : p),
        } : null);
      }
      refetchCandidates();
      refetchIgnored();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "操作失败");
    }
  };

  const handleUnignoreCompany = async (companyName: string) => {
    try {
      const result = await unignoreCompanyMutation.mutateAsync({ companyName });
      toast.success(`已恢复 ${companyName}（${result.affected} 位候选人恢复为待处理）`);
      refetchIgnored();
      resetAndRefetchCandidates();
      utils.apollo.getStats.invalidate();
    } catch (e: unknown) {
      toast.error((e as Error).message || "操作失败");
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedCandidates);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedCandidates(next);
  };

  const toggleSelectAll = () => {
    const allIds = allLoadedCandidates.map((c: Candidate) => c.id);
    if (selectedCandidates.size === allIds.length) setSelectedCandidates(new Set());
    else setSelectedCandidates(new Set(allIds));
  };

  const toggleCompanySelect = (companyName: string, people: Candidate[]) => {
    const nextC = new Set(selectedCompanies);
    const nextP = new Set(selectedCandidates);
    if (nextC.has(companyName)) {
      nextC.delete(companyName);
      people.forEach(p => nextP.delete(p.id));
    } else {
      nextC.add(companyName);
      people.filter(p => p.importStatus === "pending").forEach(p => nextP.add(p.id));
    }
    setSelectedCompanies(nextC);
    setSelectedCandidates(nextP);
  };

  const toggleExpand = (name: string) => {
    const next = new Set(expandedCompanies);
    if (next.has(name)) next.delete(name); else next.add(name);
    setExpandedCompanies(next);
  };

  const expandAll = (groups: CompanyGroup[]) => setExpandedCompanies(new Set(groups.map(g => g.companyName)));
  const collapseAll = () => setExpandedCompanies(new Set());

  const openImportDialog = (ids: number[], mode: "ids" | "company" = "ids", companyName?: string) => {
    setImportMode(mode);
    setImportCandidateIds(ids);
    setImportCompanyName(companyName || "");
    setImportDialogOpen(true);
  };

  // importableSelected: 直接使用selectedCandidates的所有id
  // 后端importSelectedContacts会再次校验importStatus=pending，
  // 这样即使跨页选择也能正确导入，不依赖当前页数据
  const importableSelected = useMemo(() => {
    return Array.from(selectedCandidates);
  }, [selectedCandidates]);

  const importableFromSearch = useMemo(() => {
    const allPeople = [...(scenario1Results?.people || []), ...(scenario2Results?.people || [])];
    return allPeople.filter(p => selectedCandidates.has(p.id) && p.importStatus === "pending").map(p => p.id);
  }, [scenario1Results, scenario2Results, selectedCandidates]);

  const toggleCountry = (val: string) => setScenario1Form(f => ({
    ...f, countries: f.countries.includes(val) ? f.countries.filter(v => v !== val) : [...f.countries, val],
  }));
  const toggleIndustry = (val: string) => setScenario1Form(f => ({
    ...f, industries: f.industries.includes(val) ? f.industries.filter(v => v !== val) : [...f.industries, val],
  }));
  const toggleJobTitle = (val: string) => setScenario1Form(f => ({
    ...f, jobTitles: f.jobTitles.includes(val) ? f.jobTitles.filter(v => v !== val) : [...f.jobTitles, val],
  }));
  const toggleEmployeeSize = (rangeStr: string) => setScenario1Form(f => ({
    ...f, employeeSizeRanges: f.employeeSizeRanges.includes(rangeStr)
      ? f.employeeSizeRanges.filter(v => v !== rangeStr)
      : [...f.employeeSizeRanges, rangeStr],
  }));

  // 使用累积加载的候选人数据
  const candidates: Candidate[] = allLoadedCandidates;
  const totalCandidates = candidatesData?.total || 0;
  const hasMoreCandidates = allLoadedCandidates.length < totalCandidates;

  return (
    <TooltipProvider>
    <ERPLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Telescope className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Apollo 智能开发</h1>
              <p className="text-sm text-gray-500">精准触达海外买家，AI生成个性化开发信</p>
            </div>
          </div>
          {statsData && (
            <div className="flex gap-6">
              {[
                { val: statsData.total, label: "候选人总数", color: "text-blue-600" },
                { val: statsData.pending, label: "待处理", color: "text-amber-500" },
                { val: statsData.imported, label: "已导入", color: "text-green-600" },
                { val: statsData.withEmail, label: "已生成开发信", color: "text-purple-600" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs defaultValue="search">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="search">
              <Search className="h-4 w-4 mr-1.5" />精准开发
            </TabsTrigger>
            <TabsTrigger value="competitor">
              <Building2 className="h-4 w-4 mr-1.5" />潜在买手
            </TabsTrigger>
            <TabsTrigger value="candidates">
              <Users className="h-4 w-4 mr-1.5" />候选人库
              {(statsData?.pending || 0) > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-xs">{statsData?.pending}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ignored">
              <BanIcon className="h-4 w-4 mr-1.5" />已忽略
              {(ignoredCompanies?.length || 0) > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-xs">{ignoredCompanies?.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ===== 精准开发 ===== */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Filter className="h-4 w-4 text-blue-500" />筛选条件
                    </CardTitle>
                    <CardDescription>设置目标买家画像，精准定位决策人</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">目标市场</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {COUNTRY_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => toggleCountry(opt.value)}
                            className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                              scenario1Form.countries.includes(opt.value)
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                            }`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">目标行业</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {INDUSTRY_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => toggleIndustry(opt.value)}
                            className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                              scenario1Form.industries.includes(opt.value)
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                            }`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">目标职位</Label>
                        <div className="flex gap-1.5">
                          <button onClick={() => setScenario1Form(f => ({ ...f, jobTitles: JOB_TITLE_OPTIONS.map(o => o.value) }))}
                            className="text-xs text-blue-500 hover:text-blue-700 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors">全选</button>
                          <button onClick={() => setScenario1Form(f => ({ ...f, jobTitles: [] }))}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors">清除</button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {JOB_TITLE_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => toggleJobTitle(opt.value)}
                            className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                              scenario1Form.jobTitles.includes(opt.value)
                                ? "bg-green-600 text-white border-green-600"
                                : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                            }`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">公司规模（可多选）</Label>
                        {scenario1Form.employeeSizeRanges.length > 0 && (
                          <button onClick={() => setScenario1Form(f => ({ ...f, employeeSizeRanges: [] }))}
                            className="text-xs text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100 transition-colors">清除</button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {EMPLOYEE_SIZE_OPTIONS.map(opt => {
                          const rangeStr = `${opt.min}-${opt.max}`;
                          const selected = scenario1Form.employeeSizeRanges.includes(rangeStr);
                          return (
                            <button key={rangeStr} onClick={() => toggleEmployeeSize(rangeStr)}
                              className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                                selected
                                  ? "bg-orange-500 text-white border-orange-500"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"
                              }`}>{opt.label}</button>
                          );
                        })}
                      </div>
                    </div>
                    {(scenario1Form.countries.length > 0 || scenario1Form.industries.length > 0 || scenario1Form.jobTitles.length > 0 || scenario1Form.employeeSizeRanges.length > 0) && (
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 space-y-1">
                        <div className="font-medium mb-1">已选筛选条件：</div>
                        {scenario1Form.countries.length > 0 && <div>市场：{scenario1Form.countries.join("、")}</div>}
                        {scenario1Form.industries.length > 0 && <div>行业：{scenario1Form.industries.join("、")}</div>}
                        {scenario1Form.jobTitles.length > 0 && <div>职位：{scenario1Form.jobTitles.join("、")}</div>}
                        {scenario1Form.employeeSizeRanges.length > 0 && <div>规模：{scenario1Form.employeeSizeRanges.map(r => EMPLOYEE_SIZE_OPTIONS.find(o => `${o.min}-${o.max}` === r)?.label || r).join("、")}</div>}
                      </div>
                    )}
                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleScenario1Search} disabled={scenario1Loading}>
                      {scenario1Loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />搜索中...</> : <><Search className="h-4 w-4 mr-2" />开始搜索</>}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />AI开发信配置
                    </CardTitle>
                    <CardDescription>配置发件方信息，AI将生成个性化开发信</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">您的公司名称</Label>
                      <Input placeholder="例：Casaviva Furniture" value={senderCompanyName} onChange={e => setSenderCompanyName(e.target.value)} className="text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">主营产品（简述）</Label>
                      <Textarea placeholder="例：实木餐桌椅、沙发、床架，主打北欧简约风格" value={senderProducts} onChange={e => setSenderProducts(e.target.value)} rows={3} className="text-sm" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                {scenario1Results ? (
                  <SearchResultsGrouped
                    results={scenario1Results}
                    expandedCompanies={expandedCompanies}
                    selectedCandidates={selectedCandidates}
                    selectedCompanies={selectedCompanies}
                    onToggleExpand={toggleExpand}
                    onToggleCompanySelect={toggleCompanySelect}
                    onToggleCandidateSelect={(id) => { const n = new Set(selectedCandidates); n.has(id) ? n.delete(id) : n.add(id); setSelectedCandidates(n); }}
                    onExpandAll={() => expandAll(groupByCompany(scenario1Results.people))}
                    onCollapseAll={collapseAll}
                    onGenerateEmail={handleGenerateEmail}
                    onImportCompany={(companyName, ids) => openImportDialog(ids, "company", companyName)}
                    onIgnoreCompany={openIgnoreDialog}
                    onImportSelected={() => openImportDialog(importableFromSearch)}
                    importableSelectedCount={importableFromSearch.length}
                    selectedCount={selectedCandidates.size}
                    onLoadMore={() => handleLoadMore("search")}
                    loadMoreLoading={loadMoreLoading}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-xl border border-dashed border-gray-200">
                    <Telescope className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">设置筛选条件后开始搜索</p>
                    <p className="text-gray-400 text-sm mt-1">支持按国家、行业、职位、公司规模多维度筛选</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== 潜在买手（原竞品挖掘）===== */}
          <TabsContent value="competitor" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-orange-500" />潜在买手挖掘
                    </CardTitle>
                    <CardDescription>输入竞争对手网站域名，找到其客户公司的采购决策人和潜在买手</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {competitorDomains.map((domain, idx) => (
                      <div key={idx} className="flex gap-2">
                        <Input placeholder="例：ashley.com" value={domain} onChange={e => { const n = [...competitorDomains]; n[idx] = e.target.value; setCompetitorDomains(n); }} />
                        {competitorDomains.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => setCompetitorDomains(competitorDomains.filter((_, i) => i !== idx))}>
                            <X className="h-4 w-4 text-gray-400" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setCompetitorDomains([...competitorDomains, ""])}>
                      <Plus className="h-4 w-4 mr-1.5" />添加竞争对手
                    </Button>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      <div className="font-medium mb-1">使用说明</div>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>输入竞争对手的主域名（如 ashley.com）</li>
                        <li>系统将分析其客户公司并找到采购决策人</li>
                        <li>建议一次不超过5个域名</li>
                      </ul>
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600" onClick={handleScenario2Search} disabled={scenario2Loading}>
                      {scenario2Loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />分析中...</> : <><Building2 className="h-4 w-4 mr-2" />开始挖掘</>}
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-2">
                {scenario2Results ? (
                  <SearchResultsGrouped
                    results={scenario2Results}
                    expandedCompanies={expandedCompanies}
                    selectedCandidates={selectedCandidates}
                    selectedCompanies={selectedCompanies}
                    onToggleExpand={toggleExpand}
                    onToggleCompanySelect={toggleCompanySelect}
                    onToggleCandidateSelect={(id) => { const n = new Set(selectedCandidates); n.has(id) ? n.delete(id) : n.add(id); setSelectedCandidates(n); }}
                    onExpandAll={() => expandAll(groupByCompany(scenario2Results.people))}
                    onCollapseAll={collapseAll}
                    onGenerateEmail={handleGenerateEmail}
                    onImportCompany={(companyName, ids) => openImportDialog(ids, "company", companyName)}
                    onIgnoreCompany={openIgnoreDialog}
                    onImportSelected={() => openImportDialog(importableFromSearch)}
                    importableSelectedCount={importableFromSearch.length}
                    selectedCount={selectedCandidates.size}
                    accentColor="orange"
                    onLoadMore={() => handleLoadMore("competitor")}
                    loadMoreLoading={loadMoreLoading}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-80 text-center bg-white rounded-xl border border-dashed border-gray-200">
                    <Building2 className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">输入竞争对手域名后开始挖掘</p>
                    <p className="text-gray-400 text-sm mt-1">精准定位竞品已有客户的采购决策人</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ===== 候选人库 ===== */}
          <TabsContent value="candidates" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="text-base">候选人库</CardTitle>
                    <CardDescription>管理所有搜索到的潜在买家，一键导入到客户管理</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border overflow-hidden text-xs">
                      {(["all", "pending", "imported", "skipped"] as const).map(status => (
                        <button key={status} onClick={() => { setCandidateFilter(status); setCandidatePage(1); setAllLoadedCandidates([]); setSelectedCandidates(new Set()); }}
                          className={`px-3 py-1.5 transition-colors ${candidateFilter === status ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                          {status === "all" ? "全部" : status === "pending" ? "待处理" : status === "imported" ? "已导入" : "已跳过"}
                        </button>
                      ))}
                    </div>
                    {selectedCandidates.size > 0 && (
                      <>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openImportDialog(importableSelected)} disabled={importableSelected.length === 0}>
                          <UserCheck className="h-4 w-4 mr-1.5" />导入已选 ({importableSelected.length})
                        </Button>
                        <Button size="sm" variant="outline" className="border-purple-300 text-purple-600 hover:bg-purple-50" onClick={() => { setBatchSendIds(Array.from(selectedCandidates)); setBatchSendDialogOpen(true); }}>
                          <Send className="h-4 w-4 mr-1.5" />批量发信 ({selectedCandidates.size})
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm" onClick={async () => {
                      setEnrichLoading(true);
                      try {
                        const result = await enrichCandidatesMutation.mutateAsync({ limit: 50 });
                        toast.success(`富化完成：${result.enriched} 条成功，${result.failed} 条失败`);
                        resetAndRefetchCandidates();
                      } catch (e: unknown) {
                        toast.error((e as Error).message || "富化失败");
                      } finally {
                        setEnrichLoading(false);
                      }
                    }} disabled={enrichLoading} title="批量获取完整姓名和邮箱">
                      {enrichLoading ? <><RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />富化中...</> : <><Sparkles className="h-4 w-4 mr-1.5" />批量富化</>}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => resetAndRefetchCandidates()}><RefreshCw className="h-4 w-4" /></Button>
                  </div>
                </div>
                {/* 多维筛选行 */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Filter className="h-3.5 w-3.5" />
                    <span>筛选：</span>
                  </div>
                  <Input
                    placeholder="公司名称"
                    value={candidateFilterInput.company}
                    onChange={e => setCandidateFilterInput(prev => ({ ...prev, company: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") { setCandidateCompanyFilter(candidateFilterInput.company); setCandidatePage(1); setAllLoadedCandidates([]); } }}
                    className="h-7 text-xs w-36"
                  />
                  {/* 行业筛选 - 带下拉候选 */}
                  <div className="relative">
                    <Input
                      placeholder="行业"
                      value={candidateFilterInput.industry}
                      onChange={e => {
                        setCandidateFilterInput(prev => ({ ...prev, industry: e.target.value }));
                        setShowIndustryDropdown(true);
                      }}
                      onFocus={() => setShowIndustryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowIndustryDropdown(false), 150)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          setCandidateIndustryFilter(candidateFilterInput.industry);
                          setCandidatePage(1);
                          setAllLoadedCandidates([]);
                          setShowIndustryDropdown(false);
                        }
                        if (e.key === "Escape") setShowIndustryDropdown(false);
                      }}
                      className="h-7 text-xs w-32"
                    />
                    {showIndustryDropdown && filterOptions?.industries && filterOptions.industries.filter(v =>
                      !candidateFilterInput.industry || v.toLowerCase().includes(candidateFilterInput.industry.toLowerCase())
                    ).length > 0 && (
                      <div className="absolute top-full left-0 mt-0.5 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filterOptions.industries
                          .filter(v => !candidateFilterInput.industry || v.toLowerCase().includes(candidateFilterInput.industry.toLowerCase()))
                          .slice(0, 20)
                          .map(v => (
                            <div
                              key={v}
                              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate"
                              onMouseDown={() => {
                                setCandidateFilterInput(prev => ({ ...prev, industry: v }));
                                setCandidateIndustryFilter(v);
                                setCandidatePage(1);
                                setAllLoadedCandidates([]);
                                setShowIndustryDropdown(false);
                              }}
                            >{v}</div>
                          ))}
                      </div>
                    )}
                  </div>
                  {/* 国家筛选 - 带下拉候选 */}
                  <div className="relative">
                    <Input
                      placeholder="国家"
                      value={candidateFilterInput.country}
                      onChange={e => {
                        setCandidateFilterInput(prev => ({ ...prev, country: e.target.value }));
                        setShowCountryDropdown(true);
                      }}
                      onFocus={() => setShowCountryDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCountryDropdown(false), 150)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          setCandidateCountryFilter(candidateFilterInput.country);
                          setCandidatePage(1);
                          setAllLoadedCandidates([]);
                          setShowCountryDropdown(false);
                        }
                        if (e.key === "Escape") setShowCountryDropdown(false);
                      }}
                      className="h-7 text-xs w-32"
                    />
                    {showCountryDropdown && filterOptions?.countries && filterOptions.countries.filter(v =>
                      !candidateFilterInput.country || v.toLowerCase().includes(candidateFilterInput.country.toLowerCase())
                    ).length > 0 && (
                      <div className="absolute top-full left-0 mt-0.5 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                        {filterOptions.countries
                          .filter(v => !candidateFilterInput.country || v.toLowerCase().includes(candidateFilterInput.country.toLowerCase()))
                          .slice(0, 20)
                          .map(v => (
                            <div
                              key={v}
                              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 hover:text-blue-700 truncate"
                              onMouseDown={() => {
                                setCandidateFilterInput(prev => ({ ...prev, country: v }));
                                setCandidateCountryFilter(v);
                                setCandidatePage(1);
                                setAllLoadedCandidates([]);
                                setShowCountryDropdown(false);
                              }}
                            >{v}</div>
                          ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" className="h-7 text-xs px-3" onClick={() => {
                    setCandidateCompanyFilter(candidateFilterInput.company);
                    setCandidateIndustryFilter(candidateFilterInput.industry);
                    setCandidateCountryFilter(candidateFilterInput.country);
                    setCandidatePage(1);
                    setAllLoadedCandidates([]);
                  }}>搜索</Button>
                  {(candidateCompanyFilter || candidateIndustryFilter || candidateCountryFilter) && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-gray-500" onClick={() => {
                      setCandidateFilterInput({ industry: "", country: "", company: "" });
                      setCandidateCompanyFilter("");
                      setCandidateIndustryFilter("");
                      setCandidateCountryFilter("");
                      setCandidatePage(1);
                      setAllLoadedCandidates([]);
                    }}><X className="h-3 w-3 mr-1" />清除</Button>
                  )}
                  {(candidateCompanyFilter || candidateIndustryFilter || candidateCountryFilter) && (
                    <span className="text-xs text-blue-600">已筛选：{[candidateCompanyFilter && `公司“${candidateCompanyFilter}”`, candidateIndustryFilter && `行业“${candidateIndustryFilter}”`, candidateCountryFilter && `国家“${candidateCountryFilter}”`].filter(Boolean).join("、")}</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {candidates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Users className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-gray-500">暂无候选人</p>
                    <p className="text-gray-400 text-sm mt-1">通过精准开发或竞品挖掘搜索买家</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <Checkbox checked={selectedCandidates.size === candidates.length && candidates.length > 0} onCheckedChange={toggleSelectAll} />
                      <span className="flex-1">姓名 / 公司</span>
                      <span className="w-32">联系方式</span>
                      <span className="w-24">状态</span>
                      <span className="w-40 text-right">操作</span>
                    </div>
                    <div className="divide-y">
                      {candidates.map((candidate: Candidate) => (
                        <div key={candidate.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <Checkbox checked={selectedCandidates.has(candidate.id)} onCheckedChange={() => toggleSelect(candidate.id)} />
                          {/* 公司Logo小头像 */}
                          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-gray-200">
                            {candidate.companyLogoUrl ? (
                              <img src={candidate.companyLogoUrl} alt={candidate.companyName || ''} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-bold text-gray-600">${(candidate.companyName || '?').charAt(0).toUpperCase()}</span>`; }} />
                            ) : (
                              <span className="text-xs font-bold text-gray-600">{(candidate.companyName || '?').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate flex items-center gap-1">
                              <span className="truncate">{candidate.fullName || `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()}</span>
                              {candidate.enrichedAt && <span className="text-green-500 text-xs" title="已富化">✓</span>}
                              {candidate.jobTitle && <span className="text-gray-500 font-normal">· {candidate.jobTitle}</span>}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-medium text-gray-700">{candidate.companyName || "—"}</span>
                              {candidate.country && <span className="text-gray-400">{getCountryFlag(candidate.country)}{candidate.country}{candidate.city ? ` · ${candidate.city}` : ""}</span>}
                              {candidate.industry && <span className="bg-purple-50 text-purple-600 px-1 py-0.5 rounded text-xs">{candidate.industry}</span>}
                              {candidate.employeeCount && <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded text-xs">👥 {candidate.employeeCount.toLocaleString()}人</span>}
                              {candidate.annualRevenue && <span className="bg-green-50 text-green-600 px-1 py-0.5 rounded text-xs">💰 {candidate.annualRevenue}</span>}
                              {candidate.companyDomain && (
                                <a href={/^https?:\/\//i.test(candidate.companyDomain) ? candidate.companyDomain : `https://${candidate.companyDomain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>
                                  <Globe className="h-2.5 w-2.5" />{candidate.companyDomain.replace(/^https?:\/\//, '')}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="w-40 text-xs space-y-0.5">
                            {candidate.email ? (
                              <div className="flex items-center gap-1 text-gray-700 truncate">
                                <Mail className="h-3 w-3 flex-shrink-0 text-blue-400" />
                                <span className="truncate font-medium">{candidate.email}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-gray-300 text-xs">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span>待富化...</span>
                              </div>
                            )}
                            {candidate.phone && (
                              <div className="flex items-center gap-1 text-gray-600 truncate">
                                <span className="text-xs">📞</span>
                                <span className="truncate">{candidate.phone}</span>
                              </div>
                            )}
                            {candidate.linkedinUrl && (
                              <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                <Linkedin className="h-3 w-3 flex-shrink-0" />LinkedIn
                              </a>
                            )}
                          </div>
                          <div className="w-24">
                            <StatusBadge status={candidate.importStatus} />
                            {candidate.aiOutreachEmail && (
                              <div className="flex items-center gap-1 text-xs text-purple-500 mt-0.5">
                                <Sparkles className="h-3 w-3" />已生成信
                              </div>
                            )}
                          </div>
                          <div className="w-40 flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-purple-600 hover:bg-purple-50" onClick={() => handleGenerateEmail(candidate)}>
                              <Sparkles className="h-3 w-3 mr-1" />{candidate.aiOutreachEmail ? "查看信" : "生成信"}
                            </Button>
                            {candidate.importStatus === "pending" && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50" onClick={() => openImportDialog([candidate.id])}>
                                <UserCheck className="h-3 w-3 mr-1" />导入
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => handleDelete(candidate.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                        <span className="text-xs text-gray-500">已加载 {candidates.length} / {totalCandidates} 条</span>
                        {hasMoreCandidates && (
                          <Button variant="outline" size="sm" className="text-xs" disabled={candidateLoadMoreLoading} onClick={() => {
                            setCandidateLoadMoreLoading(true);
                            setCandidatePage(p => p + 1);
                          }}>
                            {candidateLoadMoreLoading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />加载中...</> : <>加载更多 ({totalCandidates - candidates.length} 条)</>}
                          </Button>
                        )}
                      </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== 已忽略公司 ===== */}
          <TabsContent value="ignored" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BanIcon className="h-4 w-4 text-gray-500" />已忽略公司
                    </CardTitle>
                    <CardDescription>以下公司已被标记为忽略，可随时恢复为待处理状态。</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchIgnored()}><RefreshCw className="h-4 w-4 mr-1.5" />刷新</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {!ignoredCompanies || ignoredCompanies.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <BanIcon className="h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-gray-500">暂无已忽略的公司</p>
                    <p className="text-gray-400 text-sm mt-1">在搜索结果中点击"忽略"即可添加</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-3 text-xs text-gray-500 font-medium">
                      <span className="flex-1">公司名称</span>
                      <span className="w-40">行业 / 国家 / 规模</span>
                      <span className="w-32">忽略原因</span>
                      <span className="w-20 text-right">操作</span>
                    </div>
                    <div className="divide-y">
                      {(ignoredCompanies as Array<{
                        companyName: string | null;
                        companyDomain: string | null;
                        industry: string | null;
                        country: string | null;
                        employeeCount: number | null;
                        notes: string | null;
                      }>).map((company) => (
                        <div key={company.companyName} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900">{company.companyName || "—"}</div>
                            {company.companyDomain && (
                              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Globe className="h-3 w-3" />{company.companyDomain}
                              </div>
                            )}
                          </div>
                          <div className="w-40 text-xs text-gray-500 space-y-0.5">
                            {company.industry && <div>{company.industry}</div>}
                            {company.country && <div className="text-gray-400">{company.country}</div>}
                            {company.employeeCount && <div>{company.employeeCount.toLocaleString()} 人</div>}
                          </div>
                          <div className="w-32 text-xs text-gray-500 truncate">
                            {company.notes?.replace("[忽略公司] ", "") || "—"}
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            {company.companyDomain && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-500 hover:bg-blue-50"
                                    onClick={() => window.open(/^https?:\/\//i.test(company.companyDomain!) ? company.companyDomain! : `https://${company.companyDomain}`, '_blank', 'noopener,noreferrer')}>
                                    <ExternalLink className="h-3 w-3 mr-1" />官网
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>访问 {company.companyDomain!.replace(/^https?:\/\//, '')}</p></TooltipContent>
                              </Tooltip>
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 px-2 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                                  onClick={() => handleUnignoreCompany(company.companyName || "")} disabled={unignoreCompanyMutation.isPending}>
                                  <RotateCcw className="h-3 w-3 mr-1" />恢复
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>将该公司候选人恢复为待处理状态</p></TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* AI开发信对话框 */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />AI个性化开发信
            </DialogTitle>
            <DialogDescription>
              {emailDialogCandidate && <>为 <strong>{emailDialogCandidate.fullName || `${emailDialogCandidate.firstName || ''} ${emailDialogCandidate.lastName || ''}`.trim()}</strong>（{emailDialogCandidate.companyName}）生成的开发信</>}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-48">
            {emailGenerating ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Loader2 className="h-8 w-8 text-purple-500 animate-spin mb-3" />
                <p className="text-gray-500">AI正在生成个性化开发信...</p>
              </div>
            ) : (
              <Textarea value={emailContent} onChange={e => setEmailContent(e.target.value)} rows={12} className="font-mono text-sm" placeholder="开发信内容将显示在这里..." />
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>关闭</Button>
            {emailContent && (
              <Button onClick={() => { navigator.clipboard.writeText(emailContent); toast.success("已复制到剪贴板"); }}>复制内容</Button>
            )}
            {emailDialogCandidate && emailDialogCandidate.importStatus === "pending" && (
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setEmailDialogOpen(false); openImportDialog([emailDialogCandidate.id]); }}>
                <UserCheck className="h-4 w-4 mr-1.5" />导入此客户
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 导入确认对话框 */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />确认导入客户
            </DialogTitle>
            <DialogDescription>
              {importMode === "company" && importCompanyName
                ? <>即将导入 <strong className="text-gray-900">{importCompanyName}</strong> 的所有待处理候选人</>
                : <>即将导入 <strong className="text-gray-900">{importCandidateIds.length}</strong> 位候选人到客户管理系统</>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-blue-900">导入将自动完成以下操作：</div>
                  <div>✓ 创建公司档案（状态：<strong>开发中</strong>，来源：Apollo）</div>
                  <div>✓ 填充公司信息：行业、国家、员工规模、网站域名</div>
                  <div>✓ 创建联系人记录（姓名、职位、邮箱、LinkedIn）</div>
                  <div>✓ 自动关联联系人与公司</div>
                  <div>✓ 已存在的公司（相同名称）将直接关联，不重复创建</div>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div><div className="font-medium mb-1">导入前请确认：</div>此操作不可撤销，导入后可在客户管理中查看和编辑所有信息。</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>取消，再检查一下</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={handleImportConfirm}
              disabled={importSelectedContactsMutation.isPending || importByCompanyMutation.isPending || (importMode !== "company" && importCandidateIds.length === 0)}>
              {(importSelectedContactsMutation.isPending || importByCompanyMutation.isPending)
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />导入中...</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" />确认导入</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量发送开发信弹窗 */}
      <Dialog open={batchSendDialogOpen} onOpenChange={setBatchSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-purple-500" />批量发送开发信
            </DialogTitle>
            <DialogDescription>
              将向 <strong className="text-gray-900">{batchSendIds.length}</strong> 位候选人发送个性化开发信
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 text-xs text-purple-800">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                <div className="space-y-1">
                  <div className="font-medium text-purple-900">发送将自动完成：</div>
                  <div>✓ 已有开发信的候选人：直接发送</div>
                  <div>✓ 未生成开发信的：AI自动生成后发送</div>
                  <div>✓ 无邮箱的候选人：生成开发信并记入客户跟进记录</div>
                  <div>✓ 已导入客户：发送记录自动写入客户跟进日志</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium mb-1">发件方信息（来自 AI开发信配置）：</div>
              <div>公司：{senderCompanyName || <span className="text-amber-600">未填写，请先在左侧配置</span>}</div>
              <div>产品：{senderProducts || <span className="text-amber-600">未填写</span>}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>每次最多发送 50 封。发送后可在客户跟进记录中查看历史。</div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchSendDialogOpen(false)}>取消</Button>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleBatchSend} disabled={batchSendLoading || !senderCompanyName}>
              {batchSendLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />发送中...</> : <><SendHorizonal className="h-4 w-4 mr-2" />确认发送</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 忽略公司确认弹窗 */}
      <Dialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BanIcon className="h-5 w-5 text-gray-500" />忽略此公司
            </DialogTitle>
            <DialogDescription>
              将 <strong>{ignoreTarget?.companyName}</strong> 的所有候选人标记为已跳过，不再出现在待处理列表中。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-1.5 block">忽略原因（可选）</Label>
              <Input placeholder="例：已有合作、不符合目标市场、价格不匹配..." value={ignoreReason} onChange={e => setIgnoreReason(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">填写原因有助于日后回顾决策，也可直接跳过</p>
            </div>
            <div className="bg-gray-50 border rounded-lg p-3 text-xs text-gray-600">
              <div className="font-medium mb-1">忽略后：</div>
              <div>· 该公司所有待处理候选人将标记为已跳过</div>
              <div>· 可在"已忽略"Tab中查看历史记录</div>
              <div>· 随时可以点击"恢复"重新激活</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreDialogOpen(false)}>取消</Button>
            <Button variant="outline" className="border-gray-400 text-gray-700 hover:bg-gray-100" onClick={handleIgnoreCompany} disabled={ignoreCompanyMutation.isPending}>
              {ignoreCompanyMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />处理中...</> : <><BanIcon className="h-4 w-4 mr-2" />确认忽略</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ERPLayout>
    </TooltipProvider>
  );
}

// ===== 搜索结果公司分组视图 =====
function SearchResultsGrouped({
  results,
  expandedCompanies,
  selectedCandidates,
  selectedCompanies,
  onToggleExpand,
  onToggleCompanySelect,
  onToggleCandidateSelect,
  onExpandAll,
  onCollapseAll,
  onGenerateEmail,
  onImportCompany,
  onIgnoreCompany,
  onImportSelected,
  importableSelectedCount,
  selectedCount,
  accentColor = "blue",
  onLoadMore,
  loadMoreLoading,
  companiesPerPage = 25,
}: {
  results: { people: Candidate[]; totalCount: number };
  expandedCompanies: Set<string>;
  selectedCandidates: Set<number>;
  selectedCompanies: Set<string>;
  onToggleExpand: (name: string) => void;
  onToggleCompanySelect: (name: string, people: Candidate[]) => void;
  onToggleCandidateSelect: (id: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onGenerateEmail: (c: Candidate) => void;
  onImportCompany: (companyName: string, ids: number[]) => void;
  onIgnoreCompany: (companyName: string, domain?: string | null) => void;
  onImportSelected: () => void;
  importableSelectedCount: number;
  selectedCount: number;
  accentColor?: "blue" | "orange";
  onLoadMore?: () => void;
  loadMoreLoading?: boolean;
  companiesPerPage?: number;
}) {
  const groups = useMemo(() => groupByCompany(results.people), [results.people]);
  const accentClass = accentColor === "orange" ? "text-orange-600" : "text-blue-600";
  // 按公司单位显示：初始展示 companiesPerPage 家公司，每次加载更多展示更多公司
  const [visibleCompanyCount, setVisibleCompanyCount] = useState(companiesPerPage);
  // 当 results.people 引用变化（新搜索）时重置 visibleCompanyCount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setVisibleCompanyCount(companiesPerPage);
  }, [results.people]); // 故意只依赖 results.people，新搜索时重置
  const visibleGroups = groups.slice(0, visibleCompanyCount);
  const hasMoreLocalCompanies = visibleCompanyCount < groups.length;
  const hasMoreRemoteData = results.people.length < results.totalCount;

  const handleLoadMoreCompanies = () => {
    if (hasMoreLocalCompanies) {
      // 先展示更多本地已加载的公司
      setVisibleCompanyCount(c => c + companiesPerPage);
    } else if (hasMoreRemoteData && onLoadMore) {
      // 本地公司已全部展示，才从后端加载更多数据
      setVisibleCompanyCount(c => c + companiesPerPage);
      onLoadMore();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">搜索结果</CardTitle>
            <CardDescription>
              共找到 <span className={`font-semibold ${accentClass}`}>{results.totalCount}</span> 位潜在买家，
              按 <strong>{groups.length}</strong> 家公司分组显示
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border overflow-hidden text-xs">
              <button onClick={onExpandAll} className="px-2 py-1.5 bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                <ChevronDown className="h-3 w-3" />全部展开
              </button>
              <button onClick={onCollapseAll} className="px-2 py-1.5 bg-white text-gray-600 hover:bg-gray-50 border-l flex items-center gap-1">
                <ChevronDown className="h-3 w-3 rotate-180" />全部折叠
              </button>
            </div>
            {selectedCount > 0 && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onImportSelected} disabled={importableSelectedCount === 0}>
                <UserCheck className="h-4 w-4 mr-1.5" />导入已选 ({selectedCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {visibleGroups.map(group => {
            const isExpanded = expandedCompanies.has(group.companyName);
            const isSelected = selectedCompanies.has(group.companyName);
            const pendingIds = group.people.filter(p => p.importStatus === "pending").map(p => p.id);

            return (
              <div key={group.companyName} className={group.allSkipped ? "opacity-50" : ""}>
                {/* 公司行 */}
                <div className={`px-4 py-3 flex items-center gap-3 hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleCompanySelect(group.companyName, group.people)}
                    disabled={group.pendingCount === 0}
                    onClick={e => e.stopPropagation()}
                  />
                  <button className="flex items-center gap-2 flex-1 min-w-0 text-left" onClick={() => onToggleExpand(group.companyName)}>
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      : <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    }
                    {/* 公司Logo */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center border border-gray-200">
                      {group.companyLogoUrl ? (
                        <img src={group.companyLogoUrl} alt={group.companyName} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-bold text-gray-600">${group.companyName.charAt(0).toUpperCase()}</span>`; }} />
                      ) : (
                        <span className="text-xs font-bold text-gray-600">{group.companyName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{group.companyName}</span>
                        {group.allImported && <Badge className="bg-green-100 text-green-700 text-xs">已全部导入</Badge>}
                        {group.allSkipped && <Badge variant="secondary" className="text-xs">已忽略</Badge>}
                        {group.pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-xs">{group.pendingCount} 待处理</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                        {group.companyDomain && (
                          <a href={/^https?:\/\//i.test(group.companyDomain) ? group.companyDomain : `https://${group.companyDomain}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                            <Globe className="h-3 w-3" />{group.companyDomain.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                        {group.country && <span className="flex items-center gap-1">{getCountryFlag(group.country)}{group.country}{group.city ? ` · ${group.city}` : ""}</span>}
                        {group.industry && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{group.industry}</span>}
                        {group.employeeCount && <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">👥 {group.employeeCount.toLocaleString()} 人</span>}
                        {group.annualRevenue && <span className="flex items-center gap-1 bg-green-50 text-green-700 px-1.5 py-0.5 rounded">💰 {group.annualRevenue}</span>}
                        {group.companyFoundedYear && <span className="flex items-center gap-1">🏢 {group.companyFoundedYear}年</span>}
                        {group.companyPhone && <span className="flex items-center gap-1">📞 {group.companyPhone}</span>}
                        {group.companyLinkedinUrl && (
                          <a href={group.companyLinkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                            <Linkedin className="h-3 w-3" />LinkedIn
                          </a>
                        )}
                        <span className="flex items-center gap-1"><Users2 className="h-3 w-3" />{group.people.length} 位联系人</span>
                      </div>
                      {group.companyDescription && (
                        <div className="mt-1 text-xs text-gray-400 line-clamp-1 max-w-xl">{group.companyDescription}</div>
                      )}
                    </div>
                  </button>
                  {/* 公司级别操作 */}
                  <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    {group.companyDomain && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-blue-500 hover:bg-blue-50"
                            onClick={() => window.open(/^https?:\/\//i.test(group.companyDomain!) ? group.companyDomain! : `https://${group.companyDomain}`, '_blank', 'noopener,noreferrer')}>
                            <ExternalLink className="h-3 w-3 mr-1" />官网
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>访问 {group.companyDomain!.replace(/^https?:\/\//, '')}</p></TooltipContent>
                      </Tooltip>
                    )}
                    {group.pendingCount > 0 && !group.allSkipped && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                              onClick={() => onImportCompany(group.companyName, pendingIds)}>
                              <UserCheck className="h-3 w-3 mr-1" />导入全部
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>导入该公司所有 {group.pendingCount} 位待处理候选人</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-gray-500 hover:bg-gray-100"
                              onClick={() => onIgnoreCompany(group.companyName, group.companyDomain)}>
                              <BanIcon className="h-3 w-3 mr-1" />忽略
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>忽略此公司，不再出现在待处理列表</p></TooltipContent>
                        </Tooltip>
                      </>
                    )}
                  </div>
                </div>

                {/* 展开的联系人列表 */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t border-b">
                    {group.people.map(person => (
                      <div key={person.id}
                        className={`pl-12 pr-4 py-2.5 flex items-center gap-3 border-b last:border-b-0 hover:bg-white transition-colors ${person.importStatus !== "pending" ? "opacity-60" : ""}`}>
                        <Checkbox
                          checked={selectedCandidates.has(person.id)}
                          onCheckedChange={() => onToggleCandidateSelect(person.id)}
                          disabled={person.importStatus !== "pending"}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">{person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim()}</span>
                            {person.jobTitle && <Badge variant="secondary" className="text-xs font-normal">{person.jobTitle}</Badge>}
                            {person.importStatus === "imported" && <Badge className="bg-green-100 text-green-700 text-xs">已导入</Badge>}
                            {person.importStatus === "skipped" && <Badge variant="secondary" className="text-xs">已跳过</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                            {person.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-blue-400" />{person.email}</span>}
                            {person.linkedinUrl && (
                              <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-500 hover:underline">
                                <Linkedin className="h-3 w-3" />LinkedIn
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-purple-600 hover:bg-purple-50" onClick={() => onGenerateEmail(person)}>
                            <Sparkles className="h-3 w-3 mr-1" />{person.aiOutreachEmail ? "查看信" : "生成信"}
                          </Button>
                          {person.importStatus === "pending" && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-600 hover:bg-green-50"
                              onClick={() => onImportCompany(group.companyName, [person.id])}>
                              <UserCheck className="h-3 w-3 mr-1" />单独导入
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* 加载更多按鈕（按公司单位） */}
        {(hasMoreLocalCompanies || hasMoreRemoteData) && (
          <div className="px-4 py-4 border-t flex flex-col items-center gap-2">
            <p className="text-xs text-gray-400">已显示 {visibleGroups.length} / {groups.length} 家公司（共 {results.totalCount} 位潜在买家）</p>
            <Button variant="outline" size="sm" onClick={handleLoadMoreCompanies} disabled={loadMoreLoading && !hasMoreLocalCompanies} className="min-w-40">
              {(loadMoreLoading && !hasMoreLocalCompanies)
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />加载中...</>
                : <><ChevronDown className="h-4 w-4 mr-2" />加载更多 {companiesPerPage} 家公司</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "imported") return <Badge className="bg-green-100 text-green-700 text-xs">已导入</Badge>;
  if (status === "skipped") return <Badge variant="secondary" className="text-xs">已跳过</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 text-xs">待处理</Badge>;
}
