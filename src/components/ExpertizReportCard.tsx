import { StyleSheet, Text, View } from 'react-native';

import { theme } from '../theme';
import { ListingDetails, ListingFact, VehicleProfile } from '../types';

interface ExpertizReportCardProps {
  listing?: ListingDetails;
  vehicle?: VehicleProfile;
  compact?: boolean;
}

interface ReportSection {
  title: string;
  rows: ListingFact[];
}

function buildListingSections(listing: ListingDetails, compact: boolean): ReportSection[] {
  const infoLimit = compact ? 4 : 8;
  const conditionLimit = compact ? 4 : 6;
  const compareLimit = compact ? 2 : 3;

  return [
    {
      title: 'Araç bilgileri',
      rows: listing.specTable.slice(0, infoLimit),
    },
    {
      title: 'Durum özeti',
      rows: listing.conditionTable.slice(0, conditionLimit),
    },
    {
      title: 'Fabrika ve OBD',
      rows: [
        ...listing.factorySpecs.slice(0, compareLimit).map((value, index) => ({
          label: `Fabrika ${index + 1}`,
          value,
        })),
        ...listing.reportHighlights.slice(0, compareLimit).map((value, index) => ({
          label: `OBD ${index + 1}`,
          value,
        })),
      ],
    },
  ].filter((section) => section.rows.length > 0);
}

function buildVehicleSections(vehicle: VehicleProfile, compact: boolean): ReportSection[] {
  const faultLimit = compact ? 2 : 4;
  const metricLimit = compact ? 3 : 6;
  const partLimit = compact ? 2 : 4;

  const obdRows: ListingFact[] = [
    { label: 'OBD', value: vehicle.obdConnected ? 'Bağlı' : 'Bağlı değil' },
  ];

  if (typeof vehicle.healthScore === 'number') {
    obdRows.push({ label: 'Sağlık', value: `%${vehicle.healthScore}` });
  }

  if (typeof vehicle.driveScore === 'number') {
    obdRows.push({ label: 'Sürüş puanı', value: `${vehicle.driveScore}/100` });
  }

  obdRows.push(
    ...(vehicle.liveMetrics ?? []).slice(0, metricLimit).map((metric) => ({
      label: metric.label,
      value: metric.value,
    })),
  );

  const riskRows: ListingFact[] = [
    ...(vehicle.faultCodes ?? []).slice(0, faultLimit).map((fault) => ({
      label: fault.code,
      value: fault.title,
    })),
    ...(vehicle.probableFaultyParts ?? []).slice(0, partLimit).map((part) => ({
      label: `${part.name} %${part.probability}`,
      value: part.marketPrice,
    })),
  ];

  if (!riskRows.length) {
    riskRows.push(
      ...vehicle.upcomingRisks.slice(0, compact ? 2 : 4).map((risk) => ({
        label: `${risk.name} %${risk.probability}`,
        value: risk.explanation || risk.marketPrice,
      })),
    );
  }

  return [
    {
      title: 'Araç bilgileri',
      rows: [
        { label: 'Marka', value: vehicle.brand },
        { label: 'Model', value: vehicle.model },
        { label: 'Yıl', value: vehicle.year },
        { label: 'Paket', value: vehicle.packageName },
        { label: 'Motor', value: vehicle.engineVolume },
        { label: 'Kilometre', value: vehicle.mileage },
      ],
    },
    {
      title: 'Sağlık ve OBD',
      rows: obdRows,
    },
    {
      title: 'Arıza ve riskler',
      rows: riskRows,
    },
  ].filter((section) => section.rows.length > 0);
}

export function ExpertizReportCard({
  listing,
  vehicle,
  compact = false,
}: ExpertizReportCardProps) {
  if (!listing && !vehicle) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Text style={styles.eyebrow}>CARLOI EKSPERTİZ</Text>
        <Text style={styles.title}>Rapor verisi hazır değil</Text>
        <Text style={styles.subtitle}>
          Ekspertiz raporu için ilan ya da araç verisi bulunamadı.
        </Text>
      </View>
    );
  }

  const title = listing ? listing.title : `${vehicle?.year} ${vehicle?.brand} ${vehicle?.model}`;
  const subtitle = listing
    ? `${listing.price} • ${listing.location}`
    : `${vehicle?.packageName} • ${vehicle?.engineVolume}`;
  const summary = listing
    ? listing.summaryLine
    : vehicle?.summary ?? 'Araç özet verisi bulunamadı.';

  const highlightChips = listing
    ? listing.badges.slice(0, compact ? 2 : 4)
    : [
        vehicle?.obdConnected ? 'OBD bağlı' : 'OBD bağlı değil',
        typeof vehicle?.healthScore === 'number'
          ? `%${vehicle.healthScore} sağlık`
          : 'Sağlık verisi yok',
        typeof vehicle?.driveScore === 'number'
          ? `${vehicle.driveScore}/100 sürüş`
          : 'Sürüş verisi yok',
      ];

  const sections = listing
    ? buildListingSections(listing, compact)
    : buildVehicleSections(vehicle!, compact);

  const footer = listing
    ? listing.showExpertiz
      ? 'Carloi raporu ilan verisi ve kullanıcı izinli araç verileriyle oluşturuldu.'
      : 'Satıcı özet ekspertiz paylaştı, tam OBD raporu eklenmedi.'
    : vehicle?.actions?.[0] ??
      'Bu özet yalnızca mevcut araç bilgileriyle oluşturuldu. Canlı ölçüm için OBD bağlantısı gerekiyor.';

  const scoreValue = listing
    ? listing.showExpertiz
      ? 'AÇIK'
      : 'KAPALI'
    : typeof vehicle?.healthScore === 'number'
      ? `%${vehicle.healthScore}`
      : 'VERİ';

  const scoreLabel = listing
    ? 'Rapor'
    : typeof vehicle?.healthScore === 'number'
      ? 'Sağlık'
      : 'Yok';

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CARLOI EKSPERTİZ</Text>
          <Text numberOfLines={compact ? 2 : 3} style={styles.title}>
            {title}
          </Text>
          <Text numberOfLines={compact ? 2 : 3} style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreBadgeValue}>{scoreValue}</Text>
          <Text style={styles.scoreBadgeLabel}>{scoreLabel}</Text>
        </View>
      </View>

      <Text numberOfLines={compact ? 2 : 3} style={styles.summary}>
        {summary}
      </Text>

      <View style={styles.chipRow}>
        {highlightChips.map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionStack}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.table}>
              {section.rows.map((row) => (
                <View key={`${section.title}-${row.label}-${row.value}`} style={styles.row}>
                  <Text numberOfLines={1} style={styles.rowLabel}>
                    {row.label}
                  </Text>
                  <Text numberOfLines={compact ? 1 : 2} style={styles.rowValue}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text numberOfLines={compact ? 2 : 3} style={styles.footerText}>
          {footer}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#0F2A36',
    backgroundColor: '#F8FCFF',
    overflow: 'hidden',
  },
  cardCompact: {
    borderRadius: 20,
  },
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: '#0F2A36',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: '#90E1D4',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  subtitle: {
    color: '#B7CBD3',
    fontSize: 12,
    lineHeight: 17,
  },
  scoreBadge: {
    minWidth: 72,
    borderRadius: 18,
    backgroundColor: '#123A49',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  scoreBadgeLabel: {
    color: '#9EC0CA',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  summary: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  chip: {
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primarySoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 7,
  },
  chipText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionStack: {
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  section: {
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E3E9',
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  table: {
    gap: theme.spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    borderRadius: 14,
    backgroundColor: '#F3F7F9',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 9,
  },
  rowLabel: {
    flex: 1,
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
  },
  rowValue: {
    flex: 1,
    color: theme.colors.text,
    textAlign: 'right',
    fontWeight: '700',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#D7E3E9',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: '#F1F7FA',
  },
  footerText: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
});
