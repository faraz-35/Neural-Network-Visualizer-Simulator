// FIX: Import React to make the `React` namespace available for types like `React.RefObject`.
import React, { useState, useCallback, useRef } from 'react';

export const usePanAndZoom = (svgRef: React.RefObject<SVGSVGElement>) => {
    const [viewBox, setViewBox] = useState({ x: 0, y: 0, scale: 1 });
    const isPanning = useRef(false);
    const lastPoint = useRef({ x: 0, y: 0 });

    const pan = {
        start: (x: number, y: number) => {
            isPanning.current = true;
            lastPoint.current = { x, y };
        },
        move: (x: number, y: number) => {
            if (!isPanning.current) return;
            const dx = x - lastPoint.current.x;
            const dy = y - lastPoint.current.y;
            setViewBox(prev => ({
                ...prev,
                x: prev.x - dx / prev.scale,
                y: prev.y - dy / prev.scale,
            }));
            lastPoint.current = { x, y };
        },
        end: () => {
            isPanning.current = false;
        },
    };

    const zoom = useCallback((delta: number, clientX: number, clientY: number) => {
        if (!svgRef.current) return;
        const scaleFactor = 1.1;
        const newScale = delta < 0 ? viewBox.scale * scaleFactor : viewBox.scale / scaleFactor;
        const newLimitedScale = Math.min(Math.max(0.1, newScale), 5); // Clamp scale

        const rect = svgRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const newX = viewBox.x + (mouseX / viewBox.scale) - (mouseX / newLimitedScale);
        const newY = viewBox.y + (mouseY / viewBox.scale) - (mouseY / newLimitedScale);

        setViewBox({ x: newX, y: newY, scale: newLimitedScale });
    }, [viewBox.scale, svgRef]);

    const transform = `scale(${viewBox.scale}) translate(${-viewBox.x}, ${-viewBox.y})`;

    return { transform, pan, zoom };
};