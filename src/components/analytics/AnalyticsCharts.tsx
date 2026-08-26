import React from 'react';
import {Activity, TrendingUp} from 'lucide-react';
import type {AnalyticsTranslator} from './AnalyticsSummary';

/**
 * AnalyticsCharts — hand-rolled SVG charts for the Analytics page (no chart
 * library dependency):
 *
 *   1. BMI trend line — `weightKg / (heightCm / 100)²` per recorded weight,
 *      drawn over a subtle healthy-range band (18.5–25).
 *   2. Weekly volume bars — sets per Monday → Sunday week for the last 8
 *      weeks (fed by `WorkoutAnalytics.weeklyTrend`).
 *
 * Pure presentational server-renderable component: no state, no client
 * hooks — the parent owns data fetching and translations.
 */
export interface AnalyticsChartsProps {
  /** Last-8-weeks trend (oldest first), each with sets + sessions. */
  weeklyTrend?: Array<{weekStart: string; sessions: number; sets: number}>;
  /** User's height in cm — required (with ≥ 2 weights) for the BMI chart. */
  heightCm: number | null;
  /** Recorded weights, any order — sorted by date internally. */
  weightEntries?: Array<{weightKg: number; recordedAt: Date | string}>;
  locale: 'en' | 'fa';
  /** Localized messages under the `Analytics` namespace. */
  t: AnalyticsTranslator;
}

/** Number formatter for the active locale (Persian digits in fa). */
function numberFormat(locale: 'en' | 'fa', options: Intl.NumberFormatOptions = {}) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', options);
}

/** Compact date label, e.g. `Aug 3` / `۳ اوت`. */
function shortDate(date: Date, locale: 'en' | 'fa'): string {
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/** Raw BMI samples (date + value) from weights + height, or empty when unplottable. */
function bmiPoints(
  weightEntries: NonNullable<AnalyticsChartsProps['weightEntries']>,
  heightCm: number | null,
): Array<{date: Date; bmi: number}> {
  if (!heightCm || heightCm <= 0) return [];
  const heightM = heightCm / 100;
  const points = weightEntries
    .map((entry) => ({
      date: entry.recordedAt instanceof Date ? entry.recordedAt : new Date(entry.recordedAt),
      bmi: entry.weightKg / (heightM * heightM),
    }))
    .filter((point) => Number.isFinite(point.bmi) && point.bmi > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  return points;
}

export function AnalyticsCharts({weeklyTrend, heightCm, weightEntries = [], locale, t}: AnalyticsChartsProps) {
  const points = bmiPoints(weightEntries, heightCm);
  const bars = (weeklyTrend ?? []).slice(-8);

  return (
    <>
      <section
        aria-label={t('bmi.title')}
        className="mt-5 rounded-3xl border border-apex-border bg-apex-card p-4 shadow-sm sm:p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-semibold text-apex-text-primary">
          <Activity className="h-4 w-4 text-apex-primary" aria-hidden="true" />
          {t('bmi.title')}
        </h2>
        <p className="mt-0.5 text-xs text-apex-text-secondary">{t('bmi.subtitle')}</p>

        {points.length < 2 ? (
          <p className="mt-4 rounded-xl bg-apex-fill px-3 py-4 text-center text-sm text-apex-text-secondary">
            {t('bmi.noData')}
          </p>
        ) : (
          <BmiChart points={points} locale={locale} t={t} />
        )}
      </section>

      {bars.length > 0 ? (
        <section
          aria-label={t('trend.title')}
          className="mt-5 rounded-3xl border border-apex-border bg-apex-card p-4 shadow-sm sm:p-5"
        >
          <h2 className="flex items-center gap-2 text-sm font-semibold text-apex-text-primary">
            <TrendingUp className="h-4 w-4 text-apex-primary" aria-hidden="true" />
            {t('trend.title')}
          </h2>
          <p className="mt-0.5 text-xs text-apex-text-secondary">{t('trend.subtitle')}</p>

          <div className="mt-4">
            <WeeklyBars bars={bars} locale={locale} />
          </div>
        </section>
      ) : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// BMI line chart (SVG)
// ---------------------------------------------------------------------------

const CHART_W = 320;
const CHART_H = 150;
const PAD = {top: 16, right: 10, bottom: 26, left: 10};

interface BmiSample {
  date: Date;
  bmi: number;
}

interface PlottedBmiPoint extends BmiSample {
  x: number;
  y: number;
}

function BmiChart({points, locale, t}: {points: BmiSample[]; locale: 'en' | 'fa'; t: AnalyticsTranslator}) {
  const latest = points[points.length - 1];
  const healthyMin = 18.5;
  const healthyMax = 25;

  const values = points.map((point) => point.bmi);
  const domainMin = Math.max(0, Math.floor(Math.min(...values, healthyMin) - 1));
  const domainMax = Math.ceil(Math.max(...values, healthyMax) + 1);
  const span = Math.max(1, domainMax - domainMin);

  const innerW = CHART_W - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const yOf = (bmi: number) =>
    PAD.top + ((domainMax - bmi) / span) * innerH;

  const plotted: PlottedBmiPoint[] = points.map((point, index) => ({
    ...point,
    x: PAD.left + index * stepX,
    y: yOf(point.bmi),
  }));

  const linePoints = plotted.map((point) => `${point.x},${point.y}`).join(' ');
  const healthyTop = yOf(healthyMax);
  const healthyHeight = Math.max(0, yOf(healthyMin) - yOf(healthyMax));

  const fmt = numberFormat(locale, {minimumFractionDigits: 1, maximumFractionDigits: 1});

  return (
    <div className="mt-3">
      <p className="text-center text-xs text-apex-text-secondary">
        {t('bmi.current')}:{' '}
        <strong className="text-base font-bold tabular-nums text-apex-text-primary" dir="ltr">
          {fmt.format(latest.bmi)}
        </strong>
      </p>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label={t('bmi.title')}
        className="mx-auto mt-2 w-full max-w-sm"
        style={{direction: 'ltr'}}
      >
        {/* Healthy-range band (18.5–25). */}
        <rect
          x={PAD.left}
          y={healthyTop}
          width={innerW}
          height={healthyHeight}
          fill="var(--apex-primary-soft)"
          opacity={0.55}
        />
        {/* Y domain labels (min / max) and the healthy band bounds. */}
        <text x={CHART_W - PAD.right} y={PAD.top - 2} textAnchor="end" className="fill-apex-text-tertiary text-[9px]">
          {fmt.format(domainMax)}
        </text>
        <text x={CHART_W - PAD.right} y={CHART_H - PAD.bottom + 12} textAnchor="end" className="fill-apex-text-tertiary text-[9px]">
          {fmt.format(domainMin)}
        </text>
        <text x={PAD.left} y={healthyTop - 3} className="fill-apex-text-tertiary text-[9px]">
          {t('bmi.healthyBand')}
        </text>
        {/* Baseline + trend line + dots. */}
        <line
          x1={PAD.left}
          y1={CHART_H - PAD.bottom}
          x2={CHART_W - PAD.right}
          y2={CHART_H - PAD.bottom}
          className="stroke-apex-border"
          strokeWidth={1}
        />
        <polyline points={linePoints} fill="none" className="stroke-apex-primary" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {plotted.map((point) => (
          <circle
            key={point.date.toISOString()}
            cx={point.x}
            cy={point.y}
            r={3}
            className="fill-apex-card stroke-apex-primary"
            strokeWidth={2}
          />
        ))}
        {/* First / last date labels. */}
        <text x={plotted[0].x} y={CHART_H - 8} textAnchor="start" className="fill-apex-text-tertiary text-[9px]">
          {shortDate(plotted[0].date, locale)}
        </text>
        <text x={plotted[plotted.length - 1].x} y={CHART_H - 8} textAnchor="end" className="fill-apex-text-tertiary text-[9px]">
          {shortDate(plotted[plotted.length - 1].date, locale)}
        </text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly volume bars (SVG)
// ---------------------------------------------------------------------------

const BAR_W = 320;
const BAR_H = 120;
const BAR_PAD = {top: 18, right: 8, bottom: 22, left: 8};

function WeeklyBars({bars, locale}: {bars: Array<{weekStart: string; sets: number}>; locale: 'en' | 'fa'}) {
  const innerW = BAR_W - BAR_PAD.left - BAR_PAD.right;
  const innerH = BAR_H - BAR_PAD.top - BAR_PAD.bottom;
  const step = innerW / bars.length;
  const barWidth = Math.max(8, step * 0.55);
  const maxSets = Math.max(1, ...bars.map((bar) => bar.sets));
  const fmt = numberFormat(locale);

  return (
    <svg
      viewBox={`0 0 ${BAR_W} ${BAR_H}`}
      role="img"
      aria-label="Weekly volume"
      className="mx-auto w-full max-w-sm"
      style={{direction: 'ltr'}}
    >
      {/* Baseline. */}
      <line
        x1={BAR_PAD.left}
        y1={BAR_H - BAR_PAD.bottom}
        x2={BAR_W - BAR_PAD.right}
        y2={BAR_H - BAR_PAD.bottom}
        className="stroke-apex-border"
        strokeWidth={1}
      />
      {bars.map((bar, index) => {
        const height = (bar.sets / maxSets) * innerH;
        const x = BAR_PAD.left + index * step + (step - barWidth) / 2;
        const y = BAR_H - BAR_PAD.bottom - height;
        return (
          <g key={bar.weekStart}>
            <rect x={x} y={y} width={barWidth} height={Math.max(2, height)} rx={4} className="fill-apex-primary" opacity={bar.sets > 0 ? 1 : 0.25} />
            {bar.sets > 0 ? (
              <text x={x + barWidth / 2} y={y - 3} textAnchor="middle" className="fill-apex-text-secondary text-[9px] font-semibold">
                {fmt.format(bar.sets)}
              </text>
            ) : null}
            <text
              x={x + barWidth / 2}
              y={BAR_H - 8}
              textAnchor="middle"
              className="fill-apex-text-tertiary text-[8px]"
            >
              {shortDate(new Date(bar.weekStart), locale)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default AnalyticsCharts;
