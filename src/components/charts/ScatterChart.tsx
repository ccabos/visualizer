/**
 * ScatterChart component using D3
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { ScatterDataset } from '../../types/dataset';
import { Tooltip, TooltipData } from './Tooltip';
import styles from './Chart.module.css';

interface ScatterChartProps {
  data: ScatterDataset;
  showTooltip?: boolean;
  showLabels?: boolean;
}

const MARGIN = { top: 20, right: 30, bottom: 60, left: 70 };

export function ScatterChart({
  data,
  showLabels = false,
}: ScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Filter valid points
  const validPoints = useMemo(() => {
    return data.points.filter((p) => p.x !== null && p.y !== null);
  }, [data.points]);

  // Color scale
  const colorScale = useMemo(() => {
    const entities = validPoints.map((p) => p.entityId);
    return d3.scaleOrdinal(d3.schemeCategory10).domain(entities);
  }, [validPoints]);

  // Responsive resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const height = Math.max(width * 0.7, 350);
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || validPoints.length === 0)
      return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const innerWidth = dimensions.width - MARGIN.left - MARGIN.right;
    const innerHeight = dimensions.height - MARGIN.top - MARGIN.bottom;

    // Scales
    const xExtent = d3.extent(validPoints, (d) => d.x as number) as [number, number];
    const yExtent = d3.extent(validPoints, (d) => d.y as number) as [number, number];

    const xScale = d3
      .scaleLinear()
      .domain([xExtent[0] * 0.9, xExtent[1] * 1.1])
      .range([0, innerWidth])
      .nice();

    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] * 0.9, yExtent[1] * 1.1])
      .range([innerHeight, 0])
      .nice();

    const g = svg
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Grid lines
    g.append('g')
      .attr('class', styles.gridLines)
      .selectAll('line.horizontal')
      .data(yScale.ticks(5))
      .join('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', styles.gridLines)
      .selectAll('line.vertical')
      .data(xScale.ticks(5))
      .join('line')
      .attr('x1', (d) => xScale(d))
      .attr('x2', (d) => xScale(d))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', '#e0e0e0')
      .attr('stroke-dasharray', '2,2');

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.format('.2s')))
      .selectAll('text')
      .attr('font-size', '12px');

    // X axis label
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text(`${data.x.label} (${data.x.unit})`);

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format('.2s')))
      .selectAll('text')
      .attr('font-size', '12px');

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -MARGIN.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text(`${data.y.label} (${data.y.unit})`);

    // Points
    g.selectAll('circle')
      .data(validPoints)
      .join('circle')
      .attr('cx', (d) => xScale(d.x as number))
      .attr('cy', (d) => yScale(d.y as number))
      .attr('r', 6)
      .attr('fill', (d) => colorScale(d.entityId))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.8)
      .on('mouseenter', (event, d) => {
        d3.select(event.target).attr('r', 8).attr('opacity', 1);
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
          setTooltip({
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            entity: d.entityLabel,
            xValue: d.x,
            yValue: d.y,
            xLabel: data.x.label,
            yLabel: data.y.label,
            xUnit: data.x.unit,
            yUnit: data.y.unit,
          });
        }
      })
      .on('mouseleave', (event) => {
        d3.select(event.target).attr('r', 6).attr('opacity', 0.8);
        setTooltip(null);
      });

    // Labels
    if (showLabels) {
      g.selectAll('text.label')
        .data(validPoints)
        .join('text')
        .attr('class', 'label')
        .attr('x', (d) => xScale(d.x as number) + 8)
        .attr('y', (d) => yScale(d.y as number) + 4)
        .attr('font-size', '10px')
        .attr('fill', '#333')
        .text((d) => d.entityId);
    }
  }, [data, validPoints, dimensions, colorScale, showLabels]);

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
    </div>
  );
}
