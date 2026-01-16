"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Clock,
  CheckCircle2,
  Download,
  Loader2,
  MoreHorizontal,
  Search,
} from "lucide-react";

/* =====================
 UI
===================== */
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* =====================
 TYPES
===================== */
type AttendanceStatus = "success" | "processing" | "failed" | "pending";

type AttendanceRecord = {
  id: string;
  time: string;
  status: AttendanceStatus;
  email: string;
};

const STATUS_CONFIG = {
  success: {
    label: "Hadir",
    icon: CheckCircle2,
    class: "bg-emerald-100 text-emerald-700",
  },
  processing: {
    label: "Diproses",
    icon: Clock,
    class: "bg-blue-100 text-blue-700",
  },
  failed: {
    label: "Gagal",
    icon: Loader2,
    class: "bg-red-100 text-red-700",
  },
  pending: {
    label: "Menunggu",
    icon: Clock,
    class: "bg-slate-200 text-slate-700",
  },
};

const INITIAL_DATA: AttendanceRecord[] = [
  { id: "1", time: "", status: "success", email: "akmal@rad.co" },
  { id: "2", time: "", status: "success", email: "abe@rad.co" },
  { id: "3", time: "", status: "processing", email: "mat@rad.co" },
  { id: "4", time: "", status: "success", email: "iwan@rad.co" },
  { id: "5", time: "", status: "success", email: "agus@rad.co" },
  { id: "6", time: "", status: "failed", email: "morelo@rad.co" },
  { id: "7", time: "", status: "pending", email: "siti@rad.co" },
  { id: "8", time: "", status: "success", email: "budi@rad.co" },
];

export default function AttendanceTablePage() {
  const [data, setData] = React.useState(INITIAL_DATA);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [rowSelection, setRowSelection] = React.useState({});
  const [isExporting, setIsExporting] = React.useState(false);

  /* realtime time */
  React.useEffect(() => {
    const tick = () => {
      const now = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setData((p) => p.map((r) => ({ ...r, time: now })));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const columns = React.useMemo<ColumnDef<AttendanceRecord>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(v) =>
            table.toggleAllPageRowsSelected(!!v)
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
        />
      ),
      size: 36,
    },
    {
      accessorKey: "time",
      header: "Waktu",
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 font-mono text-sm text-slate-700">
          <Clock className="h-4 w-4 text-blue-600" />
          {getValue<string>()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ getValue }) => {
        const s = STATUS_CONFIG[getValue<AttendanceStatus>()];
        const Icon = s.icon;
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${s.class}`}>
            <Icon className="h-3 w-3" />
            {s.label}
          </span>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ getValue }) => (
        <span className="font-medium text-slate-800">
          {getValue<string>()}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() =>
                navigator.clipboard.writeText(row.original.id)
              }
            >
              Salin ID
            </DropdownMenuItem>
            <DropdownMenuItem>Lihat Detail</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 48,
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, rowSelection },
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /* EXPORT */
  const exportCSV = () => {
    setIsExporting(true);

    const rows =
      table.getFilteredSelectedRowModel().rows.length > 0
        ? table.getFilteredSelectedRowModel().rows
        : table.getFilteredRowModel().rows;

    const csv = [
      ["ID", "Waktu", "Status", "Email"],
      ...rows.map((r) => [
        r.original.id,
        r.original.time,
        STATUS_CONFIG[r.original.status].label,
        r.original.email,
      ]),
    ]
      .map((row) => row.map((c) => `"${c}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance.csv";
    a.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">

      {/* TOOLBAR */}
      <div className="flex items-center justify-between rounded-xl bg-slate-900 p-4">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
          <Input
            placeholder="Cari email..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-slate-800 text-white placeholder:text-slate-400 border-slate-700 focus-visible:ring-slate-600"
          />
        </div>

        <Button
          onClick={exportCSV}
          disabled={isExporting}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id} className="font-semibold text-slate-700">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="
                    even:bg-slate-50
                    hover:bg-slate-100
                    transition
                  "
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
