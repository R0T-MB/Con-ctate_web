import { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';

// Hook personalizado para reproducir sonidos fácilmente
export const useSound = (soundSrc, { volume = 1, loop = false, autoplay = false } = {}) => {
  const soundRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Cargamos el sonido cuando el componente se monta
    soundRef.current = new Howl({
      src: [soundSrc],
      volume: volume,
      loop: loop,
      preload: true,
      autoplay: false, // Nunca autoplay
    });

    // Cuando el sonido esté cargado
    soundRef.current.on('load', () => {
      setIsLoaded(true);
    });

    // Limpiamos el sonido cuando el componente se desmonta
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
    };
  }, [soundSrc, volume, loop]);

  // Función para reproducir el sonido
  const play = () => {
    if (soundRef.current && isLoaded) {
      // Reanudamos el AudioContext si está pausado
      if (soundRef.current._sounds.length > 0 && soundRef.current._sounds[0]._node && soundRef.current._sounds[0]._node.context && soundRef.current._sounds[0]._node.context.state === 'suspended') {
        soundRef.current._sounds[0]._node.context.resume();
      }
      soundRef.current.play();
    }
  };

  return { play, isLoaded };
};