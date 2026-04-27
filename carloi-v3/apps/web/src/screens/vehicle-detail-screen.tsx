'use client';

import { useEffect, useMemo, useState } from 'react';

import { listExpertiseReports } from '@/lib/api';
import { buildVehicleSubtitle, buildVehicleTitle } from '@/lib/vehicle';
import { useUiStore } from '@/store/ui-store';
import { useSessionStore } from '@/store/session-store';
import { MediaCarousel } from '@/components/media-carousel';
import { StateBlock } from '@/components/state-block';

export function VehicleDetailScreen({ vehicleId }: { vehicleId: string }) {
  const snapshot = useSessionStore((state) => state.snapshot);
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const [reports, setReports] = useState<Array<Record<string, unknown>>>([]);

  const vehicle = useMemo(
    () => snapshot?.garage?.vehicles.find((item) => item.id === vehicleId) || null,
    [snapshot?.garage?.vehicles, vehicleId],
  );

  useEffect(() => {
    if (!vehicleId) {
      return;
    }
    void listExpertiseReports(vehicleId)
      .then((response) => setReports(response.reports || []))
      .catch(() => setReports([]));
  }, [vehicleId]);

  if (!vehicle) {
    return <StateBlock title="Arac bulunamadi" description="Secilen arac bu oturum snapshot'inda yer almiyor." />;
  }

  return (
    <div className="space-y-6">
      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-3xl font-black tracking-tight text-slate-950">{buildVehicleTitle(vehicle)}</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">{buildVehicleSubtitle(vehicle) || 'Garaj araci'}</div>
          </div>
          <button
            type="button"
            onClick={() => openCreateModal('listing')}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
          >
            Araci ilana cikar
          </button>
        </div>
      </section>

      {vehicle.media.length ? (
        <section className="glass-card p-5">
          <MediaCarousel media={vehicle.media.map((item) => ({ url: item.url, type: item.kind, label: item.fileName }))} />
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card p-5">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Arac bilgileri</h2>
          <div className="mt-4 grid gap-3">
            <InfoRow label="Marka / model" value={[vehicle.brand, vehicle.model].filter(Boolean).join(' ')} />
            <InfoRow label="Yil" value={vehicle.year ? String(vehicle.year) : 'Belirtilmedi'} />
            <InfoRow label="Paket" value={vehicle.trim || 'Belirtilmedi'} />
            <InfoRow label="Motor" value={vehicle.engine || 'Belirtilmedi'} />
            <InfoRow label="Yakit" value={vehicle.fuelType || 'Belirtilmedi'} />
            <InfoRow label="Vites" value={vehicle.transmission || 'Belirtilmedi'} />
            <InfoRow label="Renk" value={vehicle.color || 'Belirtilmedi'} />
            <InfoRow label="Plaka" value={vehicle.plateDisplay || 'Gizli'} />
            <InfoRow label="Km" value={vehicle.mileageKm ? `${vehicle.mileageKm} km` : 'Belirtilmedi'} />
          </div>
        </section>

        <section className="glass-card p-5">
          <h2 className="text-lg font-black tracking-tight text-slate-950">OBD ve expertiz</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="OBD durumu" value={vehicle.obdConnectionStatus || 'Hazir degil'} />
            <InfoRow label="Saglik puani" value={vehicle.healthScore ? `${vehicle.healthScore}/100` : 'Yok'} />
            <InfoRow label="Surus puani" value={vehicle.drivingScore ? `${vehicle.drivingScore}/100` : 'Yok'} />
            <InfoRow label="Rapor sayisi" value={String(reports.length || 0)} />
          </div>
          {vehicle.latestExpertiseReport ? (
            <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Son rapor: {JSON.stringify(vehicle.latestExpertiseReport.report || {}, null, 2)}
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Expertiz raporu henuz yok. Garage backend V3 endpointleri ile raporlar bu ekrana dusmeye hazir.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
