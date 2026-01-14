/**
 * LineChart component using D3
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { TimeSeriesDataset, DataPoint } from '../../types/dataset';
import { Tooltip, TooltipData } from './Tooltip';
import { Legend } from './Legend';
import styles from './Chart.module.css';

interface LineChartProps {
  data: TimeSeriesDataset;
  showLegend?: boolean;
  showTooltip?: boolean;
}

const MARGIN = { top: 20, right: 30, bottom: 50, left: 70 };

export function LineChart({
  data,
  showLegend = true,
  showTooltip = true,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Color scale
  const colorScale = useMemo(() => {
    const entities = data.series.map((s) => s.entityId);
    return d3.scaleOrdinal(d3.schemeCategory10).domain(entities);
  }, [data.series]);

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const height = Math.max(width * 0.5, 300);
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || data.series.length === 0)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const innerHeight = dimensions.height - MARGIN.top - MARGIN.bottom;

    // Gather all points for scale computation
    const allPoints = data.series.flatMap((s) => s.points);
    const validPoints = allPoints.filter((p) => p.v !== null);

    if (validPoints.length === 0) return;

    // Time scale
    const timeExtent = d3.extent(validPoints, (d) => new Date(d.t)) as [Date, Date];
    const xScale = d3
      .scaleTime()
      .domain(timeExtent)
      .range([0, innerWidth]);

    // Value scale
    const valueExtent = d3.extent(validPoints, (d) => d.v as number) as [number, number];
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(0, valueExtent[0]), valueExtent[1] * 1.1])
      .range([innerHeight, 0])
      .nice();

    // Main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    g.append('g')
      .attr('class', styles.gridLines)
      .selectAll('line')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(6)
          .tickFormat((d) => d3.timeFormat('%Y')(d as Date))
      )
      .selectAll('text')
      .attr('font-size', '12px');

    // Y axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => d3.format('.2s')(d as number))
      )
      .selectAll('text')
      .attr('font-size', '12px');

    // Y axis label
    if (data.series[0]?.unit) {
      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -MARGIN.left + 15)
        .attr('x', -innerHeight / 2)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#666')
        .text(data.series[0].unit);
    }

    // Line generator
    const lineGenerator = d3
      .line<DataPoint>()
      .defined((d) => d.v !== null)
      .x((d) => xScale(new Date(d.t)))
      .y((d) => yScale(d.v as number));

    // Draw lines
    data.series.forEach((series) => {
      g.append('path')
        .datum(series.points)
        .attr('fill', 'none')
        .attr('stroke', colorScale(series.entityId))
        .attr('stroke-width', 2)
        .attr('d', lineGenerator);
    });

    // Data points for interaction
    if (showTooltip) {
      data.series.forEach((series) => {
        g.selectAll(`.point-${series.entityId}`)
          .data(series.points.filter((p) => p.v !== null))
          .join('circle')
          .attr('cx', (d) => xScale(new Date(d.t)))
          .attr('cy', (d) => yScale(d.v as number))
          .attr('r', 4)
          .attr('fill', colorScale(series.entityId))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .attr('cursor', 'pointer')
          .on('mouseenter', (event, d) => {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                entity: series.entityLabel,
                time: d.t,
                value: d.v,
                unit: series.unit,
              });
            }
          })
          .on('mouseleave', () => setTooltip(null));
      });
    }
  }, [data, dimensions, colorScale, showTooltip]);

  const legendItems = data.series.map((s) => ({
    id: s.entityId,
    label: s.entityLabel,
    color: colorScale(s.entityId),
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
