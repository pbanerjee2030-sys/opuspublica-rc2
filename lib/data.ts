export interface Address {
  label: string;
  icon: string;
  address: string;
  note?: string;
}

export const addresses: Address[] = [
  {
    label: "Headquarters",
    icon: "Building2",
    address: "Fluwelen Burgwal 58, 2511 CJ Den Haag, Netherlands",
    note: "Advocacy Unified Network"
  },
  {
    label: "Registered Office",
    icon: "MapPin",
    address: "85 MOUNT HOPE RD, MAHOPAC NY 10541-0000, USA"
  },
  {
    label: "SAARC Office",
    icon: "Globe",
    address: "Anamnagar, Kathmandu, Nepal"
  }
];
