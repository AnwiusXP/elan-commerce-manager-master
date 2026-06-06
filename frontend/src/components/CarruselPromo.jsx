import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function CarruselPromo() {
  const banners = [
    { id: 1, src: '/images/banners/banner1.jpg', alt: 'Promoción 1' },
    { id: 2, src: '/images/banners/banner2.jpg', alt: 'Promoción 2' },
    { id: 3, src: '/images/banners/banner3.jpg', alt: 'Promoción 3' },
  ];

  return (
    <div className="carrusel-container" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px 32px 0' }}>
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        autoplay={{
          delay: 4000,
          disableOnInteraction: false,
        }}
        pagination={{
          clickable: true,
        }}
        navigation={true}
        modules={[Autoplay, Pagination, Navigation]}
        loop={true}
        style={{
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
          '--swiper-theme-color': 'var(--color-brand-primary)',
          '--swiper-pagination-color': 'var(--color-brand-primary)',
          '--swiper-navigation-color': 'var(--color-brand-primary)',
          height: '100%',
        }}
      >
        {banners.map((b) => (
          <SwiperSlide key={b.id} style={{ height: '350px', background: '#f8f9fa' }} className="swiper-slide-custom">
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `url(${b.src}) center/cover no-repeat`,
              backgroundColor: 'var(--color-primary-soft)'
            }}>
              {/* Fallback visual if image not found */}
              <div className="banner-fallback" style={{ textAlign: 'center', color: 'var(--color-brand-primary)' }}>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
