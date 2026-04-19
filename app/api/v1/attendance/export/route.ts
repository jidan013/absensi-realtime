import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import db from "@/lib/db";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  try {
    const userAccess = await requireAuth();

    if (userAccess.role !== "ADMIN") {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateFilter.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateFilter.lte = e;
    }

    const attendances = await db.attendance.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { clockIn: dateFilter } : {}),
      },
      include: {
        user: { select: { name: true, email: true, position: true } },
        location: { select: { latitude: true, longitude: true, address: true } },
        qrCode: { select: { code: true } },
      },
      orderBy: { clockIn: "desc" },
    });

    // ── Buat workbook ────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RAD Absensi System";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Rekap Absensi", {
      pageSetup: { paperSize: 9, orientation: "landscape" },
    });

    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      color: { argb: "FFFFFFFF" },
      bold: true,
      size: 11,
    };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };

    // Judul
    sheet.mergeCells("A1:M1");
    const titleCell = sheet.getCell("A1");
    titleCell.value = "REKAP ABSENSI KARYAWAN — RAD SISTEM";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1E1B4B" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 32;

    sheet.mergeCells("A2:M2");
    const subTitle = sheet.getCell("A2");
    subTitle.value = `Diekspor: ${new Date().toLocaleString("id-ID")}${
      startDate || endDate
        ? ` | Periode: ${startDate ?? "awal"} s/d ${endDate ?? "sekarang"}`
        : ""
    }`;
    subTitle.font = { size: 10, color: { argb: "FF6B7280" } };
    subTitle.alignment = { horizontal: "center" };
    sheet.getRow(2).height = 18;

    sheet.addRow([]);

    // Kolom
    const columns: { header: string; key: string; width: number }[] = [
      { header: "No",              key: "no",       width: 5  },
      { header: "Nama",            key: "name",     width: 22 },
      { header: "Email",           key: "email",    width: 28 },
      { header: "Jabatan",         key: "position", width: 20 },
      { header: "Tanggal",         key: "date",     width: 16 },
      { header: "Jam Masuk",       key: "clockIn",  width: 14 },
      { header: "Jam Keluar",      key: "clockOut", width: 14 },
      { header: "Foto Absensi",    key: "photo",    width: 35 },
      { header: "Latitude",        key: "lat",      width: 14 },
      { header: "Longitude",       key: "lon",      width: 14 },
      { header: "Alamat / Lokasi", key: "address",  width: 30 },
      { header: "Link Maps",       key: "maps",     width: 30 },
      { header: "Kode QR",         key: "qr",       width: 32 },
    ];

    sheet.columns = columns;

    const headerRow = sheet.getRow(4);
    headerRow.height = 24;
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header;
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });

    // Data rows
    attendances.forEach((att, i) => {
      const rowIndex = 5 + i;
      const row = sheet.getRow(rowIndex);
      row.height = 20;

      const lat = att.location?.latitude ?? null;
      const lon = att.location?.longitude ?? null;
      const mapsUrl =
        lat != null && lon != null
          ? `https://www.google.com/maps?q=${lat},${lon}`
          : null;

      type CellValue =
        | string
        | number
        | null
        | { text: string; hyperlink: string };

      const values: CellValue[] = [
        i + 1,
        att.user.name,
        att.user.email,
        att.user.position,
        att.clockIn
          ? new Date(att.clockIn).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
          : "-",
        att.clockIn
          ? new Date(att.clockIn).toLocaleTimeString("id-ID")
          : "-",
        att.clockOut
          ? new Date(att.clockOut).toLocaleTimeString("id-ID")
          : "-",
        att.photoUrl
          ? { text: "Lihat Foto", hyperlink: att.photoUrl }
          : "-",
        lat ?? "-",
        lon ?? "-",
        att.location?.address ??
          (lat != null ? `${lat.toFixed(4)}, ${lon?.toFixed(4)}` : "-"),
        mapsUrl
          ? { text: "Buka di Google Maps", hyperlink: mapsUrl }
          : "-",
        att.qrCode?.code ?? "-",
      ];

      values.forEach((val, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        if (val !== null && typeof val === "object" && "hyperlink" in val) {
          cell.value = val;
          cell.font = { color: { argb: "FF4F46E5" }, underline: true };
        } else {
          cell.value = val as string | number;
        }
        cell.alignment = {
          vertical: "middle",
          horizontal: colIdx === 0 ? "center" : "left",
          wrapText: true,
        };
        cell.border = borderStyle;
        if (i % 2 === 1) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF9FAFB" },
          };
        }
      });
    });

    // Summary
    const summaryRow = sheet.getRow(5 + attendances.length);
    const s1 = summaryRow.getCell(1);
    const s2 = summaryRow.getCell(2);
    s1.value = "TOTAL";
    s1.font = { bold: true };
    s2.value = `${attendances.length} absensi`;
    s2.font = { bold: true };

    // Freeze + filter
    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 4 }];
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: columns.length },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `rekap-absensi-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error export rekap:", error);
    return NextResponse.json(
      { error: "Gagal mengekspor data", details: (error as Error).message },
      { status: 500 }
    );
  }
}