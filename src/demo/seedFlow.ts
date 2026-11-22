/**
 * Société de démonstration OptiFlow « Démo Tractions du Sud-Ouest » : coûts de chaque ligne
 * calculés par le vrai moteur (calculateTourCosts), puis SQL compact (les tractions sont
 * développées en base jour par jour). Lancement : npx vite-node src/demo/seedFlow.ts
 */
import { calculateTourCosts } from "@/utils/tourCostCalculation";
import { defaultVehicle, type Vehicle } from "@/types/vehicle";
import type { Driver, FixedCharge } from "@/types";

const L = "2b6f06fe-5416-47d2-a832-6f6cc9af160f";
const U = "4e69ca0c-32ed-4c2a-b098-9fa3ac9e778a";
const now = "2026-09-28T08:00:00Z";
const q = (v: unknown) => (v == null ? "null" : typeof v === "number" ? String(v) : `'${String(typeof v === "object" ? JSON.stringify(v) : v).replace(/'/g, "''")}'`);

const drv = (id: string, name: string, contractType: Driver["contractType"], baseSalary: number, extra: Partial<Driver> = {}): Driver => ({
  id, name, firstName: name.split(" ")[0], lastName: name.split(" ").slice(1).join(" "), phone: "06" + id.replace(/\D/g, "").padStart(8, "1"), email: `${name.split(" ")[0].toLowerCase()}@demo-tractions.fr`,
  hireDate: "2022-03-01", contractType, baseSalary, hourlyRate: Math.round(baseSalary / 169 * 100) / 100, hoursPerDay: 9, patronalCharges: 42, mealAllowance: 15.9, overnightAllowance: 0,
  workingDaysPerMonth: 21, sundayBonus: 0, nightBonus: 95, seniorityBonus: 0, unloadingBonus: 0, ...extra,
});
const drivers: Driver[] = [
  drv("drv-1", "Patrick Mercier", "cdi", 2480, { seniorityBonus: 74, hireDate: "2016-05-02" }),
  drv("drv-2", "Yannick Cabrol", "cdi", 2420, { hireDate: "2019-09-16" }),
  drv("drv-3", "Rachid Belaïd", "cdi", 2450, { hireDate: "2020-01-06" }),
  drv("drv-4", "Thomas Vidal", "cdd", 2300, { hireDate: "2026-09-01" }),
  drv("drv-5", "Damien Costes", "interim", 0, { interimAgency: "Intérim Occitanie (démo)", interimHourlyRate: 13.8, interimCoefficient: 1.9, hourlyRate: 13.8 }),
];
const veh = (id: string, name: string, plate: string, brand: string, model: string, year: number, km: number, leasing: number, extra: Partial<Vehicle> = {}): Vehicle => ({
  ...defaultVehicle, id, name, licensePlate: plate, brand, model, year, currentKm: km, monthlyLeasing: leasing, insuranceCost: 3100, sinisterCharge: 900, purchasePrice: 0, depreciationYears: 0,
  maintenances: [
    { id: `${id}-m1`, type: "revision", name: "Révision complète", intervalKm: 90000, lastKm: km - 40000, lastDate: "2026-06-12", cost: 1450 },
    { id: `${id}-m2`, type: "mines", name: "Contrôle technique", intervalKm: 0, lastKm: km - 70000, lastDate: "2026-02-03", cost: 480 },
  ],
  tires: [{ brand: "Michelin", model: "X Multi", size: "315/70 R22.5", position: "avant", pricePerUnit: 520, quantity: 2, durabilityKm: 180000, lastChangeKm: km - 60000, lastChangeDate: "2026-03-20" }],
  createdAt: now, updatedAt: now, isActive: true, ...extra,
});
const vehicles: Vehicle[] = [
  veh("veh-1", "Tracteur 1 — Renault T", "GG-111-FL", "Renault", "T 480", 2023, 312400, 1850),
  veh("veh-2", "Tracteur 2 — Volvo FH", "GG-222-FL", "Volvo", "FH 460", 2022, 401800, 1780),
  veh("veh-3", "Tracteur 3 — DAF XF", "GG-333-FL", "DAF", "XF 480", 2024, 158300, 1990),
  veh("veh-4", "Tracteur 4 — Scania R", "GG-444-FL", "Scania", "R 450", 2021, 512600, 1550, { availabilityStatus: "entretien", availabilityNote: "Embrayage — retour prévu le 25/11" }),
  veh("veh-5", "Porteur 19 t — Renault D", "GG-555-FL", "Renault", "D 19 Wide", 2023, 121700, 1250, { type: "porteur" as Vehicle["type"], weight: 19000, axles: 2, length: 10, fuelConsumption: 24, adBlueConsumption: 1 }),
];
const charges: FixedCharge[] = [
  { id: "chg-1", name: "Loyer quai de transbordement", amount: 2600, isHT: true, periodicity: "monthly", category: "administrative" },
  { id: "chg-2", name: "Exploitant de nuit (chargé)", amount: 4100, isHT: true, periodicity: "monthly", category: "administrative" },
  { id: "chg-3", name: "Assurance marchandises", amount: 5200, isHT: true, periodicity: "yearly", category: "insurance" },
  { id: "chg-4", name: "Comptabilité et social", amount: 420, isHT: true, periodicity: "monthly", category: "administrative" },
  { id: "chg-5", name: "Télématique et chronos", amount: 260, isHT: true, periodicity: "monthly", category: "other" },
];
const clients = [
  { id: "f1f1f1f1-0000-4000-8000-000000000001", name: "Messagerie Atlantique Réseau", company: "MAR (démo)", email: "exploitation@demo-mar.fr", phone: "0556400001", siret: "81234500100011", address: "Parc logistique, 3 rue des Transporteurs", city: "Mérignac", cp: "33700" },
  { id: "f1f1f1f1-0000-4000-8000-000000000002", name: "Express Méditerranée", company: "Express Méditerranée (démo)", email: "lignes@demo-expressmed.fr", phone: "0467400002", siret: "81234500200022", address: "ZI de la Lauze", city: "Saint-Jean-de-Védas", cp: "34430" },
  { id: "f1f1f1f1-0000-4000-8000-000000000003", name: "Pyrénées Distribution", company: "Pyrénées Distribution (démo)", email: "transport@demo-pyrdistri.fr", phone: "0559400003", siret: "81234500300033", address: "Zone Induspal", city: "Lescar", cp: "64230" },
  { id: "f1f1f1f1-0000-4000-8000-000000000004", name: "Aveyron Express", company: "Aveyron Express (démo)", email: "contact@demo-aveyronexpress.fr", phone: "0565400004", siret: "81234500400044", address: "ZA de Bel Air", city: "Rodez", cp: "12000" },
];
// Lignes de nuit (aller-retour depuis le hub de Toulouse) : conducteur, véhicule, client, prix jour HT.
const lines = [
  { code: "TLS-BDX", name: "Ligne nuit Toulouse ⇄ Bordeaux", to: "Mérignac (33)", km: 490, toll: 72, driver: 0, vehicle: 0, client: 0, price: 905 },
  { code: "TLS-MTP", name: "Ligne nuit Toulouse ⇄ Montpellier", to: "Saint-Jean-de-Védas (34)", km: 495, toll: 78, driver: 1, vehicle: 1, client: 1, price: 890 },
  { code: "TLS-PAU", name: "Ligne nuit Toulouse ⇄ Pau", to: "Lescar (64)", km: 400, toll: 58, driver: 2, vehicle: 2, client: 2, price: 760 },
  { code: "TLS-RDZ", name: "Traction Toulouse ⇄ Rodez", to: "Rodez (12)", km: 310, toll: 0, driver: 3, vehicle: 4, client: 3, price: 545 },
  { code: "TLS-BDX2", name: "Renfort Toulouse ⇄ Bordeaux (jeudi, vendredi)", to: "Mérignac (33)", km: 490, toll: 72, driver: 4, vehicle: 3, client: 0, price: 905 },
];
const settings = { workingDaysPerMonth: 21, workingDaysPerYear: 252, tomtomApiKey: "", companyName: "Démo Tractions du Sud-Ouest", tvaRate: 20, defaultDownloadPath: "" };
const vp = { fuelConsumption: 32, fuelPriceHT: 1.38, fuelPriceIsHT: true, adBlueConsumption: 1.5, adBluePriceHT: 0.55, adBluePriceIsHT: true };
const out: string[] = [];
const facts = lines.map((l) => {
  const c = calculateTourCosts({ distance: l.km, tollCost: l.toll, selectedDrivers: [drivers[l.driver]], selectedVehicles: [vehicles[l.vehicle]], selectedTrailer: null, charges, settings, appVehicleParams: vp, fleetSize: 5 });
  const r = (v: number) => Math.round(v * 100) / 100;
  console.error(l.code, Math.round(c.totalCost), l.price, Math.round((l.price - c.totalCost) / l.price * 100) + "%");
  return { ...l, fuel: r(c.fuelCost), adblue: r(c.adBlueCost), tollc: r(c.tollCost), driverc: r(c.driverCost + c.driverBonuses + c.driverAllowances), structure: r(c.structureCost), vehiclec: r(c.vehicleCost), total: r(c.totalCost) };
});
out.push(`insert into user_vehicles (user_id, license_id, local_id, name, license_plate, brand, model, year, vehicle_type, fuel_consumption, fuel_type, current_km, is_active, vehicle_data) values\n${vehicles.map((v) => `(${q(U)},${q(L)},${q(v.id)},${q(v.name)},${q(v.licensePlate)},${q(v.brand)},${q(v.model)},${v.year},${q(v.type)},${v.fuelConsumption},${q(v.fuelType)},${v.currentKm},true,${q(v)}::jsonb)`).join(",\n")};`);
out.push(`insert into user_drivers (user_id, license_id, local_id, name, driver_type, base_salary, hourly_rate, driver_data) values\n${drivers.map((d) => `(${q(U)},${q(L)},${q(d.id)},${q(d.name)},${q(d.contractType)},${d.baseSalary},${d.hourlyRate},${q(d)}::jsonb)`).join(",\n")};`);
out.push(`insert into user_charges (user_id, license_id, local_id, name, amount, is_ht, periodicity, category, charge_data) values\n${charges.map((c) => `(${q(U)},${q(L)},${q(c.id)},${q(c.name)},${c.amount},${c.isHT},${q(c.periodicity)},${q(c.category)},${q(c)}::jsonb)`).join(",\n")};`);
out.push(`insert into clients (id, user_id, license_id, name, email, phone, company, siret, address, city, postal_code, country, notes) values\n${clients.map((c) => `(${q(c.id)},${q(U)},${q(L)},${q(c.name)},${q(c.email)},${q(c.phone)},${q(c.company)},${q(c.siret)},${q(c.address)},${q(c.city)},${q(c.cp)},'France',null)`).join(",\n")};`);
out.push(`create table public._flow_lines as select * from (values ${facts.map((f) => `(${[f.code, f.name, f.to, f.km, f.driver + 1, f.vehicle + 1, clients[f.client].id, f.price, f.fuel, f.adblue, f.tollc, f.driverc, f.structure, f.vehiclec, f.total].map(q).join(",")})`).join(",")}) as v(code, name, dest, km, dn, vn, client_id, price, fuel, adblue, toll, driverc, structure, vehiclec, total);`);
console.log(out.join("\n"));
