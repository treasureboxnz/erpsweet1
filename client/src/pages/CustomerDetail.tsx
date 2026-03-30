import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AttributeSelector from '@/components/AttributeSelector';
import AttachmentsSection from '@/components/AttachmentsSection';
import BackupSection from '@/components/BackupSection';
import PriceHistoryTab from '@/components/PriceHistoryTab';
import { StarRating } from '@/components/StarRating';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { matchesPinyin } from "@/lib/pinyin";
import {
  ArrowLeft,
  Building2,
  DollarSign,
  Edit,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
  Users,
  Trash2,
  Calendar,
  MessageSquare,
  PhoneCall,
  Video,
  FileText,
  MoreVertical,
  Upload,
  Image as ImageIcon,
  Settings,
  Archive,
  Search,
  X,
  Linkedin,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CustomerDetail({ params }: { params: { id: string } }) {
  const [, setLocation] = useLocation();
  const companyId = parseInt(params.id);
  const { user } = useAuth();
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(true);
  const [basicInfoTab, setBasicInfoTab] = useState<"company" | "letterhead">("company"); // Card内部切换状态
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddFollowUpOpen, setIsAddFollowUpOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [deletingContact, setDeletingContact] = useState<any>(null);
  const [editingFollowUp, setEditingFollowUp] = useState<any>(null);
  const [deletingFollowUp, setDeletingFollowUp] = useState<any>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const { data: company, isLoading, refetch } = trpc.customerManagement.companies.getById.useQuery({ id: companyId });
  const { data: letterhead, refetch: refetchLetterhead } = trpc.customerManagement.companyLetterheads.getByCompanyId.useQuery({ companyId });
  const { data: contacts } = trpc.customerManagement.contacts.getByCompany.useQuery(companyId);
  const { data: followUps } = trpc.customerManagement.followUps.getByCompany.useQuery(companyId);
  const { data: followUpProgress, refetch: refetchFollowUpProgress } = trpc.customerManagement.followUpProgress.getByCustomer.useQuery(companyId);
  const { data: latestFollowUpTime, refetch: refetchLatestFollowUpTime } = trpc.customerManagement.followUpProgress.getLatestTime.useQuery(companyId);
  const { data: followUpStages, refetch: refetchFollowUpStages } = trpc.attributes.getAll.useQuery({ category: "客户管理", subcategory: "跟进管理", fieldName: "跟进阶段" });
  const { data: workPlanStages, refetch: refetchWorkPlanStages } = trpc.attributes.getAll.useQuery({ category: "客户管理", subcategory: "跟进管理", fieldName: "工作计划" });
  const { data: orderStats } = trpc.customerManagement.companies.getOrderStats.useQuery({ companyId });
  const { data: assignees } = trpc.customerManagement.assignees.list.useQuery({ companyId });
  const { data: allUsers } = trpc.users.list.useQuery();
  const { data: colleagues } = trpc.notifications.getColleagues.useQuery();

  type Contact = NonNullable<typeof contacts>[number];
  type FollowUp = NonNullable<typeof followUps>[number];

  const updateCompany = trpc.customerManagement.companies.update.useMutation({
    onSuccess: () => {
      toast.success("保存成功！已切换到最新数据");
      // Keep editing mode active after save
      utils.customerManagement.companies.getById.invalidate({ id: companyId });
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const createContact = trpc.customerManagement.contacts.create.useMutation({
    onMutate: async (newContact) => {
      await utils.customerManagement.contacts.getByCompany.cancel(companyId);
      const previousContacts = utils.customerManagement.contacts.getByCompany.getData(companyId);
      
      utils.customerManagement.contacts.getByCompany.setData(companyId, (old) => [
        ...(old || []),
        { ...newContact, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as any
      ]);
      
      return { previousContacts };
    },
    onError: (err, newContact, context) => {
      utils.customerManagement.contacts.getByCompany.setData(companyId, context?.previousContacts);
      toast.error(`添加失败: ${err.message}`);
    },
    onSuccess: async (data) => {
      await linkContact.mutateAsync({ companyId, contactId: data.id });
      toast.success("联系人添加成功");
      setIsAddContactOpen(false);
      setContactFormData({
        fullName: "",
        jobTitle: "",
        email: "",
        mobile: "",
        phone: "",
        wechat: "",
        skype: "",
        linkedin: "",
        role: "other" as const,
        importance: "normal" as const,
        notes: "",
      });
    },
    onSettled: () => {
      utils.customerManagement.contacts.getByCompany.invalidate(companyId);
    },
  });

  const updateContact = trpc.customerManagement.contacts.update.useMutation({
    onMutate: async (updatedContact) => {
      await utils.customerManagement.contacts.getByCompany.cancel(companyId);
      const previousContacts = utils.customerManagement.contacts.getByCompany.getData(companyId);
      
      utils.customerManagement.contacts.getByCompany.setData(companyId, (old) =>
        old?.map(contact => contact.id === updatedContact.id ? { ...contact, ...updatedContact } : contact)
      );
      
      return { previousContacts };
    },
    onError: (err, updatedContact, context) => {
      utils.customerManagement.contacts.getByCompany.setData(companyId, context?.previousContacts);
      toast.error(`更新失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("联系人更新成功");
      setEditingContact(null);
    },
    onSettled: () => {
      utils.customerManagement.contacts.getByCompany.invalidate(companyId);
    },
  });

  const deleteContact = trpc.customerManagement.contacts.delete.useMutation({
    onMutate: async (contactId) => {
      await utils.customerManagement.contacts.getByCompany.cancel(companyId);
      const previousContacts = utils.customerManagement.contacts.getByCompany.getData(companyId);
      
      utils.customerManagement.contacts.getByCompany.setData(companyId, (old) =>
        old?.filter(contact => contact.id !== contactId)
      );
      
      return { previousContacts };
    },
    onError: (err, contactId, context) => {
      utils.customerManagement.contacts.getByCompany.setData(companyId, context?.previousContacts);
      toast.error(`删除失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("联系人删除成功");
      setDeletingContact(null);
    },
    onSettled: () => {
      utils.customerManagement.contacts.getByCompany.invalidate(companyId);
    },
  });

  const linkContact = trpc.customerManagement.companyContacts.link.useMutation();

  const addAssignee = trpc.customerManagement.assignees.add.useMutation({
    onSuccess: () => {
      toast.success("负责人添加成功");
      utils.customerManagement.assignees.list.invalidate({ companyId });
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });

  const removeAssignee = trpc.customerManagement.assignees.remove.useMutation({
    onSuccess: () => {
      toast.success("负责人移除成功");
      utils.customerManagement.assignees.list.invalidate({ companyId });
    },
    onError: (error) => {
      toast.error(`移除失败: ${error.message}`);
    },
  });

  const setPrimaryAssignee = trpc.customerManagement.assignees.setPrimary.useMutation({
    onSuccess: () => {
      toast.success("主要负责人设置成功");
      utils.customerManagement.assignees.list.invalidate({ companyId });
    },
    onError: (error) => {
      toast.error(`设置失败: ${error.message}`);
    },
  });

  const createFollowUp = trpc.customerManagement.followUps.create.useMutation({
    onMutate: async (newFollowUp) => {
      await utils.customerManagement.followUps.getByCompany.cancel(companyId);
      const previousFollowUps = utils.customerManagement.followUps.getByCompany.getData(companyId);
      
      utils.customerManagement.followUps.getByCompany.setData(companyId, (old) => [
        { ...newFollowUp, id: Date.now(), createdAt: new Date(), updatedAt: new Date(), followUpBy: user?.id } as any,
        ...(old || [])
      ]);
      
      return { previousFollowUps };
    },
    onError: (err, newFollowUp, context) => {
      utils.customerManagement.followUps.getByCompany.setData(companyId, context?.previousFollowUps);
      toast.error(`添加失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("跟进记录添加成功");
      setIsAddFollowUpOpen(false);
      setFollowUpFormData({
        type: "call" as const,
        content: "",
        result: "neutral" as const,
        nextFollowUpDate: undefined,
      });
    },
    onSettled: () => {
      utils.customerManagement.followUps.getByCompany.invalidate(companyId);
    },
  });

  const updateFollowUp = trpc.customerManagement.followUps.update.useMutation({
    onMutate: async (updatedFollowUp) => {
      await utils.customerManagement.followUps.getByCompany.cancel(companyId);
      const previousFollowUps = utils.customerManagement.followUps.getByCompany.getData(companyId);
      
      utils.customerManagement.followUps.getByCompany.setData(companyId, (old) =>
        old?.map(followUp => followUp.id === updatedFollowUp.id ? { ...followUp, ...updatedFollowUp } : followUp)
      );
      
      return { previousFollowUps };
    },
    onError: (err, updatedFollowUp, context) => {
      utils.customerManagement.followUps.getByCompany.setData(companyId, context?.previousFollowUps);
      toast.error(`更新失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("跟进记录更新成功");
      setEditingFollowUp(null);
    },
    onSettled: () => {
      utils.customerManagement.followUps.getByCompany.invalidate(companyId);
    },
  });

  const uploadLogo = trpc.customerManagement.companies.uploadLogo.useMutation({
    onSuccess: (data) => {
      toast.success("Logo上传成功");
      utils.customerManagement.companies.getById.invalidate({ id: companyId });
      refetch();
    },
    onError: () => {
      toast.error("Logo上传失败");
      setIsUploadingLogo(false);
    },
  });

  const upsertLetterhead = trpc.customerManagement.companyLetterheads.upsert.useMutation({
    onSuccess: () => {
      toast.success("公司文件抬头保存成功");
      refetchLetterhead();
    },
    onError: () => {
      toast.error("保存失败");
    },
  });

  const deleteFollowUp = trpc.customerManagement.followUps.delete.useMutation({
    onMutate: async (followUpId) => {
      await utils.customerManagement.followUps.getByCompany.cancel(companyId);
      const previousFollowUps = utils.customerManagement.followUps.getByCompany.getData(companyId);
      
      utils.customerManagement.followUps.getByCompany.setData(companyId, (old) =>
        old?.filter(followUp => followUp.id !== followUpId)
      );
      
      return { previousFollowUps };
    },
    onError: (err, followUpId, context) => {
      utils.customerManagement.followUps.getByCompany.setData(companyId, context?.previousFollowUps);
      toast.error(`删除失败: ${err.message}`);
    },
    onSuccess: () => {
      toast.success("跟进记录删除成功");
      setDeletingFollowUp(null);
    },
    onSettled: () => {
      utils.customerManagement.followUps.getByCompany.invalidate(companyId);
    },
  });

  // Follow-up Progress state
  const [isAddProgressOpen, setIsAddProgressOpen] = useState(false);
  const [editingProgress, setEditingProgress] = useState<any>(null);
  const [deletingProgress, setDeletingProgress] = useState<any>(null);
  const [isUploadingQuotation, setIsUploadingQuotation] = useState(false);
  // @mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 跟进记录搜索和过滤 state
  const [progressSearchQuery, setProgressSearchQuery] = useState("");
  const [progressTypeFilter, setProgressTypeFilter] = useState<string>("all");
  const [progressMentionFilter, setProgressMentionFilter] = useState<string>("all");

  const [progressFormData, setProgressFormData] = useState<{
    content: string;
    followUpType: "call" | "email" | "meeting" | "visit" | "other";
    currentStageId: number | null;
    nextPlanStageId: number | null;
    nextPlanDate: string;
    quotationFiles: Array<{url: string; name: string; type: string}>;
    quotationDate: string;
    images: Array<{url: string; name: string}>;
    mentionedUserIds: number[];
  }>({
    content: "",
    followUpType: "email" as const,
    currentStageId: null,
    nextPlanStageId: null,
    nextPlanDate: "",
    quotationFiles: [],
    quotationDate: "",
    images: [],
    mentionedUserIds: [],
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const uploadProgressImage = trpc.customerManagement.followUpProgress.uploadImage.useMutation({
    onSuccess: (imgData) => {
      setProgressFormData(prev => ({
        ...prev,
        images: [...prev.images, { url: imgData.url, name: imgData.name }],
      }));
      setIsUploadingImage(false);
      toast.success("图片上传成功");
    },
    onError: () => { setIsUploadingImage(false); toast.error("图片上传失败"); },
  });
  const handleProgressImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("只支持图片格式"); return; }
    if (file.size > 16 * 1024 * 1024) { toast.error("图片大小不能超过 16MB"); return; }
    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadProgressImage.mutate({ fileName: file.name, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const createProgress = trpc.customerManagement.followUpProgress.create.useMutation({
    onSuccess: () => {
      toast.success("跟进记录添加成功");
      setIsAddProgressOpen(false);
      setProgressFormData({ content: "", followUpType: "email", currentStageId: null, nextPlanStageId: null, nextPlanDate: "", quotationFiles: [], quotationDate: "", images: [], mentionedUserIds: [] });
      setShowMentionDropdown(false);
      setMentionQuery("");
      refetchFollowUpProgress();
      refetchLatestFollowUpTime();
    },
    onError: (err) => toast.error(`添加失败: ${err.message}`),
  });

  const updateProgress = trpc.customerManagement.followUpProgress.update.useMutation({
    onSuccess: () => {
      toast.success("跟进记录更新成功");
      setEditingProgress(null);
      refetchFollowUpProgress();
      refetchLatestFollowUpTime();
    },
    onError: (err) => toast.error(`更新失败: ${err.message}`),
  });

  const deleteProgress = trpc.customerManagement.followUpProgress.delete.useMutation({
    onSuccess: () => {
      toast.success("跟进记录删除成功");
      setDeletingProgress(null);
      refetchFollowUpProgress();
      refetchLatestFollowUpTime();
    },
    onError: (err) => toast.error(`删除失败: ${err.message}`),
  });

  const uploadQuotationFile = trpc.customerManagement.followUpProgress.uploadQuotationFile.useMutation({
    onSuccess: (fileData) => {
      setProgressFormData(prev => ({
        ...prev,
        quotationFiles: [...prev.quotationFiles, { url: fileData.url, name: fileData.name, type: fileData.type }],
      }));
      setIsUploadingQuotation(false);
      toast.success("报价文件上传成功");
    },
    onError: () => { setIsUploadingQuotation(false); toast.error("文件上传失败"); },
  });

  const handleProgressQuotationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("只支持 PDF 和 Excel 格式");
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      toast.error("文件大小不能超过 16MB");
      return;
    }
    setIsUploadingQuotation(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      uploadQuotationFile.mutate({ fileName: file.name, fileBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const handleAddProgress = () => {
    if (!progressFormData.content) { toast.error("请输入跟进内容"); return; }
    createProgress.mutate({
      customerId: companyId,
      content: progressFormData.content,
      followUpType: progressFormData.followUpType,
      currentStageId: progressFormData.currentStageId || undefined,
      nextPlanStageId: progressFormData.nextPlanStageId || undefined,
      nextPlanDate: progressFormData.nextPlanDate ? new Date(progressFormData.nextPlanDate) : undefined,
      quotationFiles: progressFormData.quotationFiles.length > 0 ? JSON.stringify(progressFormData.quotationFiles) : undefined,
      quotationDate: progressFormData.quotationDate ? new Date(progressFormData.quotationDate) : undefined,
      images: progressFormData.images.length > 0 ? JSON.stringify(progressFormData.images) : undefined,
      mentionedUserIds: progressFormData.mentionedUserIds.length > 0 ? progressFormData.mentionedUserIds : undefined,
      customerName: company?.companyName || undefined,
    });
  };

  const handleUpdateProgress = () => {
    if (!editingProgress) return;
    updateProgress.mutate({
      id: editingProgress.id,
      content: progressFormData.content,
      followUpType: progressFormData.followUpType,
      currentStageId: progressFormData.currentStageId,
      nextPlanStageId: progressFormData.nextPlanStageId,
      nextPlanDate: progressFormData.nextPlanDate ? new Date(progressFormData.nextPlanDate) : null,
      quotationFiles: JSON.stringify(progressFormData.quotationFiles),
      quotationDate: progressFormData.quotationDate ? new Date(progressFormData.quotationDate) : null,
      images: JSON.stringify(progressFormData.images),
      mentionedUserIds: progressFormData.mentionedUserIds.length > 0 ? progressFormData.mentionedUserIds : undefined,
      customerName: company?.companyName || undefined,
      customerId: companyId,
    });
  };

  const [formData, setFormData] = useState({
    companyName: "",
    customerCode: "",
    customerNature: "",
    customerCategory: [] as string[],
    cooperationStatus: "developing" as const,
    cooperationLevel: "",
    source: "",
    country: "",
    state: "",
    city: "",
    address: "",
    website: "",
    industryType: "",
    companyScale: "" as "" | "small" | "medium" | "large" | "enterprise",
    notes: "",
    linkedinUrl: "",
    phone: "",
    description: "",
    foundedYear: "" as string | number,
  });

  // 公司文件抬头状态
  const [letterheadData, setLetterheadData] = useState({
    companyNameEn: "",
    tradeAs: "",
    contactPersonEn: "",
    contactPhone: "",
    contactEmail: "",
    addressEn: "",
    cityEn: "",
    stateEn: "",
    postalCode: "",
    countryEn: "",
    notes: "",
  });

  const [contactFormData, setContactFormData] = useState({
    fullName: "",
    jobTitle: "",
    email: "",
    mobile: "",
    phone: "",
    wechat: "",
    skype: "",
    linkedin: "",
    role: "other" as const,
    importance: "normal" as const,
    notes: "",
  });

  const [followUpFormData, setFollowUpFormData] = useState<{
    type: "call" | "email" | "meeting" | "visit" | "other";
    content: string;
    result: "positive" | "neutral" | "negative";
    nextFollowUpDate: string | undefined;
  }>({
    type: "call" as const,
    content: "",
    result: "neutral" as const,
    nextFollowUpDate: undefined,
  });

  // Initialize form data when company loads
  useEffect(() => {
    if (company) {
      setFormData({
        companyName: company.companyName || "",
        customerCode: company.customerCode || "",
        customerNature: company.customerNature || "",
        customerCategory: company.customerCategory || [],
        cooperationStatus: (company.cooperationStatus as any) || "developing",
        cooperationLevel: company.cooperationLevel || "",
        source: company.source || "",
        country: company.country || "",
        state: company.state || "",
        city: company.city || "",
        address: company.address || "",
        website: company.website || "",
        industryType: company.industryType || "",
        companyScale: (company.companyScale as "" | "small" | "medium" | "large" | "enterprise") || "",
        notes: company.notes || "",
        linkedinUrl: company.linkedinUrl || "",
        phone: company.phone || "",
        description: company.description || "",
        foundedYear: company.foundedYear || "",
      });
    }
  }, [company]);

  // Initialize letterhead data when letterhead loads
  useEffect(() => {
    if (letterhead) {
      setLetterheadData({
        companyNameEn: letterhead.companyNameEn || "",
        tradeAs: letterhead.tradeAs || "",
        contactPersonEn: letterhead.contactPersonEn || "",
        contactPhone: letterhead.contactPhone || "",
        contactEmail: letterhead.contactEmail || "",
        addressEn: letterhead.addressEn || "",
        cityEn: letterhead.cityEn || "",
        stateEn: letterhead.stateEn || "",
        postalCode: letterhead.postalCode || "",
        countryEn: letterhead.countryEn || "",
        notes: letterhead.notes || "",
      });
    }
  }, [letterhead]);

  const handleSaveLetterhead = useCallback(() => {
    upsertLetterhead.mutate({
      companyId,
      ...letterheadData,
    });
  }, [letterheadData, companyId]);

  const handleSave = useCallback(() => {
    // If on letterhead tab, only save letterhead data
    if (basicInfoTab === "letterhead") {
      const hasLetterheadData = Object.values(letterheadData).some(
        (value) => value !== "" && value !== null && value !== undefined
      );
      if (hasLetterheadData) {
        upsertLetterhead.mutate({
          companyId,
          ...letterheadData,
        });
      } else {
        toast.error("请填写至少一个文件抬头字段");
      }
      return;
    }

    // If on company tab, save company basic info
    // Filter out empty strings to avoid validation errors
    const filteredData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    // Save company basic info
    updateCompany.mutate({
      id: companyId,
      ...filteredData,
    });
  }, [companyId, formData, updateCompany, letterheadData, upsertLetterhead, basicInfoTab]);

  const handleAddContact = useCallback(() => {
    if (!contactFormData.fullName) {
      toast.error("请输入联系人姓名");
      return;
    }
    createContact.mutate(contactFormData);
  }, [contactFormData, createContact]);

  const handleUpdateContact = useCallback(() => {
    if (!editingContact) return;
    updateContact.mutate({
      id: editingContact.id,
      ...contactFormData,
    });
  }, [editingContact, contactFormData, updateContact]);

  const handleAddFollowUp = useCallback(() => {
    if (!followUpFormData.content) {
      toast.error("请输入跟进内容");
      return;
    }
    createFollowUp.mutate({
      companyId,
      type: followUpFormData.type,
      content: followUpFormData.content,
      result: followUpFormData.result,
      nextFollowUpDate: followUpFormData.nextFollowUpDate ? new Date(followUpFormData.nextFollowUpDate) : undefined,
    });
  }, [companyId, followUpFormData, user, createFollowUp]);

  const handleUpdateFollowUp = useCallback(() => {
    if (!editingFollowUp) return;
    updateFollowUp.mutate({
      id: editingFollowUp.id,
      ...followUpFormData,
      nextFollowUpDate: followUpFormData.nextFollowUpDate ? new Date(followUpFormData.nextFollowUpDate) : undefined,
    });
  }, [editingFollowUp, followUpFormData, updateFollowUp]);

  const getCooperationStatusBadge = (cooperationStatus: string) => {
    const badges = {
      developing: "bg-blue-50 text-blue-700 border border-blue-200",
      cooperating: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      stopped: "bg-gray-50 text-gray-600 border border-gray-200",
    };
    const labels = {
      developing: "开发中",
      cooperating: "合作中",
      stopped: "已停止",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[cooperationStatus as keyof typeof badges]}`}>
        {labels[cooperationStatus as keyof typeof labels]}
      </span>
    );
  };

  const getCooperationLevelBadge = (cooperationLevel: string) => {
    const badges = {
      vip: "bg-amber-50 text-amber-700 border border-amber-200",
      high: "bg-orange-50 text-orange-700 border border-orange-200",
      medium: "bg-sky-50 text-sky-700 border border-sky-200",
      low: "bg-gray-50 text-gray-600 border border-gray-200",
    };
    const labels = {
      vip: "VIP",
      high: "高",
      medium: "中",
      low: "低",
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badges[cooperationLevel as keyof typeof badges]}`}>
        <Star className="inline h-3 w-3 mr-1" />
        {labels[cooperationLevel as keyof typeof labels]}
      </span>
    );
  };

  const getContactRoleLabel = (role: string) => {
    const labels = {
      decision_maker: "决策者",
      purchaser: "采购",
      finance: "财务",
      technical: "技术",
      sales: "销售",
      other: "其他",
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getContactImportanceBadge = (importance: string) => {
    const badges = {
      key: "bg-rose-50 text-rose-700 border border-rose-200",
      normal: "bg-blue-50 text-blue-700 border border-blue-200",
      secondary: "bg-gray-50 text-gray-600 border border-gray-200",
    };
    const labels = {
      key: "关键",
      normal: "普通",
      secondary: "次要",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[importance as keyof typeof badges]}`}>
        {labels[importance as keyof typeof labels]}
      </span>
    );
  };

  const getFollowUpTypeIcon = (type: string) => {
    const icons = {
      call: PhoneCall,
      email: Mail,
      meeting: Video,
      visit: Building2,
      other: MessageSquare,
    };
    const Icon = icons[type as keyof typeof icons] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const getFollowUpTypeLabel = (type: string) => {
    const labels = {
      call: "电话",
      email: "邮件",
      meeting: "会议",
      visit: "拜访",
      other: "其他",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getFollowUpResultBadge = (result: string) => {
    const badges = {
      positive: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      neutral: "bg-gray-50 text-gray-600 border border-gray-200",
      negative: "bg-rose-50 text-rose-700 border border-rose-200",
    };
    const labels = {
      positive: "积极",
      neutral: "中性",
      negative: "消极",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[result as keyof typeof badges]}`}>
        {labels[result as keyof typeof labels]}
      </span>
    );
  };

  // Memoize sorted contacts
  const sortedContacts = useMemo(() => {
    if (!contacts) return [];
    return [...contacts].sort((a, b) => {
      const importanceOrder = { key: 0, normal: 1, secondary: 2 };
      return (importanceOrder[a.importance as keyof typeof importanceOrder] || 1) - 
             (importanceOrder[b.importance as keyof typeof importanceOrder] || 1);
    });
  }, [contacts]);

  // Memoize sorted follow-ups
   const sortedFollowUps = useMemo(() => {
    if (!followUps) return [];
    return [...followUps].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [followUps]);

  // 跟进记录过滤逻辑
  const filteredProgress = useMemo(() => {
    if (!followUpProgress) return [];
    return followUpProgress.filter(record => {
      // 关键词过滤（内容、跟进人、阶段名称）
      if (progressSearchQuery.trim()) {
        const q = progressSearchQuery.toLowerCase();
        const matchContent = matchesPinyin(record.content, q);
        const matchUser = matchesPinyin(record.followUpByName || "", q);
        const matchStage = matchesPinyin(record.currentStageName || "", q);
        if (!matchContent && !matchUser && !matchStage) return false;
      }
      // 跟进类型过滤
      if (progressTypeFilter !== "all" && record.followUpType !== progressTypeFilter) return false;
      // @提及人过滤
      if (progressMentionFilter !== "all") {
        const mentionName = progressMentionFilter;
        const hasMention = record.content.includes(`@${mentionName}`);
        if (!hasMention) return false;
      }
      return true;
    });
  }, [followUpProgress, progressSearchQuery, progressTypeFilter, progressMentionFilter]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">客户不存在</h2>
          <Button onClick={() => setLocation("/customers")} className="mt-4">
            返回客户列表
          </Button>
        </div>
      </div>
    );
  }

  // Exchange rate (simplified - in production, fetch from API)
  const USD_TO_RMB = 7.2;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="container py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/customers")} className="mt-1">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-start gap-4">
                {/* Company Logo */}
                <div className="relative group">
                  {company.logoUrl ? (
                    <img
                      src={company.logoUrl}
                      alt={company.companyName}
                      className="w-16 h-16 rounded-lg object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                      {company.companyName
                        .split(' ')
                        .filter(word => word.length > 0)
                        .slice(0, 2)
                        .map(word => word.charAt(0).toUpperCase())
                        .join('')}
                    </div>
                  )}
                  <label
                    htmlFor="logo-upload"
                    className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <Upload className="h-6 w-6 text-white" />
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;

                        // Check file size (max 5MB)
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("图片大小不能超过5MB");
                          return;
                        }

                        // Check file type
                        if (!file.type.startsWith("image/")) {
                          toast.error("请选择图片文件");
                          return;
                        }

                        setIsUploadingLogo(true);

                        // Convert to base64
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const imageData = event.target?.result as string;
                          uploadLogo.mutate({
                            companyId,
                            imageData,
                            mimeType: file.type,
                          });
                        };
                        reader.onerror = () => {
                          toast.error("读取文件失败");
                          setIsUploadingLogo(false);
                        };
                        reader.readAsDataURL(file);
                      }}
                      disabled={isUploadingLogo}
                    />
                  </label>
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">{company.companyName}</h1>
                    {getCooperationStatusBadge(company.cooperationStatus)}
                    <span className="text-sm text-foreground">{company.cooperationLevel || '-'}</span>
                  </div>
                  <p className="text-gray-500 mt-1">客户编号: {company.customerCode || "暂无"}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {company.country && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {company.country}
                        {company.city && `, ${company.city}`}
                      </div>
                    )}
                    {company.website && (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600">
                        <Globe className="h-4 w-4" />
                        网站
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSave} disabled={updateCompany.isPending} className="gap-2">
                    <Save className="h-4 w-4" />
                    {updateCompany.isPending ? "保存中..." : "保存更改"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  编辑信息
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">订单数量</CardTitle>
              <ShoppingCart className="h-5 w-5 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{orderStats?.totalOrders || 0}</div>
              <p className="text-xs text-gray-500 mt-1">历史订单总数</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">订单总额 (USD)</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${orderStats?.totalAmountUSD?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-gray-500 mt-1">美元计价</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">订单总额 (RMB)</CardTitle>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                ¥{((orderStats?.totalAmountUSD || 0) * USD_TO_RMB).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">按汇率 1:{USD_TO_RMB} 换算</p>
            </CardContent>
          </Card>
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">平均订单金额</CardTitle>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                ${orderStats?.averageOrderAmount?.toLocaleString() || "0"}
              </div>
              <p className="text-xs text-gray-500 mt-1">每笔订单均值</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <div className="container pb-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Building2 className="h-4 w-4 mr-2" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Users className="h-4 w-4 mr-2" />
              联系人 ({contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="followups" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <MessageSquare className="h-4 w-4 mr-2" />
              跟进记录 ({followUpProgress?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <ShoppingCart className="h-4 w-4 mr-2" />
              订单历史
            </TabsTrigger>
            <TabsTrigger value="priceHistory" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <DollarSign className="h-4 w-4 mr-2" />
              历史成交价
            </TabsTrigger>
            <TabsTrigger value="quotationHistory" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              报价历史
            </TabsTrigger>
            <TabsTrigger value="attachments" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              附件
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Settings className="h-4 w-4 mr-2" />
              设置
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="backup" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                <Archive className="h-4 w-4 mr-2" />
                备份
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>公司基本信息</CardTitle>
                <CardDescription>查看客户公司的详细信息</CardDescription>
              </CardHeader>
              {/* Tab式切换按钮 - 照抄顶部Tab样式 */}
              <div className="px-6 pb-4">
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setBasicInfoTab("company")}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      basicInfoTab === "company"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "hover:bg-background/50"
                    }`}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    基本信息
                  </button>
                  <button
                    type="button"
                    onClick={() => setBasicInfoTab("letterhead")}
                    className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                      basicInfoTab === "letterhead"
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "hover:bg-background/50"
                    }`}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    公司文件抬头
                  </button>
                </div>
              </div>
              <CardContent>
                {/* 公司基本信息表单 */}
                {basicInfoTab === "company" && isEditing ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">公司名称 *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerCode">客户编号</Label>
                      <Input
                        id="customerCode"
                        value={formData.customerCode || ''}
                        onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                        placeholder="留空自动生成 (CV-G1000...)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">国家/地区</Label>
                      <AttributeSelector
                        category="客户管理"
                        subcategory="客户信息"
                        fieldName="客户国家"
                        value={formData.country ? [formData.country] : []}
                        onChange={(values: string[]) => setFormData({ ...formData, country: values[0] || '' })}
                        placeholder="选择或创建国家"
                        multiple={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cooperationStatus">合作状态</Label>
                      <Select
                        value={formData.cooperationStatus}
                        onValueChange={(value: any) => setFormData({ ...formData, cooperationStatus: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="developing">开发中</SelectItem>
                          <SelectItem value="cooperating">合作中</SelectItem>
                          <SelectItem value="stopped">已停止</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>负责人</Label>
                      <div className="space-y-2">
                        {assignees && assignees.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {assignees.map((assignee) => (
                              <div
                                key={assignee.id}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md"
                              >
                                <span className="text-sm">
                                  {assignee.userName}
                                  {assignee.isPrimary && (
                                    <span className="ml-1 text-xs text-blue-600 font-medium">(主要)</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-1">
                                  {!assignee.isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() => setPrimaryAssignee.mutate({ companyId, userId: assignee.userId })}
                                      className="text-xs text-blue-600 hover:text-blue-800"
                                      title="设为主要负责人"
                                    >
                                      <Star className="h-3 w-3" />
                                    </button>
                                  )}
                                  {(user?.role === 'admin' || user?.role === 'super_admin') && (
                                    <button
                                      type="button"
                                      onClick={() => removeAssignee.mutate({ companyId, userId: assignee.userId })}
                                      className="text-xs text-red-600 hover:text-red-800"
                                      title="移除负责人"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">暂无负责人</p>
                        )}
                        {(user?.role === 'admin' || user?.role === 'super_admin') && (
                          <Select
                            onValueChange={(userId) => {
                              const userIdNum = parseInt(userId);
                              if (!assignees?.find(a => a.userId === userIdNum)) {
                                addAssignee.mutate({
                                  companyId,
                                  userId: userIdNum,
                                  isPrimary: !assignees || assignees.length === 0,
                                });
                              } else {
                                toast.error("该用户已是负责人");
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="添加负责人..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allUsers?.map((user) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.name} ({user.email})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerNature">客户性质</Label>
                      <AttributeSelector
                        category="客户管理"
                        subcategory={undefined}
                        fieldName="客户性质"
                        value={formData.customerNature ? [formData.customerNature] : []}
                        onChange={(values: string[]) => setFormData({ ...formData, customerNature: values[0] || "" })}
                        placeholder="选择或创建客户性质"
                        multiple={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source">客户来源</Label>
                      <AttributeSelector
                        category="客户管理"
                        subcategory="客户信息"
                        fieldName="客户来源"
                        value={formData.source ? [formData.source] : []}
                        onChange={(values: string[]) => setFormData({ ...formData, source: values[0] || '' })}
                        placeholder="选择或创建客户来源"
                        multiple={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cooperationLevel">客户级别</Label>
                      <AttributeSelector
                        category="客户管理"
                        fieldName="cooperationLevel"
                        value={formData.cooperationLevel ? [formData.cooperationLevel] : []}
                        onChange={(values: string[]) => setFormData({ ...formData, cooperationLevel: values[0] || '' })}
                        placeholder="选择或创建客户级别"
                        multiple={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">城市</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">公司网站</Label>
                      <Input
                        id="website"
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industryType">行业类型</Label>
                      <Input
                        id="industryType"
                        value={formData.industryType}
                        onChange={(e) => setFormData({ ...formData, industryType: e.target.value })}
                        placeholder="如：furniture retail, interior design"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyScale">公司规模</Label>
                      <Select
                        value={formData.companyScale || ""}
                        onValueChange={(value) => setFormData({ ...formData, companyScale: value as "" | "small" | "medium" | "large" | "enterprise" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择公司规模" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">小型 (&lt;50人)</SelectItem>
                          <SelectItem value="medium">中型 (50-200人)</SelectItem>
                          <SelectItem value="large">大型 (200-1000人)</SelectItem>
                          <SelectItem value="enterprise">企业级 (&gt;1000人)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerCategory">客户分类</Label>
                      <AttributeSelector
                        category="客户管理"
                        subcategory={undefined}
                        fieldName="客户分类"
                        value={formData.customerCategory}
                        onChange={(values: string[]) => setFormData({ ...formData, customerCategory: values })}
                        placeholder="选择或创建客户分类"
                        multiple={true}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">公司电话</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="公司电话号码"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foundedYear">成立年份</Label>
                      <Input
                        id="foundedYear"
                        type="number"
                        value={formData.foundedYear}
                        onChange={(e) => setFormData({ ...formData, foundedYear: e.target.value ? parseInt(e.target.value) : "" })}
                        placeholder="如 2005"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="linkedinUrl">LinkedIn 页面</Label>
                      <Input
                        id="linkedinUrl"
                        value={formData.linkedinUrl}
                        onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                        placeholder="https://www.linkedin.com/company/..."
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="description">公司描述</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        placeholder="公司主要业务、产品、市场定位等信息"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="notes">备注</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={4}
                      />
                    </div>
                  </div>
                ) : basicInfoTab === "company" ? (
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-gray-500">公司名称</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.companyName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">客户编号</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.customerCode || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">国家/地区</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.country || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">合作状态</p>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {company.cooperationStatus === "developing" && "开发中"}
                        {company.cooperationStatus === "cooperating" && "合作中"}
                        {company.cooperationStatus === "stopped" && "已停止"}
                        {!company.cooperationStatus && "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">客户性质</p>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {company.customerNature || "暂无"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">客户来源</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.source || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">客户级别</p>
                      <div className="mt-1">
                        <span className="text-sm text-foreground">{company.cooperationLevel || '-'}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">城市</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.city || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">行业类型</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.industryType || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">公司规模</p>
                      <p className="text-base font-medium text-gray-900 mt-1">
                        {company.companyScale === "small" && "小型 (<50人)"}
                        {company.companyScale === "medium" && "中型 (50-200人)"}
                        {company.companyScale === "large" && "大型 (200-1000人)"}
                        {company.companyScale === "enterprise" && "企业级 (>1000人)"}
                        {!company.companyScale && "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">公司网站</p>
                      {company.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-base font-medium text-blue-600 hover:underline mt-1 inline-block">
                          {company.website}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-gray-900 mt-1">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">客户分类</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.customerCategory && company.customerCategory.length > 0 ? company.customerCategory.join(", ") : "暂无"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">详细地址</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.address || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">公司电话</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.phone || "暂无"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">成立年份</p>
                      <p className="text-base font-medium text-gray-900 mt-1">{company.foundedYear || "暂无"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">LinkedIn</p>
                      {company.linkedinUrl ? (
                        <a href={company.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-base font-medium text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
                          <Linkedin className="h-4 w-4" />{company.linkedinUrl}
                        </a>
                      ) : (
                        <p className="text-base font-medium text-gray-900 mt-1">-</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">公司描述</p>
                      <p className="text-base font-medium text-gray-900 mt-1 whitespace-pre-wrap">{company.description || "暂无"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">备注</p>
                      <p className="text-base font-medium text-gray-900 mt-1 whitespace-pre-wrap">{company.notes || "暂无"}</p>
                    </div>
                  </div>
                ) : null}

                {/* 公司文件抬头表单 */}
                {basicInfoTab === "letterhead" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyNameEn">Company Name (English)</Label>
                      <Input
                        id="companyNameEn"
                        value={letterheadData.companyNameEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, companyNameEn: e.target.value })}
                        placeholder="Enter company name in English"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tradeAs">Trade As</Label>
                      <Input
                        id="tradeAs"
                        value={letterheadData.tradeAs}
                        onChange={(e) => setLetterheadData({ ...letterheadData, tradeAs: e.target.value })}
                        placeholder="Trading name if different"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPersonEn">Contact Person (English)</Label>
                      <Input
                        id="contactPersonEn"
                        value={letterheadData.contactPersonEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, contactPersonEn: e.target.value })}
                        placeholder="Enter contact person name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input
                        id="contactPhone"
                        value={letterheadData.contactPhone}
                        onChange={(e) => setLetterheadData({ ...letterheadData, contactPhone: e.target.value })}
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={letterheadData.contactEmail}
                        onChange={(e) => setLetterheadData({ ...letterheadData, contactEmail: e.target.value })}
                        placeholder="contact@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="countryEn">Country (English)</Label>
                      <Input
                        id="countryEn"
                        value={letterheadData.countryEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, countryEn: e.target.value })}
                        placeholder="United States"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="addressEn">Address (English)</Label>
                      <Input
                        id="addressEn"
                        value={letterheadData.addressEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, addressEn: e.target.value })}
                        placeholder="123 Main Street, Suite 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cityEn">City (English)</Label>
                      <Input
                        id="cityEn"
                        value={letterheadData.cityEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, cityEn: e.target.value })}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stateEn">State/Province (English)</Label>
                      <Input
                        id="stateEn"
                        value={letterheadData.stateEn}
                        onChange={(e) => setLetterheadData({ ...letterheadData, stateEn: e.target.value })}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={letterheadData.postalCode}
                        onChange={(e) => setLetterheadData({ ...letterheadData, postalCode: e.target.value })}
                        placeholder="10001"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="letterheadNotes">Notes</Label>
                      <Textarea
                        id="letterheadNotes"
                        value={letterheadData.notes}
                        onChange={(e) => setLetterheadData({ ...letterheadData, notes: e.target.value })}
                        rows={4}
                        placeholder="Additional notes for letterhead"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">联系人列表</h2>
                <p className="text-gray-500 mt-1">管理该客户公司的联系人信息</p>
              </div>
              <Button onClick={() => setIsAddContactOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                添加联系人
              </Button>
            </div>

            {sortedContacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无联系人，点击上方按钮添加</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedContacts.map((contact) => (
                  <Card key={contact.id} className="hover:shadow-lg transition-shadow relative group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                            {contact.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-bold text-gray-900">{contact.fullName}</h3>
                              {contact.importance && getContactImportanceBadge(contact.importance)}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{contact.jobTitle || "未设置职位"}</p>
                            {contact.role && (
                              <p className="text-xs text-gray-500 mt-1">{getContactRoleLabel(contact.role)}</p>
                            )}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingContact(contact);
                              setContactFormData({
                                fullName: contact.fullName,
                                jobTitle: contact.jobTitle || "",
                                email: contact.email || "",
                                mobile: contact.mobile || "",
                                phone: contact.phone || "",
                                wechat: contact.wechat || "",
                                skype: contact.skype || "",
                                linkedin: contact.linkedin || "",
                                role: (contact.role as any) || "other",
                                importance: (contact.importance as any) || "normal",
                                notes: contact.notes || "",
                              });
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeletingContact(contact)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
                        </div>
                      )}
                      {contact.mobile && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${contact.mobile}`} className="hover:text-blue-600">{contact.mobile}</a>
                        </div>
                      )}
                      {contact.wechat && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MessageSquare className="h-4 w-4 text-gray-400" />
                          微信: {contact.wechat}
                        </div>
                      )}
                      {contact.department && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          {contact.department}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Follow-ups Tab */}
          <TabsContent value="followups" className="space-y-6">
            {/* 最近跟进时间 + 30天报警 */}
            {(() => {
              const lastTime = latestFollowUpTime?.lastFollowUpAt;
              const daysSince = lastTime ? Math.floor((Date.now() - new Date(lastTime).getTime()) / 86400000) : null;
              const isOverdue = daysSince === null || daysSince >= 30;
              return (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${
                  isOverdue ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <Calendar className={`h-5 w-5 ${isOverdue ? 'text-red-500' : 'text-green-500'}`} />
                  <div className="flex-1">
                    <span className="text-sm font-medium">
                      最近跟进时间：{lastTime ? new Date(lastTime).toLocaleString('zh-CN') : '暂无跟进记录'}
                    </span>
                    {daysSince !== null && (
                      <span className="ml-2 text-sm text-gray-500">（{daysSince} 天前）</span>
                    )}
                  </div>
                  {isOverdue && (
                    <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                      ⚠️ {daysSince === null ? '从未跟进' : `${daysSince}天未更新`} — 请及时跟进
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">跟进记录</h2>
                <p className="text-gray-500 mt-1">记录与客户的沟通历史及跟进进度</p>
              </div>
              <Button onClick={() => { setEditingProgress(null); setProgressFormData({ content: "", followUpType: "email", currentStageId: null, nextPlanStageId: null, nextPlanDate: "", quotationFiles: [], quotationDate: "", images: [], mentionedUserIds: [] }); setShowMentionDropdown(false); setMentionQuery(""); setIsAddProgressOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" />
                添加跟进记录
              </Button>
            </div>

            {/* 统计卡片 */}
            {followUpProgress && followUpProgress.length > 0 && (() => {
              const now = new Date();
              const thisMonth = now.getMonth();
              const thisYear = now.getFullYear();
              const totalCount = followUpProgress.length;
              const thisMonthCount = followUpProgress.filter(r => {
                const d = new Date(r.createdAt);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
              }).length;
              // 平均跟进间隔（天）
              let avgInterval: number | null = null;
              if (followUpProgress.length >= 2) {
                const sorted = [...followUpProgress].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                let totalDiff = 0;
                for (let i = 1; i < sorted.length; i++) {
                  totalDiff += (new Date(sorted[i].createdAt).getTime() - new Date(sorted[i-1].createdAt).getTime()) / (1000 * 60 * 60 * 24);
                }
                avgInterval = Math.round(totalDiff / (sorted.length - 1));
              }
              // 下次计划跟进日期（最近一条有nextPlanDate的记录）
              const nextPlan = followUpProgress.find(r => r.nextPlanDate && new Date(r.nextPlanDate) > now);
              const nextPlanDate = nextPlan?.nextPlanDate ? new Date(nextPlan.nextPlanDate) : null;
              const daysToNext = nextPlanDate ? Math.ceil((nextPlanDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              // 跟进类型分布
              const typeCount = followUpProgress.reduce((acc, r) => {
                acc[r.followUpType] = (acc[r.followUpType] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
              const typeLabels: Record<string, string> = { call: '电话', email: '邮件', meeting: '会议', visit: '拜访', other: '其他' };
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* 总跟进次数 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                      总跟进次数
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
                    <div className="text-xs text-gray-400">本月 <span className="font-semibold text-blue-600">{thisMonthCount}</span> 次</div>
                  </div>
                  {/* 平均跟进间隔 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <Calendar className="h-3.5 w-3.5 text-purple-500" />
                      平均跟进间隔
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {avgInterval !== null ? avgInterval : '-'}
                      {avgInterval !== null && <span className="text-sm font-normal text-gray-400 ml-1">天</span>}
                    </div>
                    <div className="text-xs text-gray-400">{avgInterval !== null ? (avgInterval <= 7 ? '跟进频率良好' : avgInterval <= 14 ? '跟进频率一般' : '跟进频率偏低') : '数据不足'}</div>
                  </div>
                  {/* 下次计划跟进 */}
                  <div className={`border rounded-xl p-4 flex flex-col gap-1 shadow-sm ${
                    daysToNext !== null && daysToNext <= 3 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'
                  }`}>
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <TrendingUp className={`h-3.5 w-3.5 ${daysToNext !== null && daysToNext <= 3 ? 'text-orange-500' : 'text-green-500'}`} />
                      下次计划跟进
                    </div>
                    <div className={`text-lg font-bold ${
                      daysToNext !== null && daysToNext <= 3 ? 'text-orange-600' : 'text-gray-900'
                    }`}>
                      {nextPlanDate ? nextPlanDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '未设置'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {daysToNext !== null ? (
                        daysToNext === 0 ? <span className="text-orange-600 font-semibold">今天</span> :
                        daysToNext < 0 ? <span className="text-red-500 font-semibold">已逾期</span> :
                        <span>{daysToNext} 天后</span>
                      ) : '暂无计划'}
                    </div>
                  </div>
                  {/* 最常用跟进方式 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                      <PhoneCall className="h-3.5 w-3.5 text-teal-500" />
                      最常用方式
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {topType ? typeLabels[topType[0]] || topType[0] : '-'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {topType ? `共 ${topType[1]} 次（${Math.round(topType[1] / totalCount * 100)}%）` : ''}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 搜索和过滤栏 */}
            {followUpProgress && followUpProgress.length > 0 && (
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* 关键词搜索 */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="搜索内容、跟进人..."
                    value={progressSearchQuery}
                    onChange={e => setProgressSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-white"
                  />
                  {progressSearchQuery && (
                    <button onClick={() => setProgressSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* 跟进类型过滤 */}
                <Select value={progressTypeFilter} onValueChange={setProgressTypeFilter}>
                  <SelectTrigger className="h-9 w-[130px] bg-white">
                    <SelectValue placeholder="全部类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="call">📞 电话</SelectItem>
                    <SelectItem value="email">📧 邮件</SelectItem>
                    <SelectItem value="meeting">🎥 会议</SelectItem>
                    <SelectItem value="visit">🏢 拜访</SelectItem>
                    <SelectItem value="other">💬 其他</SelectItem>
                  </SelectContent>
                </Select>
                {/* @提及人过滤 */}
                <Select value={progressMentionFilter} onValueChange={setProgressMentionFilter}>
                  <SelectTrigger className="h-9 w-[150px] bg-white">
                    <SelectValue placeholder="全部@提及" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部@提及</SelectItem>
                    {colleagues?.map(c => (
                      <SelectItem key={c.id} value={c.name || c.email || String(c.id)}>@{c.name || c.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 重置按钮 */}
                {(progressSearchQuery || progressTypeFilter !== "all" || progressMentionFilter !== "all") && (
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-gray-500" onClick={() => { setProgressSearchQuery(""); setProgressTypeFilter("all"); setProgressMentionFilter("all"); }}>
                    <X className="h-3.5 w-3.5 mr-1" />
                    重置
                  </Button>
                )}
                {/* 结果数量 */}
                <span className="flex items-center text-sm text-gray-500 ml-auto">
                  {filteredProgress.length} / {followUpProgress.length} 条记录
                </span>
              </div>
            )}

            {(!followUpProgress || followUpProgress.length === 0) ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无跟进记录，点击上方按钮添加</p>
                </CardContent>
              </Card>
            ) : filteredProgress.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">没有匹配的跟进记录，请调整筛选条件</p>
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => { setProgressSearchQuery(""); setProgressTypeFilter("all"); setProgressMentionFilter("all"); }}>清除筛选</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredProgress.map((record, index) => (
                  <Card key={record.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {/* Timeline Dot */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          {index < filteredProgress.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 mt-2"></div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Stage badges */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {record.currentStageName && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    现阶段：{record.currentStageName}
                                  </span>
                                )}
                                {record.nextPlanStageName && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                                    下步计划：{record.nextPlanStageName}
                                  </span>
                                )}
                                {record.nextPlanDate && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                    <Calendar className="h-3 w-3" />
                                    计划完成：{new Date(record.nextPlanDate).toLocaleDateString('zh-CN')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(record.createdAt).toLocaleString('zh-CN')}
                                {record.followUpByName && <span className="ml-2">· {record.followUpByName}</span>}
                              </p>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingProgress(record);
                                  setProgressFormData({
                                    content: record.content,
                                    followUpType: record.followUpType as any,
                                    currentStageId: record.currentStageId || null,
                                    nextPlanStageId: record.nextPlanStageId || null,
                                    nextPlanDate: record.nextPlanDate ? new Date(record.nextPlanDate).toISOString().split('T')[0] : "",
                                    quotationFiles: record.quotationFilesList || [],
                                    quotationDate: record.quotationDate ? new Date(record.quotationDate).toISOString().split('T')[0] : "",
                                    images: record.imagesList || [],
                                    mentionedUserIds: [],
                                  });
                                  setShowMentionDropdown(false);
                                  setMentionQuery("");
                                  setIsAddProgressOpen(true);
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeletingProgress(record)} className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          <p className="text-gray-700 mt-3 whitespace-pre-wrap">
                            {record.content.split(/(@@?[\w\u4e00-\u9fa5]+)/g).map((part: string, i: number) =>
                              /^@@?[\w\u4e00-\u9fa5]+$/.test(part) ? (
                                <span key={i} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">{part}</span>
                              ) : part
                            )}
                          </p>

                          {/* Images */}
                          {record.imagesList && record.imagesList.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-gray-500 mb-2">跟进截图：</p>
                              <div className="grid grid-cols-3 gap-2">
                                {record.imagesList.map((img: {url: string; name: string}, ii: number) => (
                                  <a key={ii} href={img.url} target="_blank" rel="noopener noreferrer">
                                    <img src={img.url} alt={img.name} className="w-full h-24 object-cover rounded border hover:opacity-80 transition-opacity" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quotation files */}
                          {record.quotationFilesList && record.quotationFilesList.length > 0 && (
                            <div className="mt-3 space-y-1">
                              <p className="text-xs font-medium text-gray-500">报价记录文件：</p>
                              {record.quotationFilesList.map((file, fi) => (
                                <a
                                  key={fi}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded"
                                >
                                  <FileText className="h-4 w-4" />
                                  {file.name}
                                  {record.quotationDate && fi === 0 && (
                                    <span className="ml-auto text-xs text-gray-500">
                                      报价日期：{new Date(record.quotationDate).toLocaleDateString('zh-CN')}
                                    </span>
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardContent className="py-12 text-center">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">订单历史功能即将上线</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price History Tab */}
          <TabsContent value="priceHistory">
            <PriceHistoryTab companyId={companyId} />
          </TabsContent>

          {/* Quotation History Tab */}
          <TabsContent value="quotationHistory">
            <Card>
              <CardHeader>
                <CardTitle>报价历史</CardTitle>
                <CardDescription>按报价日期聚合展示所有历史报价文件，方便快速回溯</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // 从 followUpProgress 中提取所有有报价文件的记录
                  const quotationRecords = (followUpProgress || [])
                    .filter(r => r.quotationFilesList && r.quotationFilesList.length > 0)
                    .sort((a, b) => {
                      const dateA = a.quotationDate ? new Date(a.quotationDate).getTime() : new Date(a.createdAt).getTime();
                      const dateB = b.quotationDate ? new Date(b.quotationDate).getTime() : new Date(b.createdAt).getTime();
                      return dateB - dateA;
                    });

                  if (quotationRecords.length === 0) {
                    return (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>暂无报价记录</p>
                        <p className="text-sm mt-1">在跟进记录中上传报价文件后，将在此处显示</p>
                      </div>
                    );
                  }

                  // 按报价日期分组
                  const grouped: Record<string, typeof quotationRecords> = {};
                  quotationRecords.forEach(r => {
                    const dateKey = r.quotationDate
                      ? new Date(r.quotationDate).toLocaleDateString('zh-CN')
                      : new Date(r.createdAt).toLocaleDateString('zh-CN');
                    if (!grouped[dateKey]) grouped[dateKey] = [];
                    grouped[dateKey].push(r);
                  });

                  return (
                    <div className="space-y-6">
                      {Object.entries(grouped).map(([dateKey, records]) => (
                        <div key={dateKey}>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full">
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm font-semibold">{dateKey}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{records.reduce((acc, r) => acc + r.quotationFilesList.length, 0)} 个文件</span>
                          </div>
                          <div className="space-y-3 pl-4 border-l-2 border-blue-100">
                            {records.map(record => (
                              <div key={record.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-sm text-gray-500">
                                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                                      {record.followUpByName && <span className="ml-2">· {record.followUpByName}</span>}
                                    </p>
                                    {record.content && (
                                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                                        {record.content.split(/(@@?[\w\u4e00-\u9fa5]+)/g).map((part: string, i: number) =>
                                          /^@@?[\w\u4e00-\u9fa5]+$/.test(part) ? (
                                            <span key={i} className="text-blue-600 font-medium">{part}</span>
                                          ) : part
                                        )}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  {record.quotationFilesList.map((file, fi) => (
                                    <a
                                      key={fi}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-3 bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50 px-4 py-2.5 rounded-lg transition-colors group"
                                    >
                                      <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                        <p className="text-xs text-gray-400">{file.type?.includes('pdf') ? 'PDF' : 'Excel'} 文件</p>
                                      </div>
                                      <span className="text-xs text-blue-500 group-hover:text-blue-700 flex-shrink-0">点击下载</span>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments">
            <Card>
              <CardHeader>
                <CardTitle>客户附件</CardTitle>
                <CardDescription>管理客户相关的附件文件，按分类组织</CardDescription>
              </CardHeader>
              <CardContent>
                <AttachmentsSection companyId={companyId} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>客户设置</CardTitle>
                <CardDescription>配置客户特定的选项和默认值</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* FOB Price Level Setting */}
                <div>
                  <h3 className="text-lg font-medium mb-2">FOB价格级别默认值</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    设置该客户的默认FOB价格级别，将在报价时自动使用此级别的价格。
                  </p>
                  <div className="flex items-center gap-4">
                    <Label htmlFor="fobLevel" className="w-32">默认级别</Label>
                    <Select
                      value={company?.defaultFobLevel || 'level1'}
                      onValueChange={(value) => {
                        updateCompany.mutate(
                          { id: companyId, defaultFobLevel: value as 'level1' | 'level2' | 'level3' },
                          {
                            onSuccess: () => {
                              toast.success('FOB价格级别已更新');
                              utils.customerManagement.companies.getById.invalidate({ id: companyId });
                            },
                            onError: (error: any) => {
                              toast.error(error.message || '更新失败');
                            },
                          }
                        );
                      }}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="选择FOB级别" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="level1">Level 1 (最低价)</SelectItem>
                        <SelectItem value="level2">Level 2 (标准价)</SelectItem>
                        <SelectItem value="level3">Level 3 (特价)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    提示：大客户通常使用Level 1，普通客户使用Level 2，展会或特价客户使用Level 3。
                  </p>
                </div>

                {/* More Settings Placeholder */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium mb-2">更多设置</h3>
                  <p className="text-sm text-gray-400">更多客户特定配置将在后续版本中添加...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backup Tab (Admin Only) */}
          {user?.role === 'admin' && (
            <TabsContent value="backup">
              <Card>
                <CardHeader>
                  <CardTitle>附件备份</CardTitle>
                  <CardDescription>查看已删除的附件，仅管理员可见</CardDescription>
                </CardHeader>
                <CardContent>
                  <BackupSection companyId={companyId} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Add/Edit Contact Drawer */}
      <Sheet open={isAddContactOpen || !!editingContact} onOpenChange={(open) => {
        if (!open) {
          setIsAddContactOpen(false);
          setEditingContact(null);
          setContactFormData({
            fullName: "",
            jobTitle: "",
            email: "",
            phone: "",
            mobile: "",
            wechat: "",
            skype: "",
            linkedin: "",
            role: "other" as const,
            importance: "normal" as const,
            notes: "",
          });
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingContact ? "编辑联系人" : "添加新联系人"}</SheetTitle>
            <SheetDescription>填写联系人的详细信息</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 space-y-6">
            {/* 基础信息 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">基础信息</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">姓名 <span className="text-red-500">*</span></Label>
                  <Input
                    id="fullName"
                    value={contactFormData.fullName}
                    onChange={(e) => setContactFormData({ ...contactFormData, fullName: e.target.value })}
                    placeholder="输入联系人姓名"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">职位</Label>
                  <Input
                    id="jobTitle"
                    value={contactFormData.jobTitle}
                    onChange={(e) => setContactFormData({ ...contactFormData, jobTitle: e.target.value })}
                    placeholder="例如: 采购经理"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>角色</Label>
                  <Select
                    value={contactFormData.role}
                    onValueChange={(value: any) => setContactFormData({ ...contactFormData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decision_maker">决策者</SelectItem>
                      <SelectItem value="purchaser">采购</SelectItem>
                      <SelectItem value="finance">财务</SelectItem>
                      <SelectItem value="technical">技术</SelectItem>
                      <SelectItem value="sales">销售</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>重要性</Label>
                  <Select
                    value={contactFormData.importance}
                    onValueChange={(value: any) => setContactFormData({ ...contactFormData, importance: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="key">关键联系人</SelectItem>
                      <SelectItem value="normal">普通联系人</SelectItem>
                      <SelectItem value="secondary">次要联系人</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 联系方式 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">联系方式</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                    placeholder="example@company.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mobile">手机</Label>
                  <Input
                    id="mobile"
                    value={contactFormData.mobile}
                    onChange={(e) => setContactFormData({ ...contactFormData, mobile: e.target.value })}
                    placeholder="+86 138 0000 0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">电话</Label>
                  <Input
                    id="phone"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    placeholder="办公电话"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wechat">微信</Label>
                  <Input
                    id="wechat"
                    value={contactFormData.wechat}
                    onChange={(e) => setContactFormData({ ...contactFormData, wechat: e.target.value })}
                    placeholder="微信号"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="skype">Skype</Label>
                  <Input
                    id="skype"
                    value={contactFormData.skype}
                    onChange={(e) => setContactFormData({ ...contactFormData, skype: e.target.value })}
                    placeholder="Skype ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    value={contactFormData.linkedin}
                    onChange={(e) => setContactFormData({ ...contactFormData, linkedin: e.target.value })}
                    placeholder="LinkedIn 个人主页链接"
                  />
                </div>
              </div>
            </div>

            {/* 备注 */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">备注</h4>
              <Textarea
                value={contactFormData.notes}
                onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                placeholder="添加联系人相关的备注信息..."
                rows={3}
              />
            </div>
          </div>
          <SheetFooter className="border-t px-4 py-3">
            <Button variant="outline" onClick={() => {
              setIsAddContactOpen(false);
              setEditingContact(null);
            }}>
              取消
            </Button>
            <Button onClick={editingContact ? handleUpdateContact : handleAddContact}>
              {editingContact ? "更新" : "添加"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Follow-up Drawer */}
      <Sheet open={isAddFollowUpOpen || !!editingFollowUp} onOpenChange={(open) => {
        if (!open) {
          setIsAddFollowUpOpen(false);
          setEditingFollowUp(null);
          setFollowUpFormData({
            type: "call" as const,
            content: "",
            result: "neutral" as const,
            nextFollowUpDate: undefined,
          });
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingFollowUp ? "编辑跟进记录" : "添加跟进记录"}</SheetTitle>
            <SheetDescription>记录与客户的沟通情况</SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4 px-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">跟进类型</Label>
                <Select
                  value={followUpFormData.type}
                  onValueChange={(value: any) => setFollowUpFormData({ ...followUpFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">电话</SelectItem>
                    <SelectItem value="email">邮件</SelectItem>
                    <SelectItem value="meeting">会议</SelectItem>
                    <SelectItem value="visit">拜访</SelectItem>
                    <SelectItem value="other">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="result">跟进结果</Label>
                <Select
                  value={followUpFormData.result}
                  onValueChange={(value: any) => setFollowUpFormData({ ...followUpFormData, result: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">积极</SelectItem>
                    <SelectItem value="neutral">中性</SelectItem>
                    <SelectItem value="negative">消极</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">跟进内容 *</Label>
              <Textarea
                id="content"
                value={followUpFormData.content}
                onChange={(e) => setFollowUpFormData({ ...followUpFormData, content: e.target.value })}
                placeholder="详细描述本次跟进的内容..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextFollowUpDate">下次跟进日期</Label>
              <Input
                id="nextFollowUpDate"
                type="date"
                value={followUpFormData.nextFollowUpDate || ""}
                onChange={(e) => setFollowUpFormData({ ...followUpFormData, nextFollowUpDate: e.target.value })}
              />
            </div>
          </div>
          <SheetFooter className="border-t px-4 py-3">
            <Button variant="outline" onClick={() => {
              setIsAddFollowUpOpen(false);
              setEditingFollowUp(null);
            }}>
              取消
            </Button>
            <Button onClick={editingFollowUp ? handleUpdateFollowUp : handleAddFollowUp}>
              {editingFollowUp ? "更新" : "添加"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Contact Confirmation */}
      <AlertDialog open={!!deletingContact} onOpenChange={(open) => !open && setDeletingContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除联系人</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除联系人 "{deletingContact?.fullName}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingContact) {
                  deleteContact.mutate(deletingContact.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Follow-up Confirmation */}
      <AlertDialog open={!!deletingFollowUp} onOpenChange={(open) => !open && setDeletingFollowUp(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除跟进记录</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这条跟进记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingFollowUp) {
                  deleteFollowUp.mutate(deletingFollowUp.id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 跟进进度 添加/编辑 Dialog */}
      <Dialog open={isAddProgressOpen} onOpenChange={(open) => {
        if (!open) { setIsAddProgressOpen(false); setEditingProgress(null); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProgress ? '编辑跟进记录' : '添加跟进记录'}</DialogTitle>
            <DialogDescription>记录客户跟进进度、阶段和报价信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 现跟进阶段 - AttributeSelector */}
            <div>
              <Label>现跟进阶段</Label>
              <div className="mt-1">
                <AttributeSelector
                  category="客户管理"
                  subcategory="跟进管理"
                  fieldName="跟进阶段"
                  value={progressFormData.currentStageId
                    ? (followUpStages?.find(s => s.id === progressFormData.currentStageId)?.name ? [followUpStages!.find(s => s.id === progressFormData.currentStageId)!.name] : [])
                    : []}
                  onChange={async (vals) => {
                    let stages = followUpStages;
                    if (!stages?.find(s => s.name === vals[0])) {
                      const res = await refetchFollowUpStages();
                      stages = res.data;
                    }
                    const stage = stages?.find(s => s.name === vals[0]);
                    setProgressFormData(prev => ({ ...prev, currentStageId: stage?.id || null }));
                  }}
                  multiple={false}
                  placeholder="选择当前跟进阶段"
                />
              </div>
            </div>

            {/* 下部工作计划 - AttributeSelector */}
            <div>
              <Label>下部工作计划</Label>
              <div className="mt-1">
                <AttributeSelector
                  category="客户管理"
                  subcategory="跟进管理"
                  fieldName="工作计划"
                  value={progressFormData.nextPlanStageId
                    ? (workPlanStages?.find(s => s.id === progressFormData.nextPlanStageId)?.name ? [workPlanStages!.find(s => s.id === progressFormData.nextPlanStageId)!.name] : [])
                    : []}
                  onChange={async (vals) => {
                    let stages = workPlanStages;
                    if (!stages?.find(s => s.name === vals[0])) {
                      const res = await refetchWorkPlanStages();
                      stages = res.data;
                    }
                    const stage = stages?.find(s => s.name === vals[0]);
                    setProgressFormData(prev => ({ ...prev, nextPlanStageId: stage?.id || null }));
                  }}
                  multiple={false}
                  placeholder="选择下步工作计划"
                />
              </div>
            </div>

            {/* 下部工作计划完成时间 */}
            <div>
              <Label>下部工作计划完成时间</Label>
              <Input
                type="date"
                className="mt-1"
                value={progressFormData.nextPlanDate}
                onChange={(e) => setProgressFormData(prev => ({ ...prev, nextPlanDate: e.target.value }))}
              />
            </div>

            {/* 跟进内容 - 支持@提醒同事 */}
            <div>
              <Label>跟进内容 <span className="text-red-500">*</span></Label>
              <div className="relative mt-1">
                <Textarea
                  ref={contentTextareaRef}
                  rows={4}
                  placeholder="请输入跟进内容，输入 @ 可提醒同事…"
                  value={progressFormData.content}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProgressFormData(prev => ({ ...prev, content: val }));
                    // 检测@触发
                    const cursor = e.target.selectionStart;
                    const textBeforeCursor = val.slice(0, cursor);
                    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
                    if (atMatch) {
                      setMentionQuery(atMatch[1]);
                      setMentionCursorPos(cursor);
                      setShowMentionDropdown(true);
                    } else {
                      setShowMentionDropdown(false);
                      setMentionQuery("");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowMentionDropdown(false);
                    }
                  }}
                />
                {/* @mention 下拉列表 */}
                {showMentionDropdown && colleagues && colleagues.length > 0 && (() => {
                  const filtered = colleagues.filter(c =>
                    matchesPinyin(c.name || "", mentionQuery) ||
                    (c.email ? matchesPinyin(c.email, mentionQuery) : false)
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <div className="absolute z-50 left-0 top-full mt-1 w-full max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      <div className="py-1">
                        {filtered.slice(0, 8).map(colleague => (
                          <button
                            key={colleague.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              // 替换@query为@姓名
                              const content = progressFormData.content;
                              const atStart = mentionCursorPos - mentionQuery.length - 1;
                              const newContent = content.slice(0, atStart) + '@' + colleague.name + ' ' + content.slice(mentionCursorPos);
                              setProgressFormData(prev => ({
                                ...prev,
                                content: newContent,
                                mentionedUserIds: prev.mentionedUserIds.includes(colleague.id)
                                  ? prev.mentionedUserIds
                                  : [...prev.mentionedUserIds, colleague.id],
                              }));
                              setShowMentionDropdown(false);
                              setMentionQuery("");
                              // 聚焦并移动光标到@姓名后
                              setTimeout(() => {
                                if (contentTextareaRef.current) {
                                  const newPos = atStart + colleague.name!.length + 2;
                                  contentTextareaRef.current.focus();
                                  contentTextareaRef.current.setSelectionRange(newPos, newPos);
                                }
                              }, 0);
                            }}
                          >
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {colleague.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{colleague.name}</p>
                              <p className="text-xs text-gray-500">{colleague.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* 已@的用户标签 */}
              {progressFormData.mentionedUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-xs text-gray-500">已提醒：</span>
                  {progressFormData.mentionedUserIds.map(uid => {
                    const c = colleagues?.find(x => x.id === uid);
                    if (!c) return null;
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                        @{c.name}
                        <button
                          type="button"
                          className="hover:text-blue-900 ml-0.5"
                          onClick={() => setProgressFormData(prev => ({
                            ...prev,
                            mentionedUserIds: prev.mentionedUserIds.filter(id => id !== uid),
                          }))}
                        >×</button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 跟进截图 - 支持拖拽和Ctrl+V粘贴 */}
            <div>
              <Label>跟进截图</Label>
              <div
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const files = Array.from(e.dataTransfer.files);
                  files.forEach(f => handleProgressImageUpload(f));
                }}
                onPaste={(e) => {
                  const items = Array.from(e.clipboardData.items);
                  items.forEach(item => {
                    if (item.type.startsWith('image/')) {
                      const file = item.getAsFile();
                      if (file) handleProgressImageUpload(file);
                    }
                  });
                }}
                tabIndex={0}
              >
                {/* 已上传图片预览 */}
                {progressFormData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {progressFormData.images.map((img, ii) => (
                      <div key={ii} className="relative group">
                        <img src={img.url} alt={img.name} className="w-full h-24 object-cover rounded border" />
                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          onClick={() => setProgressFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== ii) }))}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-col items-center gap-2 py-2">
                  {isUploadingImage ? (
                    <span className="text-sm text-blue-600">上传中…</span>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                      <p className="text-sm text-gray-500 text-center">
                        拖拽图片到此处，或 <span className="text-blue-600 font-medium">Ctrl+V</span> 粘贴截图
                      </p>
                      <label className="cursor-pointer text-xs text-blue-500 hover:underline">
                        点击选择图片
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => Array.from(e.target.files || []).forEach(f => handleProgressImageUpload(f))}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 报价记录 */}
            <div>
              <Label>报价记录</Label>
              <div className="mt-1 space-y-2">
                {/* 报价日期 */}
                <Input
                  type="date"
                  placeholder="报价日期"
                  value={progressFormData.quotationDate}
                  onChange={(e) => setProgressFormData(prev => ({ ...prev, quotationDate: e.target.value }))}
                />
                {/* 已上传的文件列表 */}
                {progressFormData.quotationFiles.map((file, fi) => (
                  <div key={fi} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={() => setProgressFormData(prev => ({
                        ...prev,
                        quotationFiles: prev.quotationFiles.filter((_, i) => i !== fi)
                      }))}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {/* 上传按钮 */}
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {isUploadingQuotation ? '上传中…' : '点击上传报价文件（PDF 或 Excel）'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.xls,.xlsx"
                    className="hidden"
                    disabled={isUploadingQuotation}
                    onChange={handleProgressQuotationUpload}
                  />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddProgressOpen(false); setEditingProgress(null); }}>取消</Button>
            <Button
              onClick={editingProgress ? handleUpdateProgress : handleAddProgress}
              disabled={createProgress.isPending || updateProgress.isPending}
            >
              {createProgress.isPending || updateProgress.isPending ? '保存中…' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 跟进进度 删除确认 */}
      <AlertDialog open={!!deletingProgress} onOpenChange={(open) => !open && setDeletingProgress(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除跟进记录</AlertDialogTitle>
            <AlertDialogDescription>您确定要删除这条跟进记录吗？此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingProgress) deleteProgress.mutate(deletingProgress.id); }}
              className="bg-red-600 hover:bg-red-700"
            >删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
