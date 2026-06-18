"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Loader2, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Branch, Workspace } from "@/lib/types";

type BranchStatus = Branch["status"];

type BranchRow = Branch & {
  source_count?: number;
  connected_source_count?: number;
  last_sync_at?: string | null;
};

type BranchForm = {
  name: string;
  brand: string;
  district: string;
  city: string;
  timezone: string;
  status: BranchStatus;
};

const emptyForm: BranchForm = {
  name: "",
  brand: "",
  district: "",
  city: "",
  timezone: "Europe/Istanbul",
  status: "active",
};

const timezoneOptions = [
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
];

function formatLastSync(value?: string | null) {
  if (!value) return "Henüz senkron yok";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadge(status: BranchStatus) {
  if (status === "active") {
    return <Badge variant="secondary">Aktif</Badge>;
  }
  return <Badge variant="outline">Pasif</Badge>;
}

function formFromBranch(branch: BranchRow): BranchForm {
  return {
    name: branch.name ?? "",
    brand: branch.brand ?? "",
    district: branch.district ?? "",
    city: branch.city ?? "",
    timezone: branch.timezone ?? "Europe/Istanbul",
    status: branch.status,
  };
}

function branchLocation(branch: BranchRow) {
  return [branch.district, branch.city].filter(Boolean).join(", ") || "Konum eklenmedi";
}

export default function BranchesPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRow | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);

  const activeBranchCount = useMemo(
    () => branches.filter((branch) => branch.status === "active").length,
    [branches],
  );
  const branchLimit = workspace?.branch_limit === undefined ? 1 : workspace.branch_limit;
  const limitLabel = branchLimit === null ? "Sınırsız" : `${activeBranchCount}/${branchLimit}`;
  const canCreateActiveBranch = branchLimit === null || activeBranchCount < branchLimit;

  const loadData = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    setError(null);

    try {
      const [authRes, workspaceRes, branchesRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/workspace"),
        fetch("/api/branches"),
      ]);

      if (!authRes.ok) {
        router.push("/login?redirect=/settings/branches");
        return;
      }

      if (!workspaceRes.ok || !branchesRes.ok) {
        setError("Şube bilgileri alınamadı.");
        return;
      }

      const [workspaceData, branchesData] = await Promise.all([
        workspaceRes.json(),
        branchesRes.json(),
      ]);

      setWorkspace(workspaceData.workspace ?? null);
      setBranches(branchesData.branches ?? []);
    } catch {
      setError("Şube bilgileri alınamadı.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openCreateDialog = () => {
    setEditingBranch(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (branch: BranchRow) => {
    setEditingBranch(branch);
    setForm(formFromBranch(branch));
    setError(null);
    setDialogOpen(true);
  };

  const submitBranch = async () => {
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      brand: form.brand,
      district: form.district,
      city: form.city,
      timezone: form.timezone,
      status: form.status,
    };

    try {
      const res = await fetch(editingBranch ? `/api/branches/${editingBranch.id}` : "/api/branches", {
        method: editingBranch ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.code === "branch_limit_reached") {
          setError("Şube limitine ulaşıldı. Daha fazla aktif şube için plan yükseltin.");
        } else {
          setError(data.error ?? "Şube kaydedilemedi.");
        }
        return;
      }

      setDialogOpen(false);
      setEditingBranch(null);
      setForm(emptyForm);
      await loadData("refresh");
    } catch {
      setError("Şube kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (branch: BranchRow, status: BranchStatus) => {
    setError(null);
    const method = status === "paused" ? "DELETE" : "PATCH";
    const body = status === "active" ? JSON.stringify({ status: "active" }) : undefined;

    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method,
        headers: status === "active" ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "branch_limit_reached") {
          setError("Şube limitine ulaşıldı. Bu şubeyi aktifleştirmek için plan yükseltin.");
        } else {
          setError(data.error ?? "Şube durumu güncellenemedi.");
        }
        return;
      }
      await loadData("refresh");
    } catch {
      setError("Şube durumu güncellenemedi.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-9 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="page-wrap mx-auto flex max-w-[980px] flex-col gap-6 px-8 pt-9 pb-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <Button asChild variant="ghost" size="sm" className="w-fit px-0 text-muted-foreground">
              <Link href="/settings">
                <ArrowLeft data-icon="inline-start" />
                Settings
              </Link>
            </Button>
            <div className="flex flex-col gap-1">
              <h1 className="text-[1.55rem] font-bold tracking-[-0.02em] text-foreground">Şubeler</h1>
              <p className="max-w-[620px] text-sm leading-6 text-muted-foreground">
                Lokasyonları yönetin, her şubeyi kendi kaynakları ve sinyalleriyle ayrı takip edin.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => loadData("refresh")}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <RefreshCw data-icon="inline-start" />}
              Yenile
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus data-icon="inline-start" />
              Şube ekle
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Aktif şube</CardTitle>
              <CardDescription>Plan limitine göre açık lokasyonlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-[-0.03em] text-foreground">{limitLabel}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Toplam şube</CardTitle>
              <CardDescription>Aktif ve pasif lokasyonlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-[-0.03em] text-foreground">{branches.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bağlı kaynak</CardTitle>
              <CardDescription>Şubelere atanmış kaynaklar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-[-0.03em] text-foreground">
                {branches.reduce((total, branch) => total + (branch.source_count ?? 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {!canCreateActiveBranch && (
          <Card className="border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle>Şube limiti dolu</CardTitle>
              <CardDescription>
                Bu workspace şu anda {branchLimit} aktif şube ile sınırlı. Yeni aktif şube eklemek için plan yükseltin veya bir şubeyi pasifleştirin.
              </CardDescription>
              <CardAction>
                <Button asChild size="sm">
                  <Link href="/settings/billing">Planı yükselt</Link>
                </Button>
              </CardAction>
            </CardHeader>
          </Card>
        )}

        {error && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Şube listesi</CardTitle>
            <CardDescription>Şube bilgileri, kaynak kapsamı ve son senkron durumu</CardDescription>
          </CardHeader>
          <CardContent>
            {branches.length === 0 ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-muted/30 px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-background text-muted-foreground">
                  <Building2 />
                </div>
                <div className="flex max-w-[360px] flex-col gap-1">
                  <div className="font-semibold text-foreground">Henüz şube yok</div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    İlk şubeyi ekleyerek kaynakları lokasyon bazında toplamaya başlayın.
                  </p>
                </div>
                <Button onClick={openCreateDialog}>
                  <Plus data-icon="inline-start" />
                  İlk şubeyi ekle
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={cn(
                      "grid gap-4 rounded-lg border bg-background p-4 md:grid-cols-[1fr_auto]",
                      branch.status === "paused" && "bg-muted/30 opacity-80",
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="min-w-0 truncate text-base font-semibold text-foreground">{branch.name}</div>
                        {statusBadge(branch.status)}
                        {branch.brand && <Badge variant="outline">{branch.brand}</Badge>}
                      </div>
                      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Konum</div>
                          <div className="mt-1 truncate text-foreground">{branchLocation(branch)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Kaynak</div>
                          <div className="mt-1 text-foreground">
                            {branch.connected_source_count ?? 0}/{branch.source_count ?? 0} bağlı
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Son senkron</div>
                          <div className="mt-1 text-foreground">{formatLastSync(branch.last_sync_at)}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(branch)}>
                        Düzenle
                      </Button>
                      {branch.status === "active" ? (
                        <Button variant="outline" size="sm" onClick={() => changeStatus(branch, "paused")}>
                          Pasifleştir
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => changeStatus(branch, "active")}>
                          Aktifleştir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Şubeyi düzenle" : "Yeni şube"}</DialogTitle>
            <DialogDescription>
              Şube bilgileri kaynak bağlantılarında, analiz filtrelerinde ve WhatsApp özetlerinde kullanılacak.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-name">Şube adı</Label>
              <Input
                id="branch-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Kadıköy Moda"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="branch-brand">Marka</Label>
                <Input
                  id="branch-brand"
                  value={form.brand}
                  onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))}
                  placeholder="Observer Cafe"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="branch-district">İlçe</Label>
                <Input
                  id="branch-district"
                  value={form.district}
                  onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
                  placeholder="Kadıköy"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="branch-city">Şehir</Label>
                <Input
                  id="branch-city"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="İstanbul"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Timezone</Label>
                <Select
                  value={form.timezone}
                  onValueChange={(value) => setForm((current) => ({ ...current, timezone: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {timezoneOptions.map((timezone) => (
                        <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Durum</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as BranchStatus }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="paused">Pasif</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <>
              <Separator />
              <div className="text-sm text-destructive">{error}</div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              İptal
            </Button>
            <Button onClick={submitBranch} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 data-icon="inline-start" className="animate-spin" />}
              {editingBranch ? "Kaydet" : "Şube oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
