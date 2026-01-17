import { StatusMasuk, StatusPulang } from "./absensi";

/* REGISTER */
export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

/* ABSEN MASUK */
export interface AbsenMasukBody {
  statusMasuk: StatusMasuk;
}

/* ABSEN PULANG */
export interface AbsenPulangBody {
  statusPulang: StatusPulang;
}
