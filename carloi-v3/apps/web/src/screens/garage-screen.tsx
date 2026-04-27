'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, CarFront, Cpu, Plus } from 'lucide-react';

import { createExpertiseSession } from '@/lib/api';
import { buildVehicleSubtitle, buildVehicleTitle, createEmptyPaintMap, getVehicleListingReadiness } from '@/lib/vehicle';
import { useUiStore } from '@/store/ui-store';
import { useSessionStore } from '@/store/session-store';
import { GarageWizardModal } from '@/components/garage-wizard-modal';
import { PageHeader } from '@/components/page-header';
import { StateBlock } from '@/components/state-block';
import { VehicleCard } from '@/components/vehicle-card';

export function GarageScreen() {
  const status = useSessionStore((state) => state.status);
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);
  const deleteGarageVehicle = useSessionStore((state) => state.deleteGarageVehicle);
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const vehicles = snapshot?.garage?.vehicles || [];
  const stats = useMemo(
    () => ({
      total: snapshot?.garage?.totalVehicles || 0,
      obdReady: vehicles.filter((vehicle) => vehicle.obdConnectionStatus === 'connected').length,
      expertiseReady: vehicles.filter((vehicle) => vehicle.latestExpertiseReport).length,
    }),
    [snapshot?.garage?.totalVehicles, vehicles],
  );

  async function handleExpertise(vehicleId: string) {
    setBusyId(vehicleId);
    try {
      await createExpertiseSession(vehicleId, { source: 'web-v3', mode: 'baseline' });
      await refreshSnapshot();
    } finally {
      setBusyId(null);
    }
  }

  if (status !== 'authenticated') {
    return (
      <StateBlock
        title="Garajim icin giris yap"
        description="Coklu arac, OBD ve ekspertiz akislarini kullanmak icin oturum gerekli."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garajim"
        subtitle="Coklu arac, ekspertiz raporlari, OBD durumlari ve ilana hazirlik akisini tek grid yuzeyde yonet."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard title="Kayitli arac" value={String(stats.total)} icon={<CarFront className="size-5 text-cyan-700" />} />
        <StatCard title="OBD bagli" value={String(stats.obdReady)} icon={<Cpu className="size-5 text-cyan-700" />} />
        <StatCard title="Expertiz hazir" value={String(stats.expertiseReady)} icon={<Activity className="size-5 text-cyan-700" />} />
      </div>

      <section className="glass-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">Coklu arac yonetimi</div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Vehicle catalog destekli wizard ile arac ekle, plakayi gizle, ekspertiz ve ilan hazirlik durumunu guncelle.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="size-4" />
            <span>Arac ekle</span>
          </button>
        </div>
      </section>

      {vehicles.length ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {vehicles.map((vehicle) => {
            const readiness = getVehicleListingReadiness({
              selection: {},
              ownershipBasis: 'registered-owner',
              plateVisibility: vehicle.plateIsHidden ? 'masked' : 'full',
              equipment: {
                selectedPackageSlugs: [],
                customEntries: vehicle.equipment,
                confirmed: vehicle.equipment.length > 0,
              },
              paintAssessment: {
                map: (vehicle.paintMap as never) || createEmptyPaintMap(),
                confirmed: Boolean(vehicle.paintMap),
              },
              photos: vehicle.media.map((item) => ({
                id: item.id,
                url: item.url,
                type: item.kind === 'video' ? 'video' : 'image',
              })),
              visibilityScope: vehicle.showInProfile ? 'profile' : 'garage',
              mileageKm: vehicle.mileageKm || undefined,
              colorName: vehicle.color,
              plateNumber: vehicle.plate,
              registration: vehicle.registration
                ? {
                    ownerName: vehicle.registration.ownerName,
                    registrationCity: vehicle.registration.registrationCity,
                  }
                : undefined,
              chassisNumber: vehicle.chassis?.chassisNo,
            });

            return (
              <div key={vehicle.id} className="space-y-4">
                <VehicleCard vehicle={vehicle} />
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-black tracking-tight text-slate-950">{buildVehicleTitle(vehicle)}</div>
                      <div className="mt-1 text-sm text-slate-500">{buildVehicleSubtitle(vehicle) || 'Garaj araci'}</div>
                    </div>
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                      {vehicle.obdConnectionStatus || 'OBD hazir degil'}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoPill label="Saglik puani" value={vehicle.healthScore ? `${vehicle.healthScore}/100` : 'Hesaplanmadi'} />
                    <InfoPill label="Surus puani" value={vehicle.drivingScore ? `${vehicle.drivingScore}/100` : 'Hesaplanmadi'} />
                    <InfoPill label="Plaka" value={vehicle.plateDisplay || 'Gizli'} />
                    <InfoPill label="Kilometre" value={vehicle.mileageKm ? `${vehicle.mileageKm} km` : 'Belirtilmedi'} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/vehicle/${vehicle.id}`}
                      className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                    >
                      Arac detayina git
                    </Link>
                    <button
                      type="button"
                      onClick={() => openCreateModal('listing')}
                      className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800"
                    >
                      Araci ilana cikar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleExpertise(vehicle.id)}
                      disabled={busyId === vehicle.id}
                      className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === vehicle.id ? 'Analiz baslatiliyor...' : 'Expertiz oturumu olustur'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteGarageVehicle(vehicle.id)}
                      className="rounded-full border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700"
                    >
                      Araci sil
                    </button>
                  </div>
                  {!readiness.ready ? (
                    <div className="mt-4 rounded-[24px] bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                      Ilan hazirlik eksikleri: {readiness.missingFields.join(', ')}
                    </div>
                  ) : null}
                  <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    Web V3 tarafinda Bluetooth OBD tarama dogrudan desteklenmez. OBD baglama akisi mobil V3 veya ileride eklenecek masaustu baglayici ile tamamlanir.
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <StateBlock
          title="Garajin bos"
          description="Ilk aracini ekleyerek Garajim grid'ini, arac detay sayfasini ve ilan hazirlik akislarini aktifleştir."
          action={
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Arac ekle
            </button>
          }
        />
      )}

      <GarageWizardModal open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-500">{title}</div>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
        </div>
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-cyan-50">{icon}</span>
      </div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
