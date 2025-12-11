// src/components/LandingPage.jsx
import QuotesSection from './QuotesSection';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import Button from './ui/button';
import LanguageSelector from './LanguageSelector';
import HowItWorksSection from './HowItWorksSection';
import PurposeSection from './PurposeSection';
import FinalCTASection from './FinalCTASection';
// <-- LÍNEA DE IMPORTACIÓN CORRECTA Y ÚNICA
import mobileHeroImage from '../assets/images/hero-mobile.jpg';

const LandingPage = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  // <-- PASO 2: AÑADE UN EFECTO PARA ESTABLECER LA VARIABLE CSS
  useEffect(() => {
    // Creamos una variable CSS y le asignamos la URL de la imagen
    document.documentElement.style.setProperty('--mobile-hero-image', `url(${mobileHeroImage})`);
    
    // Función de limpieza para eliminar la variable cuando el componente se desmonta
    return () => {
      document.documentElement.style.removeProperty('--mobile-hero-image');
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <section
        className={`relative flex items-center justify-center min-h-screen text-white hero-background ${theme === 'dark' ? '' : ''}`}
      >
        {/* Contenedor superior de botones optimizado para tacto */}
        <div className="absolute top-4 right-4 z-50 flex items-center space-x-2 p-1">
          <LanguageSelector className="bg-white/20 hover:bg-white/30 border border-white/20" />
          
          {!user && (
            <Button
              onClick={() => navigate('/login')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20 min-h-[44px]"
            >
              {t('landing.hero.login', 'Iniciar Sesión')}
            </Button>
          )}

          {user && (
            <Button
              onClick={logout}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border border-white/20 min-h-[44px]"
            >
              {t('header.logout', 'Cerrar Sesión')}
            </Button>
          )}
        </div>

        {/* Contenedor principal del contenido */}
        <motion.div
          className="text-center max-w-4xl mx-auto px-6 z-10 py-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1
            className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-lg"
            variants={itemVariants}
          >
            {t('landing.hero.title', 'Fortalece tu Vínculo Familiar,')}
            <br />
            <span className="text-yellow-300">{t('landing.hero.titleHighlight', 'un Reto a la Vez.')}</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto drop-shadow-md"
            variants={itemVariants}
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.p
            className="text-base md:text-lg mb-8 opacity-80 max-w-2xl mx-auto drop-shadow-md"
            variants={itemVariants}
          >
            {t('landing.hero.inclusiveMessage', 'Aunque nos especializamos en familias reconstituidas, nuestras herramientas y retos están diseñados para cualquier padre o madre que busque fortalecer su vínculo con sus hijos.')}
          </motion.p>

          <motion.div variants={itemVariants}>
            <Button
              onClick={() => navigate('/register')}
              variant="secondary"
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 font-bold text-lg px-8 py-4 rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              {t('landing.hero.cta', 'Comienza tu Viaje')}
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* SECCIONES EXISTENTES Y NUEVAS */}
      <HowItWorksSection />
      <QuotesSection />
      <PurposeSection />
      <FinalCTASection />
    </>
  );
};

export default LandingPage;