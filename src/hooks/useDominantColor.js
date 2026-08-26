import { useState, useEffect } from 'react';

export function useDominantColor(imageUrl) {
  const [color, setColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        // Downscale to 1x1 for extremely fast average color
        canvas.width = 1;
        canvas.height = 1;
        
        ctx.drawImage(img, 0, 0, 1, 1);
        
        const data = ctx.getImageData(0, 0, 1, 1).data;
        const r = data[0];
        const g = data[1];
        const b = data[2];
        
        // Simple saturation boost to avoid dull colors
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let satR = r, satG = g, satB = b;
        
        if (max !== min && max > 0) {
           const factor = 1.3; // Boost saturation
           const avg = (r + g + b) / 3;
           satR = Math.min(255, Math.max(0, Math.round(avg + (r - avg) * factor)));
           satG = Math.min(255, Math.max(0, Math.round(avg + (g - avg) * factor)));
           satB = Math.min(255, Math.max(0, Math.round(avg + (b - avg) * factor)));
        }

        setColor(`rgb(${satR}, ${satG}, ${satB})`);
      } catch (err) {
        console.warn('Erreur extraction couleur:', err);
        setColor(null);
      }
    };
    
    img.src = imageUrl;

    return () => {
      isMounted = false;
    };
  }, [imageUrl]);

  return color;
}
