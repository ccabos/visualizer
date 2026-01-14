/**
 * BarChart component using D3
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { CrossSectionDataset, TimeSeriesDataset } from '../../types/dataset';
import { Tooltip, TooltipData } from './Tooltip';
import { Legend } from './Legend';
import styles from './Chart.module.css';

interface BarChartProps {
  data: CrossSectionDataset | TimeSeriesDataset;
  showLegend?: boolean;
  showTooltip?: boolean;
  horizontal?: boolean;
}

const MARGIN = { top: 20, right: 30, bottom: 60, left: 100 };

export function BarChart({
  data,
  showLegend = false,
  horizontal = false,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Transform data to bar format
  const barData = useMemo(() => {
    if (data.kind === 'CrossSectionDataset') {
      return data.rows
        .filter((r) => r.value !== null)
        .map((r) => ({
          entityId: r.entityId,
          entityLabel: r.entityLabel,
          value: r.value as number,
          unit: data.unit,
        }))
        .sort((a, b) => b.value - a.value);
    } else {
      // For time series, use the latest value for each entity
      return data.series
        .map((s) => {
          const lastValidPoint = [...s.points]
            .reverse()
            .find((p) => p.v !== null);
          return {
            entityId: s.entityId,
            entityLabel: s.entityLabel,
            value: lastValidPoint?.v ?? 0,
            unit: s.unit,
          };
        })
        .filter((d) => d.value !== null)
        .sort((a, b) => b.value - a.value);
    }
  }, [data]);

  // Color scale
  const colorScale = useMemo(() => {
    const entities = barData.map((d) => d.entityId);
    return d3.scaleOrdinal(d3.schemeCategory10).domain(entities);
  }, [barData]);

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const baseHeight = Math.max(barData.length * 35, 200);
      const height = horizontal
        ? Math.max(baseHeight, 300)
        : Math.max(width * 0.5, 300);
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [horizontal, barData.length]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || barData.length === 0)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const innerHeight = dimensions.height - MARGIN.top - MARGIN.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    if (horizontal) {
      renderHorizontalBars(g, innerWidth, innerHeight);
    } else {
      renderVerticalBars(g, innerWidth, innerHeight);
    }

    function renderHorizontalBars(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      width: number,
      height: number
    ) {
      const yScale = d3
        .scaleBand()
        .domain(barData.map((d) => d.entityLabel))
        .range([0, height])
        .padding(0.2);

      const xScale = d3
        .scaleLinear()
        .domain([0, d3.max(barData, (d) => d.value) as number])
        .range([0, width])
        .nice();

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2s')))
        .selectAll('text')
        .attr('font-size', '12px');

      // Y axis
      g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('font-size', '12px');

      // Bars
      g.selectAll('rect')
        .data(barData)
        .join('rect')
        .attr('y', (d) => yScale(d.entityLabel) as number)
        .attr('x', 0)
        .attr('height', yScale.bandwidth())
        .attr('width', (d) => xScale(d.value))
        .attr('fill', (d) => colorScale(d.entityId))
        .attr('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltip({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              entity: d.entityLabel,
              value: d.value,
              unit: d.unit,
            });
          }
        })
        .on('mouseleave', () => setTooltip(null));
    }

    function renderVerticalBars(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      width: number,
      height: number
    ) {
      const xScale = d3
        .scaleBand()
        .domain(barData.map((d) => d.entityLabel))
        .range([0, width])
        .padding(0.2);

      const yScale = d3
        .scaleLinear()
        .domain([0, d3.max(barData, (d) => d.value) as number])
        .range([height, 0])
        .nice();

      // X axis
      g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .attr('text-anchor', 'end')
        .attr('font-size', '11px');

      // Y axis
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.2s')))
        .selectAll('text')
        .attr('font-size', '12px');

      // Bars
      g.selectAll('rect')
        .data(barData)
        .join('rect')
        .attr('x', (d) => xScale(d.entityLabel) as number)
        .attr('y', (d) => yScale(d.value))
        .attr('width', xScale.bandwidth())
        .attr('height', (d) => height - yScale(d.value))
        .attr('fill', (d) => colorScale(d.entityId))
        .attr('cursor', 'pointer')
        .on('mouseenter', (event, d) => {
          const rect = svgRef.current?.getBoundingClientRect();
          if (rect) {
            setTooltip({
              x: event.clientX - rect.left,
              y: event.clientY - rect.top,
              entity: d.entityLabel,
              value: d.value,
              unit: d.unit,
            });
          }
        })
        .on('mouseleave', () => setTooltip(null));
    }
  }, [barData, dimensions, colorScale, horizontal]);

  const legendItems = barData.slice(0, 10).map((d) => ({
    id: d.entityId,
    label: d.entityLabel,
    color: colorScale(d.entityId),
  }));

  return (
    <div className={styles.chartWrapper}>
      <div ref={containerRef} className={styles.chartContainer}>
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className={styles.svg}
        />
        {tooltip && <Tooltip data={tooltip} />}
      </div>
      {showLegend && legendItems.length > 0 && <Legend items={legendItems} />}
    </div>
  );
}
