import React from 'react';
import { Camera, Video, Volume2, ShieldAlert, Zap, Server, Cable, Link2, Box } from 'lucide-react';

export const getMaterialIcon = (name) => {
  const n = name.toLowerCase();
  if (n.includes('cable') || n.includes('fibra') || n.includes('patch')) return <Cable size={20} />;
  if (n.includes('switch') || n.includes('media conver') || n.includes('poe') || n.includes('inyector')) return <Server size={20} />;
  if (n.includes('llave') || n.includes('transformador') || n.includes('supresor') || n.includes('ups') || n.includes('poder') || n.includes('pararrayo')) return <Zap size={20} />;
  if (n.includes('camara') || n.includes('ptz') || n.includes('multisensor')) return <Camera size={20} />;
  if (n.includes('altavoz') || n.includes('megafono')) return <Volume2 size={20} />;
  if (n.includes('boton')) return <ShieldAlert size={20} />;
  if (n.includes('abrazadera') || n.includes('anclaje') || n.includes('cinta') || n.includes('soporte') || n.includes('brazo')) return <Link2 size={20} />;
  return <Box size={20} />;
};

export const getPuntoName = (loc) => {
  let raw = '';
  if (loc.camara_ptz && loc.camara_ptz !== '0') raw = loc.camara_ptz;
  else if (loc.camara_multisensor && loc.camara_multisensor !== '0') raw = loc.camara_multisensor;
  else if (loc.altavoz_ip && loc.altavoz_ip !== '0') raw = loc.altavoz_ip;
  
  if (raw) {
    return raw.replace(/^(PTZ|MULTI|ALTAVOZ)-/i, '').trim();
  }
  
  return `${loc.destino_esp} - Frente ${loc.frente}`;
};

export const compressImageToWebp = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Fallo al comprimir la imagen'));
          }
        }, 'image/webp', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
