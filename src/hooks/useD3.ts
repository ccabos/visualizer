/**
 * useD3 hook - Bridge between React and D3
 */

import React, { useRef, useEffect, useLayoutEffect, useState, DependencyList } from 'react';
import * as d3 from 'd3';

export type D3Selection = d3.Selection<SVGSVGElement, unknown, null, undefined>;
export type D3GSelection = d3.Selection<SVGGElement, unknown, null, undefined>;

export interface ChartDimensions {
  width: number;
  height: number;
  innerWidth: number;
  innerHeight: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export type RenderFunction = (
  svg: D3Selection,
  dimensions: ChartDimensions
) => void;

const DEFAULT_MARGIN = {
  top: 20,
  right: 30,
  bottom: 50,
  left: 60,
};

/**
 * Hook for integrating D3 with React
 * Provides a ref to attach to an SVG element and calls renderFn when dependencies change
 */
export function useD3(
  renderFn: RenderFunction,
  deps: DependencyList = [],
  options?: {
    margin?: Partial<typeof DEFAULT_MARGIN>;
  }
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const margin = { ...DEFAULT_MARGIN, ...options?.margin };

  useLayoutEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const rect = svgRef.current.getBoundingClientRect();

    const dimensions: ChartDimensions = {
      width: rect.width,
      height: rect.height,
      innerWidth: rect.width - margin.left - margin.right,
      innerHeight: rect.height - margin.top - margin.bottom,
      margin,
    };

    // Only render if we have valid dimensions
    if (dimensions.width > 0 && dimensions.height > 0) {
      // Clear previous render
      svg.selectAll('*').remove();

      // Execute render function
      renderFn(svg, dimensions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return svgRef;
}

/**
 * Hook for responsive dimensions
 */
export function useResponsiveDimensions(
  containerRef: React.RefObject<HTMLDivElement>,
  aspectRatio: number = 0.6,
  minHeight: number = 300
) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const height = Math.max(width * aspectRatio, minHeight);
      setDimensions({ width, height });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [aspectRatio, minHeight, containerRef]);

  return dimensions;
}
