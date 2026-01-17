export type StatusMasuk = "HADIR" | "IZIN" | "SAKIT" | "ALPHA";
export type StatusPulang = "PULANG" | "LEMBUR";

export interface Absensi {
  id: string;
  userId: string;
  tanggal: string;

  masukAt?: Date;
  pulangAt?: Date;

  statusMasuk?: StatusMasuk;
  statusPulang?: StatusPulang;
}
